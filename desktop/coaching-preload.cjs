const {contextBridge,ipcRenderer}=require('electron');
const subscribe=(name,fn)=>{const listener=(_event,value)=>fn(value);ipcRenderer.on(name,listener);return ()=>ipcRenderer.removeListener(name,listener);};
contextBridge.exposeInMainWorld('coach',Object.freeze({command:input=>ipcRenderer.invoke('coaching-draw',input),onMode:fn=>subscribe('coaching-mode',fn),onSettings:fn=>subscribe('coaching-settings',fn),onClear:fn=>subscribe('coaching-clear',fn)}));
