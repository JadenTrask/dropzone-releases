import {api} from './shared.js';
export function mountStartupSetting(parent){
 const row=document.createElement('div');row.className='startup-setting';
 row.innerHTML='<label class="startup-setting-toggle"><input id="launch-at-login" type="checkbox" role="switch" disabled aria-describedby="launch-at-login-status"><span>Launch Dropzone when Windows starts</span></label><p id="launch-at-login-status" role="status">Checking Windows startup preference…</p>';
 parent.append(row);
 const input=row.querySelector('input'),message=row.querySelector('p');let value=false;
 const show=result=>{if(!row.isConnected)return;value=!!result.enabled;input.checked=value;input.disabled=!result.available;message.textContent=result.message;};
 const unavailable={available:false,enabled:false,message:'Available in the installed Windows app. This preview does not change startup settings.'};
 const call=options=>api.loginStartup?api.loginStartup(options):Promise.resolve(unavailable);
 input.onchange=async()=>{const enabled=input.checked;input.disabled=true;message.textContent='Saving startup preference…';try{show(await call({action:'set',enabled}));}catch{show({available:true,enabled:value,message:'Could not save the startup preference. Try again.'});}};
 void call({action:'status'}).then(show).catch(()=>show({...unavailable,message:'Startup settings could not be read. Try again after reopening Dropzone.'}));
}
