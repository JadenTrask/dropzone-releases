'use strict';
// Release gates shared by the Windows workflow and local release checks.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const yaml=require('js-yaml');
const yauzl=require('yauzl');

function invariant(value,message){if(!value)throw new Error(message);}
function sourceFile(name){
  return !/(^|\/)(?:\.git|node_modules|\.preview-cache|\.validation-cache|\.cache|__pycache__)(?:\/|$)/.test(name)
    && !/^(?:release|screenshots|test-results|playwright-report|coverage|\.openai)(?:\/|$)/.test(name)
    && !/(?:^|\/)\.DS_Store$/.test(name);
}
function assetNames(version){
  invariant(/^\d+\.\d+\.\d+$/.test(version),'Only stable x.y.z versions can be published as latest.');
  const installer=`Dropzone-Setup-${version}-x64.exe`;
  return [installer,installer+'.blockmap','latest.yml',`Dropzone-Source-${version}.zip`];
}
const digest=(buffer,algorithm='sha256',encoding='hex')=>crypto.createHash(algorithm).update(buffer).digest(encoding);
const gitBlobHash=buffer=>crypto.createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
function git(root,...args){return execFileSync('git',['-C',root,'-c','core.autocrlf=false',...args],{maxBuffer:32*1024*1024});}
function sourceTree(root,sha){
  invariant(/^[a-f0-9]{40}$/.test(sha),'Supply the full source commit SHA.');
  invariant(git(root,'rev-parse','HEAD').toString().trim()===sha,'Checkout does not match the release commit.');
  const entries=new Map();
  for(const line of git(root,'ls-tree','-rz',sha).toString().split('\0').filter(Boolean)){
    const match=/^(\d+) (\S+) ([a-f0-9]{40})\t([\s\S]+)$/.exec(line);
    invariant(match,'Could not read the committed source tree.');
    const [,mode,type,hash,name]=match;
    if(!sourceFile(name))continue;
    invariant(type==='blob'&&['100644','100755'].includes(mode),`Unsupported source entry: ${name}`);
    entries.set(name,hash);
  }
  for(const required of ['package.json','package-lock.json','app/index.html','app/version.js','desktop/main.cjs','core/services.cjs','scripts/preview.cjs','scripts/verify-release.cjs','test/core.test.cjs','docs/PUBLISH-RELEASE.md','build/installer.nsh']){
    invariant(entries.has(required),`Full source is missing ${required}.`);
  }
  invariant([...entries.keys()].some(name=>name.startsWith('app/assets/')),'Full source is missing app assets.');
  return entries;
}
function verifyUpdateFiles(directory,version){
  const names=assetNames(version),[installer,blockmap,metadata]=names;
  const binary=fs.readFileSync(path.join(directory,installer));
  invariant(binary.length>64&&binary.subarray(0,2).toString()==='MZ','Installer is not a Windows executable.');
  invariant(fs.statSync(path.join(directory,blockmap)).size>0,'Installer blockmap is empty.');
  const info=yaml.load(fs.readFileSync(path.join(directory,metadata),'utf8'));
  invariant(info&&info.version===version,'latest.yml version does not match package.json.');
  invariant(Array.isArray(info.files)&&info.files.length===1,'latest.yml must describe exactly one Windows x64 installer.');
  const file=info.files[0],sha512=digest(binary,'sha512','base64');
  invariant(file.url===installer&&info.path===installer,'latest.yml points at an unexpected installer filename.');
  invariant(Number.isSafeInteger(file.size)&&file.size===binary.length,'latest.yml installer size is incorrect.');
  invariant(file.sha512===sha512&&info.sha512===sha512,'latest.yml installer SHA512 is incorrect.');
  invariant(Number.isFinite(Date.parse(info.releaseDate)),'latest.yml release date is missing or invalid.');
  return names;
}
async function verifySourceArchive(filename,version,expected){
  const prefix=`Dropzone-Source-${version}/`,seen=new Set();
  await new Promise((resolve,reject)=>{
    yauzl.open(filename,{lazyEntries:true},(error,zip)=>{
      if(error)return reject(error);
      const fail=error=>{zip.close();reject(error);};
      zip.on('error',fail);
      zip.on('end',()=>{
        try{
          invariant(seen.size===expected.size,`Source ZIP contains ${seen.size} files; expected ${expected.size}.`);
          for(const name of expected.keys())invariant(seen.has(name),`Source ZIP is missing ${name}.`);
          resolve();
        }catch(error){reject(error);}
      });
      zip.on('entry',entry=>{
        try{
          invariant(entry.fileName.startsWith(prefix),'Source ZIP has an unexpected root folder.');
          if(entry.fileName.endsWith('/'))return zip.readEntry();
          const name=entry.fileName.slice(prefix.length);
          invariant(expected.has(name)&&!seen.has(name),`Unexpected or duplicate ZIP entry: ${name}`);
          zip.openReadStream(entry,(error,stream)=>{
            if(error)return fail(error);
            const hash=crypto.createHash('sha1').update(`blob ${entry.uncompressedSize}\0`);
            stream.on('data',chunk=>hash.update(chunk));
            stream.on('error',fail);
            stream.on('end',()=>{
              try{
                invariant(hash.digest('hex')===expected.get(name),`Source ZIP differs from the release commit: ${name}`);
                seen.add(name);zip.readEntry();
              }catch(error){fail(error);}
            });
          });
        }catch(error){fail(error);}
      });
      zip.readEntry();
    });
  });
}
async function createSourceArchive(root,directory,version,sha,expected){
  fs.mkdirSync(directory,{recursive:true});
  const filename=path.join(directory,assetNames(version)[3]);
  invariant(!fs.existsSync(filename),'Source archive already exists; refusing to overwrite it.');
  git(root,'archive','--format=zip',`--prefix=Dropzone-Source-${version}/`,`--output=${filename}`,sha);
  // git archive already excludes untracked dependencies. Remove any tracked
  // build/cache artifacts without modifying the committed source files.
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'dropzone-source-'));
  const allowlist=path.join(temporary,'files.json');
  fs.writeFileSync(allowlist,JSON.stringify([...expected.keys()]));
  try{
    execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',`
      $ErrorActionPreference = 'Stop'
      Add-Type -AssemblyName System.IO.Compression.FileSystem
      $allowed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
      foreach ($name in (Get-Content -LiteralPath $env:DZ_ARCHIVE_ALLOWLIST -Raw | ConvertFrom-Json)) { [void]$allowed.Add($name) }
      $zip = [System.IO.Compression.ZipFile]::Open($env:DZ_SOURCE_ARCHIVE, [System.IO.Compression.ZipArchiveMode]::Update)
      try {
        foreach ($entry in @($zip.Entries)) {
          if ($entry.Name -and -not $allowed.Contains($entry.FullName.Substring($env:DZ_SOURCE_PREFIX.Length))) { $entry.Delete() }
        }
      } finally { $zip.Dispose() }
    `],{env:{...process.env,DZ_ARCHIVE_ALLOWLIST:allowlist,DZ_SOURCE_ARCHIVE:filename,DZ_SOURCE_PREFIX:`Dropzone-Source-${version}/`},stdio:'inherit'});
  }finally{
    fs.unlinkSync(allowlist);fs.rmdirSync(temporary);
  }
  await verifySourceArchive(filename,version,expected);
}
async function verifyPackedApp(root,directory,version,expected){
  const asar=await import('@electron/asar');
  const archive=path.join(directory,'win-unpacked','resources','app.asar');
  const packaged=JSON.parse(asar.extractFile(archive,'package.json').toString());
  invariant(packaged.version===version,'Packaged app version does not match the source.');
  for(const [name,hash]of expected){
    if(!/^(?:app|core|desktop|third-party)\//.test(name)&&!['release-feed.json','README.md','LICENSE'].includes(name))continue;
    invariant(gitBlobHash(asar.extractFile(archive,path.normalize(name)))===hash,`Packaged app differs from the release commit: ${name}`);
  }
  const executable=fs.readFileSync(path.join(directory,'win-unpacked','Dropzone.exe'));
  const offset=executable.readUInt32LE(0x3c);
  invariant(executable.subarray(0,2).toString()==='MZ'&&executable.readUInt32LE(offset)===0x4550&&executable.readUInt16LE(offset+4)===0x8664,'Packaged Dropzone executable is not Windows x64.');
}
function createManifest(directory,version,sha){
  return {version,commit:sha,assets:assetNames(version).map(name=>{
    const bytes=fs.readFileSync(path.join(directory,name));
    return {name,size:bytes.length,sha256:digest(bytes)};
  })};
}
function verifyDownloaded(directory,manifest){
  const names=assetNames(manifest.version);
  invariant(manifest.assets?.length===names.length,'Release manifest has an unexpected asset count.');
  invariant(fs.readdirSync(directory).sort().join('\n')===[...names].sort().join('\n'),'Downloaded release does not contain exactly the four expected assets.');
  for(const name of names){
    const entries=manifest.assets.filter(asset=>asset.name===name);
    invariant(entries.length===1,`Release manifest is missing or repeats ${name}.`);
    const expected=entries[0],bytes=fs.readFileSync(path.join(directory,name));
    invariant(bytes.length===expected.size&&digest(bytes)===expected.sha256,`Uploaded asset differs from the verified build: ${name}`);
  }
  verifyUpdateFiles(directory,manifest.version);
}
async function main(){
  const [mode,shaOrDirectory,manifestFile]=process.argv.slice(2),root=path.resolve(__dirname,'..');
  if(mode==='downloaded'){
    verifyDownloaded(path.resolve(shaOrDirectory),JSON.parse(fs.readFileSync(manifestFile,'utf8')));
    console.log('All four downloaded release assets match the verified local build.');return;
  }
  invariant(mode==='build','Usage: verify-release.cjs build <commit> <manifest.json> | downloaded <directory> <manifest.json>');
  const sha=shaOrDirectory,version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
  assetNames(version);
  const expected=sourceTree(root,sha),directory=path.join(root,'release','installer');
  const committedVersion=JSON.parse(git(root,'show',`${sha}:package.json`).toString()).version;
  invariant(version===committedVersion,'Working version differs from the release commit.');
  git(root,'diff','--exit-code',sha,'--','.');
  const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
  invariant(lock.version===version&&lock.packages?.['']?.version===version,'Lockfile version is inconsistent.');
  verifyUpdateFiles(directory,version);
  await verifyPackedApp(root,directory,version,expected);
  await createSourceArchive(root,directory,version,sha,expected);
  fs.writeFileSync(manifestFile,JSON.stringify(createManifest(directory,version,sha),null,2)+'\n');
  console.log(`Verified Windows x64 app, updater checksums, and ${expected.size} source files from ${sha}.`);
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={sourceFile,assetNames,gitBlobHash,verifyUpdateFiles,verifySourceArchive,createSourceArchive,verifyPackedApp,createManifest,verifyDownloaded};
