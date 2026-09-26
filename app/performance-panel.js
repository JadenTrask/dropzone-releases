import {e} from './shared.js';
let timer,observer,busy=false;
export function mountPerformance(){
 const root=document.querySelector('.app-settings');if(!root||root.querySelector('#performance-panel'))return;
 const box=document.createElement('section');box.className='panel';box.id='performance-panel';box.innerHTML='<details><summary>Performance</summary><p>On-demand diagnostics. No sampling while this panel is closed or Dropzone is hidden.</p><button class="hub-button secondary" id="performance-refresh">Refresh</button><label><input type="checkbox" id="performance-auto"> Update every five seconds while open</label><pre id="performance-values" role="status">Open the desktop app to inspect resource usage.</pre></details>';root.append(box);
 const details=box.querySelector('details'),auto=box.querySelector('#performance-auto');
 async function sample(){if(busy||!box.isConnected||!details.open||document.hidden||!window.rift?.rocketLeague)return;busy=true;try{const [p,s]=await Promise.all([window.rift.rocketLeague({action:'performance'}),window.rift.rocketLeague({action:'state'})]);if(box.isConnected)box.querySelector('pre').textContent=`CPU (all app processes): ${p.cpu.toFixed(1)}%\nRAM (working sets): ${p.ramMB.toFixed(0)} MB\nActive page: Settings\nRocket League tracker: ${s.status}\nDatabase: ${s.diagnostics.database} · ${s.diagnostics.queue} queued\nApp uptime: ${p.uptime}s`+(s.settings.diagnostics?`\nMessages: ${s.diagnostics.messages} · recent rate: ${s.diagnostics.rate.toFixed(1)}/s\nRejected messages: ${s.diagnostics.malformed}\nDatabase writes: ${s.diagnostics.writes}`:'');}catch(err){if(box.isConnected)box.querySelector('pre').textContent=err.message;}finally{busy=false;}}
 function schedule(){clearInterval(timer);if(box.isConnected&&details.open&&!document.hidden&&auto.checked)timer=setInterval(sample,5000);}
 details.ontoggle=()=>{sample();schedule();};auto.onchange=schedule;box.querySelector('button').onclick=sample;
 const visible=()=>{schedule();if(!document.hidden)sample();};document.addEventListener('visibilitychange',visible);
 observer?.disconnect();observer=new MutationObserver(()=>{if(!box.isConnected){clearInterval(timer);document.removeEventListener('visibilitychange',visible);observer.disconnect();}});observer.observe(document.querySelector('#hub-app'),{childList:true});
}
