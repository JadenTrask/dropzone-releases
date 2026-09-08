const {app,BrowserWindow,ipcMain,dialog,shell,clipboard,session,powerMonitor}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {createServices}=require('../core/services.cjs');
const {AppUpdateService}=require('./app-updater.cjs');
const {coordinateStartup}=require('./startup.cjs');
const fsSync=require('node:fs');
// Reuse the existing profile so upgrades retain saves and text preferences.
app.setName('Dropzone');
const profileNames=['Dropzone','dropzone',"Truck's Build Builder",'trucks-build-builder','rift-forge','Rift Forge'];
for(const old of profileNames){const dir=path.join(app.getPath('appData'),old);if(fsSync.existsSync(dir)){app.setPath('userData',dir);break;}}
const applicationId='com.dropzone.desktop';
if(process.platform==='win32')app.setAppUserModelId(applicationId);
let window,splash,provider,games,services,appUpdates;
const allowed=new Set(['lolalytics.com','mobalytics.gg','www.metasrc.com','www.leagueoflegends.com','developer.riotgames.com','codmunity.gg','www.callofduty.com','thefinalsloadout.com','www.reachthefinals.com','www.youtube.com','lolesports.com','www.callofdutyleague.com','callofduty.worldseriesofwarzone.com','support.activision.com','wardogs-artillery.com','wardogs.tools','metaforge.app','github.com','store.steampowered.com','steamcommunity.com','steamstore-a.akamaihd.net','gzw-data.dev','gray-zone-warfare.fandom.com','gzwtacmap.com','www.grayzonewarfare.com','www.ubisoft.com','dropzonecompanion.com','sonsoftheforest.wiki.gg']);
function safeSource(value){try{const u=new URL(value);return u.protocol==='https:'&&allowed.has(u.hostname)&&!u.username&&!u.password;}catch{return false;}}
if(!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>{services?.updates.check();appUpdates?.check();const visible=window?.isVisible()?window:splash;if(visible&&!visible.isDestroyed()){if(visible.isMinimized())visible.restore();visible.focus();}});
app.whenReady().then(()=>{
  services=createServices({cacheDir:path.join(app.getPath('userData'),'feeds'),leagueCacheDir:path.join(app.getPath('userData'),'cache'),codCacheDir:path.join(app.getPath('userData'),'cod-cache'),bundleDir:path.join(__dirname,'../app/data')});
  ({provider,games}=services);
  window=new BrowserWindow({width:1480,height:980,minWidth:1000,minHeight:720,show:false,frame:false,backgroundColor:'#0b0c10',title:'Dropzone',icon:path.join(__dirname,'../app/assets/icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  splash=new BrowserWindow({width:520,height:320,show:false,frame:false,resizable:false,maximizable:false,minimizable:false,skipTaskbar:true,backgroundColor:'#0c1110',title:'Dropzone',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  splash.removeMenu();
  splash.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  splash.webContents.on('will-navigate',e=>e.preventDefault());
  coordinateStartup({main:window,splash});
  splash.loadFile(path.join(__dirname,'../app/splash.html')).catch(()=>{});
  appUpdates=new AppUpdateService({version:app.getVersion(),feed:require('../release-feed.json').feed,packaged:app.isPackaged,installed:fsSync.existsSync(path.join(process.resourcesPath,'dropzone-installed')),createUpdater:()=>new (require('electron-updater').NsisUpdater)()});
  appUpdates.on('status',state=>{if(!window.isDestroyed()&&!window.webContents.isDestroyed())window.webContents.send('app-update-status',state);});
  window.removeMenu();
  session.defaultSession.setPermissionRequestHandler((_wc,_p,callback)=>callback(false));
  // YouTube requires desktop WebViews to identify the embedding application.
  // Only the YouTube embed navigation gets our own Windows application ID;
  // this does not claim a public website, API partnership, or a user identity.
  session.defaultSession.webRequest.onBeforeSendHeaders({urls:['https://www.youtube-nocookie.com/embed/*']},(details,callback)=>{
    callback({requestHeaders:{...details.requestHeaders,Referer:'https://'+applicationId+'/'}});
  });
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(e)=>e.preventDefault());
  const trusted=e=>e.sender===window.webContents&&e.senderFrame===window.webContents.mainFrame;
  const handle=(name,fn)=>ipcMain.handle(name,(e,...args)=>{if(!trusted(e))throw new Error('Untrusted caller.');return fn(...args);});
  handle('games',()=>games.list());
  handle('loadouts',options=>games.builds(options));
  handle('media',options=>services.media.list(options));
  handle('patches',options=>services.patches.list(options));
  handle('siege',options=>services.siege.get(options));
  handle('wardogs',options=>services.wardogs.get(options));
  handle('updates',refresh=>refresh===true?services.updates.check():services.updates.status());
  handle('app-updates',()=>appUpdates.status());
  handle('check-app-updates',()=>{appUpdates.check(true);return appUpdates.status();});
  handle('install-app-update',()=>appUpdates.install());
  handle('catalog',refresh=>provider.getCatalog(refresh));
  handle('build',o=>provider.build(o));
  handle('modes',()=>services.modes);
  handle('status',()=>provider.status());
  handle('clear-cache',()=>provider.clearCache());
  handle('copy',text=>{if(typeof text!=='string'||text.length>200000)throw new Error('Invalid clipboard text.');clipboard.writeText(text);return true;});
  handle('open-source',async url=>{if(!safeSource(url))throw new Error('Invalid source link.');await shell.openExternal(url);return true;});
  handle('export-file',async({name,data})=>{
    if(typeof name!=='string'||!/^[a-zA-Z0-9_.-]+\.json$/.test(name)||!data||JSON.stringify(data).length>200000)throw new Error('Invalid export.');
    const label=data.game==='gzw'?'Gray Zone Warfare map backup':data.game==='wardogs'?'WARDOGS targets':'League item set';
    const {canceled,filePath}=await dialog.showSaveDialog(window,{title:'Export '+label,defaultPath:path.join(app.getPath('downloads'),name),filters:[{name:label,extensions:['json']}]});
    if(canceled)return {canceled:true};
    await fs.writeFile(filePath,JSON.stringify(data,null,2),'utf8');return {saved:true};
  });
  ipcMain.on('window',(e,action)=>{if(!trusted(e))return;if(action==='minimize')window.minimize();if(action==='maximize')window.isMaximized()?window.unmaximize():window.maximize();if(action==='close')window.close();});
  window.loadFile(path.join(__dirname,'../app/index.html')).catch(()=>{dialog.showErrorBox('Dropzone could not open','The app files could not be loaded. Reinstall Dropzone to repair them. Your saved data stays on this PC.');app.quit();});
  appUpdates.check();
  setInterval(()=>appUpdates.check(),6*60*60_000).unref();
  services.updates.check();
  setInterval(()=>services.updates.check(),15*60_000).unref();
  powerMonitor.on('resume',()=>{services.updates.check();appUpdates.check();});
  window.on('focus',()=>{const last=services.updates.status().finishedAt;if(!last||Date.now()-Date.parse(last)>15*60_000)services.updates.check();});
});
app.on('window-all-closed',()=>app.quit());
