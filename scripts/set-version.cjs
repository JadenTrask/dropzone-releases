const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..'),pkgPath=path.join(root,'package.json');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
const value=process.argv[2]||pkg.version;
if(!/^\d+\.\d+\.\d+(?:-beta\.[1-9]\d*)?$/.test(value))throw new Error('Use 1.0.0, 1.0.1, or 1.0.0-beta.1.');
pkg.version=value;fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
const lockPath=path.join(root,'package-lock.json');
if(fs.existsSync(lockPath)){const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));lock.version=value;if(lock.packages?.[''])lock.packages[''].version=value;fs.writeFileSync(lockPath,JSON.stringify(lock,null,2)+'\n');}
fs.writeFileSync(path.join(root,'app/version.js'),`// Generated from package.json by scripts/set-version.cjs.\nexport const APP_VERSION=${JSON.stringify(value)};\n`);
const index=path.join(root,'app/index.html');fs.writeFileSync(index,fs.readFileSync(index,'utf8').replace(/(data-app-version>)[^<]*/g,'$1'+value));
console.log('Dropzone version: '+value);
