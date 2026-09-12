const {contextBridge,ipcRenderer}=require('electron');
// Buffer readiness even if the first paint precedes the intro module.
let startupRevealed=false;const startupCallbacks=new Set();
ipcRenderer.once('startup-reveal',()=>{startupRevealed=true;for(const callback of startupCallbacks)callback();startupCallbacks.clear();});
contextBridge.exposeInMainWorld('rift',Object.freeze({
  quickPanel:input=>ipcRenderer.invoke('quick-panel',input),
  onQuickPanel:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('quick-panel-status',listener);return ()=>ipcRenderer.removeListener('quick-panel-status',listener);},
  metaforgePanel:input=>ipcRenderer.invoke('metaforge-panel',input),
  onMetaForgeStatus:callback=>{if(typeof callback!=='function')return ()=>{};const listener=(_event,value)=>callback(value);ipcRenderer.on('metaforge-status',listener);return ()=>ipcRenderer.removeListener('metaforge-status',listener);},
  games:()=>ipcRenderer.invoke('games'),
  loadouts:options=>ipcRenderer.invoke('loadouts',options),
  media:options=>ipcRenderer.invoke('media',options),
  patches:options=>ipcRenderer.invoke('patches',options),
  personalIntel:input=>ipcRenderer.invoke('personal-intel',input),
  squad:input=>ipcRenderer.invoke('squad',input),
  siege:options=>ipcRenderer.invoke('siege',options),
  wardogs:options=>ipcRenderer.invoke('wardogs',options),
  wardogsTerrain:resource=>ipcRenderer.invoke('wardogs-terrain',resource),
  onStartupReveal:callback=>{if(typeof callback!=='function')return;if(startupRevealed)callback();else startupCallbacks.add(callback);},
  updates:refresh=>ipcRenderer.invoke('updates',refresh===true),
  appUpdates:()=>ipcRenderer.invoke('app-updates'),
  checkAppUpdates:()=>ipcRenderer.invoke('check-app-updates'),
  installAppUpdate:()=>ipcRenderer.invoke('install-app-update'),
  onAppUpdate:callback=>{if(typeof callback!=='function')return ()=>{};const listener=(_event,state)=>callback(state);ipcRenderer.on('app-update-status',listener);return ()=>ipcRenderer.removeListener('app-update-status',listener);},
  catalog:refresh=>ipcRenderer.invoke('catalog',Boolean(refresh)),
  build:options=>ipcRenderer.invoke('build',options),
  modes:()=>ipcRenderer.invoke('modes'),
  status:()=>ipcRenderer.invoke('status'),
  clearCache:()=>ipcRenderer.invoke('clear-cache'),
  exportFile:(name,data)=>ipcRenderer.invoke('export-file',{name,data}),
  openSource:url=>ipcRenderer.invoke('open-source',url),
  copy:text=>ipcRenderer.invoke('copy',text),
  window:action=>ipcRenderer.send('window',action),
  desktop:true
}));
