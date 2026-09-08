const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const yaml=require('js-yaml');
const {sourceFile,assetNames,gitBlobHash,verifyUpdateFiles,verifySourceArchive,createSourceArchive,verifyPackedApp,createManifest,verifyDownloaded}=require('../scripts/verify-release.cjs');

function temporary(t){
  const parent=fs.realpathSync(os.tmpdir()),directory=fs.mkdtempSync(path.join(parent,'dropzone-release-test-'));
  t.after(()=>{assert.equal(path.dirname(directory),parent);fs.rmSync(directory,{recursive:true,force:true});});
  return directory;
}
function fixture(directory){
  const version='2.0.0',names=assetNames(version),binary=Buffer.alloc(128,7);binary.write('MZ');
  fs.writeFileSync(path.join(directory,names[0]),binary);
  fs.writeFileSync(path.join(directory,names[1]),'blockmap fixture');
  fs.writeFileSync(path.join(directory,names[3]),'source ZIP fixture');
  const sha512=crypto.createHash('sha512').update(binary).digest('base64');
  const info={version,files:[{url:names[0],sha512,size:binary.length}],path:names[0],sha512,releaseDate:'2026-09-08T12:00:00.000Z'};
  const write=()=>fs.writeFileSync(path.join(directory,'latest.yml'),yaml.dump(info));
  write();return {version,names,info,write};
}

test('release source includes tests, scripts and assets while excluding dependencies and generated output',()=>{
  for(const name of ['test/core.test.cjs','test/fixtures/ahri-qwik.json','scripts/verify-release.cjs','docs/PUBLISH-RELEASE.md','build/installer.nsh','app/assets/maps/map.webp','.github/workflows/release.yml'])assert.equal(sourceFile(name),true,name);
  for(const name of ['.git/config','node_modules/package/index.js','nested/node_modules/pkg.js','.preview-cache/catalog.json','.validation-cache/data.json','release/installer/app.exe','screenshots/app.png','test-results/report.xml','playwright-report/index.html','coverage/coverage.json','.openai/hosting.json','app/.DS_Store'])assert.equal(sourceFile(name),false,name);
  for(const version of ['2.0.0-beta.1','../2.0.0','2.0'])assert.throws(()=>assetNames(version));
});

test('updater metadata must match the real installer name, version, size and both SHA512 fields',t=>{
  const dir=temporary(t),{version,info,write}=fixture(dir);
  assert.equal(verifyUpdateFiles(dir,version).length,4);
  const changes=[
    ()=>info.version='1.2.2',
    ()=>info.files[0].size++,
    ()=>info.files[0].sha512='wrong',
    ()=>info.sha512='wrong',
    ()=>info.files[0].url='../other.exe',
    ()=>info.path='Dropzone-Setup-2.0.0-arm64.exe',
    ()=>info.files.push({...info.files[0]}),
    ()=>info.releaseDate='unknown'
  ];
  for(const change of changes){
    const before=structuredClone(info);change();write();assert.throws(()=>verifyUpdateFiles(dir,version));
    for(const key of Object.keys(info))delete info[key];Object.assign(info,before);write();
  }
  fs.writeFileSync(path.join(dir,assetNames(version)[1]),'');
  assert.throws(()=>verifyUpdateFiles(dir,version),/blockmap is empty/);
});

test('download verification rejects a missing, extra, or altered release asset',t=>{
  const dir=temporary(t),{version,names}=fixture(dir),manifest=createManifest(dir,version,'a'.repeat(40));
  verifyDownloaded(dir,manifest);
  const zip=path.join(dir,names[3]),original=fs.readFileSync(zip);
  fs.writeFileSync(zip,'changed bytes');assert.throws(()=>verifyDownloaded(dir,manifest),/differs from the verified build/);
  fs.writeFileSync(zip,original);
  fs.writeFileSync(path.join(dir,'unintended.txt'),'extra');assert.throws(()=>verifyDownloaded(dir,manifest),/exactly the four/);
  fs.unlinkSync(path.join(dir,'unintended.txt'));fs.unlinkSync(zip);assert.throws(()=>verifyDownloaded(dir,manifest),/exactly the four/);
});

