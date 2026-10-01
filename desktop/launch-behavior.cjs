'use strict';
const fs=require('node:fs');
const path=require('node:path');
const DEFAULTS=Object.freeze({startMinimized:false,openLiveTrackerOnSession:false});
const validSession=value=>typeof value==='string'&&value.length>0&&value.length<=160;
// This file belongs to Dropzone. It never reads or changes Windows startup entries.
function createLaunchBehavior({directory,platform=process.platform,storage=fs}){
 const file=path.join(directory,'launch-behavior.json');let settings={...DEFAULTS},seen=[],readable=true;
 try{const value=JSON.parse(storage.readFileSync(file,'utf8'));for(const key of Object.keys(DEFAULTS))settings[key]=value[key]===true;seen=Array.isArray(value.handledSessions)?value.handledSessions.filter(validSession).slice(-64):[];}catch(error){if(error.code!=='ENOENT')readable=false;}
 function status(){return {available:platform==='win32'&&readable,...settings,message:!readable?'Launch preferences could not be read. Reopen Dropzone to try again.':platform!=='win32'?'Available in the Windows desktop app.':'Saved on this PC. Windows startup is controlled separately.'};}
 function write(next,nextSeen){storage.mkdirSync(directory,{recursive:true});storage.writeFileSync(file+'.tmp',JSON.stringify({...next,handledSessions:nextSeen}),{encoding:'utf8',mode:0o600});storage.renameSync(file+'.tmp',file);settings=next;seen=nextSeen;}
 function command(input={}){
  if(input.action===undefined||input.action==='status')return status();
  if(input.action!=='set'||!Object.hasOwn(DEFAULTS,input.key)||typeof input.enabled!=='boolean')throw Error('Invalid launch preference.');
  if(!status().available)return status();
  try{write({...settings,[input.key]:input.enabled},seen);return status();}catch{return {...status(),saved:false,message:'Could not save this preference. Your previous setting is still active.'};}
 }
 function claimSession(id){if(!validSession(id)||!status().available||!settings.openLiveTrackerOnSession||seen.includes(id))return false;try{write(settings,[...seen,id].slice(-64));return true;}catch{return false;}}
 return {command,status,claimSession};
}
module.exports={createLaunchBehavior,DEFAULTS};
