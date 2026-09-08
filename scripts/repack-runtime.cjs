// Reuse a previously verified Windows Electron runtime when cross-packaging.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
(async()=>{
 const root=path.join(__dirname,'..'),base=path.resolve(process.argv[2]||'');
 if(!process.argv[2]||!fs.existsSync(path.join(base,'Dropzone.exe')))throw new Error('Supply an existing Dropzone Windows runtime directory.');
 const asar=await import('@electron/asar'),PE=await import('pe-library'),RE=await import('resedit');
 const pkg=require('../package.json'),basePkg=JSON.parse(asar.extractFile(path.join(base,'resources/app.asar'),'package.json'));
 assert.equal(basePkg.devDependencies.electron,pkg.devDependencies.electron,'Electron runtime version must match');
 const release=process.argv[3]?path.resolve(process.argv[3]):path.join(root,'release/Dropzone-win32-x64');assert.notEqual(base,release);
 fs.mkdirSync(release,{recursive:true});fs.cpSync(base,release,{recursive:true,filter:src=>!path.basename(src).startsWith('.')});
 const stage=fs.mkdtempSync(path.join(os.tmpdir(),'dropzone-package-'));
 for(const name of ['app','core','desktop','docs','third-party','package.json','package-lock.json','release-feed.json','README.md','START-HERE.txt','LICENSE'])fs.cpSync(path.join(root,name),path.join(stage,name),{recursive:true});
 const install=spawnSync('npm',['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd:stage,stdio:'inherit'});if(install.status!==0)throw new Error('Production dependency install failed.');
 const archive=path.join(release,'resources/app.asar');await asar.createPackage(stage,archive);
 const hash=crypto.createHash('sha256').update(asar.getRawHeader(archive).headerString).digest('hex');
 const exe=PE.NtExecutable.from(fs.readFileSync(path.join(base,'Dropzone.exe'))),res=PE.NtExecutableResource.from(exe);
 const digest=buf=>crypto.createHash('sha256').update(Buffer.from(buf||new ArrayBuffer(0))).digest('hex');
 const original=exe.getAllSections().filter(s=>s.info.name!=='.rsrc').map(s=>({name:s.info.name,hash:digest(s.data)}));
 const vi=RE.Resource.VersionInfo.fromEntries(res.entries)[0],numbers=pkg.version.split('-')[0].split('.').map(Number);
 vi.setFileVersion(...numbers,0);vi.setProductVersion(...numbers,0);
 for(const lang of vi.getAllLanguagesForStringValues())vi.setStringValues(lang,{FileVersion:pkg.version,ProductVersion:pkg.version});
 vi.outputToResourceEntries(res.entries);
 for(let i=res.entries.length-1;i>=0;i--)if(res.entries[i].type==='INTEGRITY'&&res.entries[i].id==='ELECTRONASAR')res.entries.splice(i,1);
 const integrity=[{file:'resources\\app.asar',alg:'SHA256',value:hash}];
 res.entries.push({type:'INTEGRITY',id:'ELECTRONASAR',lang:1033,codepage:1200,bin:Uint8Array.from(Buffer.from(JSON.stringify(integrity))).buffer});
 res.outputResource(exe);fs.writeFileSync(path.join(release,'Dropzone.exe'),Buffer.from(exe.generate()));
 const output=PE.NtExecutable.from(fs.readFileSync(path.join(release,'Dropzone.exe')));
 for(const s of original)assert.equal(digest(output.getAllSections().find(o=>o.info.name===s.name).data),s.hash,s.name);
 assert.equal(output.is32bit(),false);
 const outputRes=PE.NtExecutableResource.from(output);assert.deepEqual(JSON.parse(Buffer.from(outputRes.entries.find(r=>r.type==='INTEGRITY').bin)),integrity);
 const feed=require('../core/release-config.cjs').validateFeed(require('../release-feed.json').feed),configPath=path.join(release,'resources/app-update.yml');
 if(feed)fs.writeFileSync(configPath,require('js-yaml').dump({...feed,updaterCacheDirName:'dropzone-updater'}));else fs.rmSync(configPath,{force:true});
 fs.rmSync(path.join(release,'resources/dropzone-installed'),{force:true});
 for(const [source,dest] of [['README.md','README.md'],['START-HERE.txt','START-HERE.txt'],['docs/VALIDATION.md','VALIDATION.md'],['LICENSE','DROPZONE-LICENSE.txt']])fs.writeFileSync(path.join(release,dest),fs.readFileSync(path.join(root,source)));
 let checked=0;
 function verify(dir,prefix=''){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const rel=path.posix.join(prefix,item.name);if(item.isDirectory())verify(path.join(dir,item.name),rel);else{assert.deepEqual(asar.extractFile(archive,rel),fs.readFileSync(path.join(stage,rel)),rel);checked++;}}}
 verify(stage);
 assert.equal(JSON.parse(asar.extractFile(archive,'package.json')).version,pkg.version);
 assert.equal(JSON.parse(asar.extractFile(archive,'node_modules/electron-updater/package.json')).version,pkg.dependencies['electron-updater']);
 fs.rmSync(stage,{recursive:true,force:true});
 function cleanStaging(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isFile()&&entry.name.startsWith('.'))fs.unlinkSync(file);else if(entry.isDirectory())cleanStaging(file);}}
 cleanStaging(release);
 console.log(JSON.stringify({version:pkg.version,filesVerified:checked,executableCodeSectionsPreserved:original.length,release,feedConfigured:!!feed},null,2));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
