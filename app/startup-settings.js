import {api} from './shared.js';

export function mountStartupSetting(parent){
 const announcement=document.createElement('span');
 announcement.className='startup-save-announcement';announcement.setAttribute('role','status');parent.append(announcement);
 const pending=(item,text)=>{item.input.setAttribute('aria-busy','true');announcement.textContent=text;};
 const environment=document.createElement('p');
 environment.id='launch-environment';environment.className='startup-environment';environment.hidden=true;environment.setAttribute('role','status');
 const availability=new Map();
 const setAvailability=(group,available)=>{
  availability.set(group,available);
  const unavailable=[...availability].filter(([,value])=>value===false).map(([key])=>key);
  environment.hidden=!unavailable.length;
  environment.textContent=unavailable.length===2?'These launch options require the Windows desktop app.':unavailable[0]==='windows'?'Windows startup requires the installed Windows app.':'Launch preferences require the Windows desktop app.';
 };
 const environmentOnly=result=>!result.available&&/available.*app|preview/i.test(result.message||'');
 const setMessage=(node,text)=>{node.textContent=text||'';node.hidden=!text;};
 const makeRow=(id,label)=>{
  const row=document.createElement('div');row.className='startup-setting';
  row.innerHTML=`<label class="startup-setting-toggle"><input id="${id}" type="checkbox" role="switch" disabled aria-describedby="${id}-status launch-environment"><span>${label}</span></label><p id="${id}-status" role="status" hidden></p>`;
  parent.append(row);return{row,input:row.querySelector('input'),message:row.querySelector('p')};
 };
 const windows=makeRow('launch-at-login','Launch Dropzone when Windows starts');
 let value=false;
 const showStartup=result=>{
  if(!windows.row.isConnected)return;
  value=!!result.enabled;windows.input.checked=value;windows.input.disabled=!result.available;
  windows.input.removeAttribute('aria-busy');
  setAvailability('windows',result.available||!environmentOnly(result));
  // Keep actionable Windows failures/disabled-registration messages, but the
  // switch itself already communicates ordinary on/off success.
  const ordinary=environmentOnly(result)||/^(Off\.|Dropzone starts when)/.test(result.message||'');
  setMessage(windows.message,ordinary?'':result.message);
 };
 const unavailable={available:false,enabled:false,message:'Available in the installed Windows app.'};
 const startupCall=options=>api.loginStartup?api.loginStartup(options):Promise.resolve(unavailable);
 windows.input.onchange=async()=>{
  const enabled=windows.input.checked;windows.input.disabled=true;pending(windows,'Saving startup preference.');
  try{showStartup(await startupCall({action:'set',enabled}));}
  catch{showStartup({available:true,enabled:value,message:'Could not save the startup preference. Try again.'});}
  finally{announcement.textContent='';}
 };
 void startupCall({action:'status'}).then(showStartup).catch(()=>showStartup({...unavailable,message:'Startup settings could not be read. Try again after reopening Dropzone.'}));

 const rows=[['startMinimized','Start minimized'],['openLiveTrackerOnSession','Open Live Tracker when a session starts']].map(([key,label])=>({key,...makeRow('launch-'+key,label)}));
 const launchUnavailable={available:false,startMinimized:false,openLiveTrackerOnSession:false,message:'Available in the Windows desktop app.'};
 const launchCall=input=>api.launchBehavior?api.launchBehavior(input):Promise.resolve(launchUnavailable);
 let current=launchUnavailable;
 const showLaunch=(result,failedKey)=>{
  current=result;setAvailability('launch',result.available||!environmentOnly(result));
  for(const item of rows){
   if(!item.row.isConnected)continue;
   item.input.checked=result[item.key]===true;item.input.disabled=!result.available;
   item.input.removeAttribute('aria-busy');
   const failed=item.key===failedKey||!result.available&&!environmentOnly(result)&&item===rows[0];
   setMessage(item.message,failed?result.message:'');
  }
 };
 for(const item of rows)item.input.onchange=async()=>{
  for(const row of rows)row.input.disabled=true;
  pending(item,'Saving preference.');
  try{const result=await launchCall({action:'set',key:item.key,enabled:item.input.checked});showLaunch(result,result.saved===false?item.key:null);}
  catch{showLaunch({...current,message:'Could not save this preference. Try again.'},item.key);}
  finally{announcement.textContent='';}
 };
 void launchCall({action:'status'}).then(result=>showLaunch(result)).catch(()=>showLaunch({...launchUnavailable,message:'Launch preferences could not be read. Try again after reopening Dropzone.'}));
 parent.append(environment);
 const details=document.createElement('details');details.className='startup-help';
 details.innerHTML='<summary>How session opening works</summary><p>Fresh Free Play, private or public match telemetry can open Live Tracker behind your game. Requires the Rocket League Stats API; opening the game or its menu does not trigger this.</p><p>Uses a secondary display when available, without requesting focus. Start minimized keeps Dropzone on the taskbar; closing the app still exits.</p>';
 parent.append(details);
}
