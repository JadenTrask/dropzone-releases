// Run the existing renderer audit with installed Edge in true headless mode.
// No Electron app, native windows, dialogs, user profile, or foreground activation.
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process'),Module=require('node:module');
const base=path.resolve(__dirname,'../.validation-cache');
fs.mkdirSync(base,{recursive:true});
const profile=fs.mkdtempSync(path.join(base,'headless-'));
const binary=process.env.DROPZONE_HEADLESS_BROWSER||path.join(process.env['ProgramFiles(x86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe');
if(!fs.existsSync(binary))throw Error('Installed headless browser unavailable; no visible-browser fallback.');
const stderr=fs.openSync(path.join(profile,'browser.log'),'w');
const child=spawn(binary,['--headless=new','--disable-gpu','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--window-size=1920,1080','--no-first-run','--no-default-browser-check','--disable-background-mode','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore',stderr]});
try{os.setPriority(child.pid,os.constants.priority.PRIORITY_BELOW_NORMAL);}catch{}
let socket,sequence=0;const pending=new Map(),listeners=new Map();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Headless protocol timeout: '+method));},60000);
 pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
});
const on=(event,fn)=>{if(!listeners.has(event))listeners.set(event,[]);listeners.get(event).push(fn);};
const ready=(async()=>{
 const active=path.join(profile,'DevToolsActivePort');
 for(let n=0;!fs.existsSync(active);n++){if(n>150||child.exitCode!==null)throw Error('Headless browser failed to start; see '+path.join(profile,'browser.log'));await pause(100);}
 const port=fs.readFileSync(active,'utf8').split(/\r?\n/)[0];
 const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const tab=tabs.find(t=>t.type==='page');if(!tab)throw Error('No headless page target.');
 socket=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const job=pending.get(message.id);if(job){pending.delete(message.id);clearTimeout(job.timer);if(message.error)job.reject(Error(message.error.message));else job.resolve(message.result);}}else for(const fn of listeners.get(message.method)||[])fn(message.params);});
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 // This emulates page visibility inside headless Chromium; it cannot focus a
 // native window because no browser window is created by --headless.
 await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 // Capture settled designs, without platform view-transition snapshots.
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:(process.argv.includes('--performance')||process.argv.includes('--fade-motion')||process.argv.includes('--flicker'))?'no-preference':'reduce'}]});
})();
class BrowserWindow{
 constructor(){
  const completed=[],failed=[],requests=new Map();
  on('Network.responseReceived',e=>{requests.set(e.requestId,e.response.url);for(const row of completed)if(e.response.url.startsWith('https://cdn.gzwtacmap.com/'))row({url:e.response.url,statusCode:e.response.status});});
  on('Network.loadingFailed',e=>{const url=requests.get(e.requestId)||'';if(url.startsWith('https://cdn.gzwtacmap.com/'))for(const fn of failed)fn({url,error:e.errorText});});
  this.webContents={
   executeJavaScript:async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;},
   debugger:{isAttached:()=>true,attach:()=>{},sendCommand:send,on:(event,fn)=>{if(event==='message')on('Page.screencastFrame',params=>fn({},'Page.screencastFrame',params));}},
   session:{webRequest:{onCompleted:(_filter,fn)=>completed.push(fn),onErrorOccurred:(_filter,fn)=>failed.push(fn)}},
   on:(event,fn)=>{if(event==='console-message'){on('Runtime.consoleAPICalled',e=>fn({},0,e.args.map(a=>a.value||a.description||'').join(' ')));on('Runtime.exceptionThrown',e=>fn({},3,'Uncaught '+(e.exceptionDetails.exception?.description||e.exceptionDetails.text)));}}
  };
 }
 async loadURL(url){await send('Page.navigate',{url});for(let n=0;n<200;n++){const r=await send('Runtime.evaluate',{expression:'document.readyState',returnByValue:true});if(r.result.value==='complete')return;await pause(25);}throw Error('Headless navigation timed out.');}
 async setContentSize(width,height){const {windowId}=await send('Browser.getWindowForTarget');await send('Browser.setWindowBounds',{windowId,bounds:{width,height}});}
 destroy(){}
}
function exit(code){for(const job of pending.values())clearTimeout(job.timer);socket?.close();child.kill();process.exitCode=code;setTimeout(()=>process.exit(code),250);}
process.on('uncaughtException',error=>{console.error(error.stack);exit(1);});
process.on('unhandledRejection',error=>{console.error(error?.stack||error);exit(1);});
const load=Module._load;Module._load=function(id,...args){if(id==='electron')return{app:{disableHardwareAcceleration(){},setPath(){},whenReady:()=>ready,exit},BrowserWindow};return load.call(this,id,...args);};
require('./check-desktop-248.cjs');