test('full source verification rejects missing or altered committed files',async t=>{
  const dir=temporary(t),repo=path.join(dir,'repository');fs.mkdirSync(repo);
  const git=(...args)=>execFileSync('git',['-C',repo,'-c','core.autocrlf=false',...args],{stdio:'pipe'});
  git('init');
  const files=new Map([['package.json',Buffer.from('{"version":"2.0.0"}\n')],['app.txt',Buffer.from('complete source\n')]]);
  for(const [name,bytes]of files)fs.writeFileSync(path.join(repo,name),bytes);
  git('add','.');git('-c','user.name=Dropzone release test','-c','user.email=release-test@example.invalid','-c','core.autocrlf=false','commit','--no-gpg-sign','-m','fixture');
  const zip=path.join(dir,'source.zip');git('archive','--format=zip','--prefix=Dropzone-Source-2.0.0/',`--output=${zip}`,'HEAD');
  const expected=new Map([...files].map(([name,bytes])=>[name,gitBlobHash(bytes)]));
  await verifySourceArchive(zip,'2.0.0',expected);
  await assert.rejects(verifySourceArchive(zip,'2.0.0',new Map([...expected,['missing.js','0'.repeat(40)]])),/expected 3/);
  await assert.rejects(verifySourceArchive(zip,'2.0.0',new Map([...expected,['app.txt',gitBlobHash(Buffer.from('edited'))]])),/differs from the release commit/);
});

test('Windows source packaging removes even tracked build artifacts and refuses to overwrite an archive',{skip:process.platform!=='win32'},async t=>{
  const dir=temporary(t),repo=path.join(dir,'repository'),output=path.join(dir,'output');fs.mkdirSync(repo);
  const git=(...args)=>execFileSync('git',['-C',repo,'-c','core.autocrlf=false',...args],{stdio:'pipe'});
  git('init');
  const files=new Map([['package.json',Buffer.from('{"version":"2.0.0"}\n')],['app.txt',Buffer.from('complete source\n')],['release/generated.txt',Buffer.from('generated artifact')],['node_modules/cache.txt',Buffer.from('dependency cache')]]);
  for(const [name,bytes]of files){fs.mkdirSync(path.dirname(path.join(repo,name)),{recursive:true});fs.writeFileSync(path.join(repo,name),bytes);}
  git('add','.');git('-c','user.name=Dropzone release test','-c','user.email=release-test@example.invalid','commit','--no-gpg-sign','-m','fixture');
  const expected=new Map([...files].filter(([name])=>sourceFile(name)).map(([name,bytes])=>[name,gitBlobHash(bytes)]));
  const sha=git('rev-parse','HEAD').toString().trim();
  await createSourceArchive(repo,output,'2.0.0',sha,expected);
  await verifySourceArchive(path.join(output,assetNames('2.0.0')[3]),'2.0.0',expected);
  await assert.rejects(createSourceArchive(repo,output,'2.0.0',sha,expected),/refusing to overwrite/);
});

test('packaged-source verification resolves nested paths and still rejects changed bytes',async t=>{
  const dir=temporary(t),input=path.join(dir,'input'),output=path.join(dir,'output');
  fs.mkdirSync(path.join(input,'app','assets'),{recursive:true});
  fs.mkdirSync(path.join(output,'win-unpacked','resources'),{recursive:true});
  const bytes=Buffer.from('<svg>exact committed bytes</svg>\n');
  fs.writeFileSync(path.join(input,'package.json'),'{"version":"2.0.0"}');
  fs.writeFileSync(path.join(input,'app','assets','brand.svg'),bytes);
  const asar=await import('@electron/asar');
  await asar.createPackage(input,path.join(output,'win-unpacked','resources','app.asar'));
  const executable=Buffer.alloc(128);executable.write('MZ');executable.writeUInt32LE(64,0x3c);executable.writeUInt32LE(0x4550,64);executable.writeUInt16LE(0x8664,68);
  fs.writeFileSync(path.join(output,'win-unpacked','Dropzone.exe'),executable);
  await verifyPackedApp(dir,output,'2.0.0',new Map([['app/assets/brand.svg',gitBlobHash(bytes)]]));
  await assert.rejects(verifyPackedApp(dir,output,'2.0.0',new Map([['app/assets/brand.svg',gitBlobHash(Buffer.from('different bytes'))]])),/differs from the release commit/);
});
