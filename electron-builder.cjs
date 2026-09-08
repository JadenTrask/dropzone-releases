const {validateFeed}=require('./core/release-config.cjs');
const feed=validateFeed(require('./release-feed.json').feed);
module.exports={
  appId:'com.dropzone.desktop',productName:'Dropzone',executableName:'Dropzone',
  directories:{output:'release/installer',buildResources:'build'},
  files:['app/**/*','core/**/*','desktop/**/*','third-party/**/*','package.json','release-feed.json','README.md','LICENSE'],
  asar:true,npmRebuild:false,compression:'normal',
  toolsets:process.platform==='win32'?undefined:{wine:'1.0.1'},
  win:{target:[{target:'nsis',arch:['x64']}],icon:'app/assets/icon.ico'},
  nsis:{oneClick:true,perMachine:false,allowElevation:false,packElevateHelper:false,createDesktopShortcut:true,createStartMenuShortcut:true,deleteAppDataOnUninstall:false,include:'build/installer.nsh',artifactName:'Dropzone-Setup-${version}-${arch}.${ext}'},
  publish:feed?[feed]:null,
  generateUpdatesFilesForAllChannels:true
};
