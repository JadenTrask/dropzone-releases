'use strict';
// Renderer-only mock bridge. Never invokes Electron, Windows startup, or profile storage.
module.exports=async({run,pause,capture,report,data})=>{
 const firstFlow=report.flows.length,firstCapture=report.captures.length;
 const check=async(name,fn)=>{const passed=await run(fn);report.flows.push({name,passed});if(!passed)throw Error(name);};
 const click=async selector=>{await run(selector=>document.querySelector(selector).click(),selector);await pause(80);};
 await run(async games=>{
  window.qaLaunch={startup:false,startMinimized:false,openLiveTrackerOnSession:false,calls:[],failure:null};
  const q=window.qaLaunch;
  window.rift.loginStartup=async input=>{q.calls.push({api:'loginStartup',...input});if(input.action==='set'){if(q.failure==='startup')throw Error('Fixture save failed');q.startup=input.enabled;}return{available:true,enabled:q.startup,message:q.startup?'Dropzone starts when you sign in to Windows.':'Off. Dropzone will not start with Windows.'};};
  window.rift.launchBehavior=async input=>{q.calls.push({api:'launchBehavior',...input});if(input.action==='set'){if(q.failure==='launch-throw')throw Error('Fixture save failed');if(q.failure==='launch-result')return{available:true,startMinimized:q.startMinimized,openLiveTrackerOnSession:q.openLiveTrackerOnSession,saved:false,message:'Could not save this preference. Your previous setting is still active.'};q[input.key]=input.enabled;}return{available:true,startMinimized:q.startMinimized,openLiveTrackerOnSession:q.openLiveTrackerOnSession,message:'Saved on this PC. Windows startup is controlled separately.'};};
  const {mountSettings}=await import('/app-settings.js');mountSettings(games);
 },data.games);await pause(120);
 await check('Three independent launch controls default off without writes',()=>{const inputs=[...document.querySelectorAll('.startup-setting input')];return inputs.length===3&&inputs.every(input=>!input.checked&&!input.disabled&&input.getAttribute('role')==='switch'&&input.getAttribute('aria-describedby').split(' ').every(id=>document.getElementById(id)))&&!window.qaLaunch.calls.some(call=>call.action==='set');});
 for(const [width,height]of [[1920,1080],[1000,900]]){
  await capture('launch-options-default-off',width,height);
  await check('Launch labels remain aligned at '+width,()=>[...document.querySelectorAll('.startup-setting')].every(row=>{const input=row.querySelector('input').getBoundingClientRect(),label=row.querySelector('span').getBoundingClientRect(),help=row.querySelector('p').getBoundingClientRect();return input.width>=18&&input.height>=18&&label.left-input.right>=8&&(row.querySelector('p').hidden||help.top>=label.bottom)&&label.right<=innerWidth&&row.scrollWidth<=row.clientWidth+1;}));
 }
 await click('#launch-startMinimized');
 await check('Start minimized saves independently of Windows startup and session opening',()=>window.qaLaunch.startMinimized&&!window.qaLaunch.startup&&!window.qaLaunch.openLiveTrackerOnSession&&document.querySelector('#launch-startMinimized').checked&&!document.querySelector('#launch-at-login').checked&&!document.querySelector('#launch-openLiveTrackerOnSession').checked&&window.qaLaunch.calls.filter(call=>call.action==='set').length===1);
 await click('#launch-openLiveTrackerOnSession');
 await check('Session auto-open remains independent of Windows startup',()=>window.qaLaunch.startMinimized&&window.qaLaunch.openLiveTrackerOnSession&&!window.qaLaunch.startup&&!window.qaLaunch.calls.some(call=>call.api==='loginStartup'&&call.action==='set'));
 await click('#launch-at-login');
 await check('Windows startup saves through its own API',()=>window.qaLaunch.startup&&window.qaLaunch.calls.some(call=>call.api==='loginStartup'&&call.action==='set')&&document.querySelectorAll('.startup-setting input:checked').length===3);
 await run(async games=>{const {mountSettings}=await import('/app-settings.js');mountSettings(games);},data.games);await pause(100);
 await check('Remount queries all three saved mock preferences',()=>document.querySelectorAll('.startup-setting input:checked').length===3&&window.qaLaunch.calls.filter(call=>call.api==='loginStartup'&&call.action==='status').length===2&&window.qaLaunch.calls.filter(call=>call.api==='launchBehavior'&&call.action==='status').length===2);
 await run(()=>window.qaLaunch.failure='launch-result');await click('#launch-startMinimized');
 await check('Rejected launch save restores prior checked state and explains failure',()=>document.querySelector('#launch-startMinimized').checked&&!document.querySelector('#launch-startMinimized').disabled&&document.querySelector('#launch-startMinimized-status').textContent.includes('Could not save')&&window.qaLaunch.startMinimized);
 await capture('launch-options-save-error',1000,900);
 await run(()=>window.qaLaunch.failure='launch-throw');await click('#launch-openLiveTrackerOnSession');
 await check('Thrown session save error restores prior state and leaves controls usable',()=>document.querySelector('#launch-openLiveTrackerOnSession').checked&&document.querySelector('#launch-openLiveTrackerOnSession-status').textContent.includes('Could not save')&&[...document.querySelectorAll('.startup-setting input')].every(input=>!input.disabled));
 await run(()=>window.qaLaunch.failure='startup');await click('#launch-at-login');
 await check('Windows startup failure preserves all three saved states',()=>document.querySelectorAll('.startup-setting input:checked').length===3&&document.querySelector('#launch-at-login-status').textContent.includes('Could not save'));
 await run(async games=>{window.qaLaunch.failure=null;const {mountSettings}=await import('/app-settings.js');mountSettings(games);const select=document.querySelector('#text-size-select');select.value='175';select.dispatchEvent(new Event('change',{bubbles:true}));},data.games);await pause(150);
 await check('Large text check actually applies the shared 175 percent preference',()=>document.documentElement.dataset.textSize==='175');
 for(const [width,height]of [[1920,1080],[1000,900]]){
  await run(()=>document.querySelector('#startup-game').closest('.panel').scrollIntoView({block:'center'}));
  await capture('launch-options-text-175',width,height);
  await check('Large-text launch labels and help do not collide at '+width,()=>[...document.querySelectorAll('.startup-setting')].every(row=>{const label=row.querySelector('label').getBoundingClientRect(),input=row.querySelector('input').getBoundingClientRect(),text=row.querySelector('span').getBoundingClientRect(),help=row.querySelector('p').getBoundingClientRect();return text.left>=input.right+8&&(row.querySelector('p').hidden||help.top>=label.bottom)&&text.right<=innerWidth+1&&row.scrollWidth<=row.clientWidth+1;}));
 }
 await run(async games=>{const select=document.querySelector('#text-size-select');select.value='100';select.dispatchEvent(new Event('change',{bubbles:true}));window.rift.loginStartup=async()=>({available:false,enabled:false,message:'Available in the installed Windows app. Browser preview does not change startup settings.'});window.rift.launchBehavior=async()=>({available:false,startMinimized:false,openLiveTrackerOnSession:false,message:'Available in the Windows desktop app. Preview does not change launch preferences.'});const {mountSettings}=await import('/app-settings.js');mountSettings(games);},data.games);await pause(120);
 await check('Browser/unavailable state disables all options without writes',()=>[...document.querySelectorAll('.startup-setting input')].every(input=>input.disabled&&!input.checked)&&!document.querySelector('#launch-environment').hidden&&/Windows desktop/.test(document.querySelector('#launch-environment').textContent)&&[...document.querySelectorAll('.startup-setting p')].every(node=>node.hidden));
 await capture('launch-options-browser-unavailable',1920,1080);await capture('launch-options-browser-unavailable',1000,900);
 require('node:fs').writeFileSync(require('node:path').resolve(__dirname,'../.validation-cache/launch-options-report.json'),JSON.stringify({fixture:'Isolated renderer preference mocks; no Electron or Windows startup calls.',flows:report.flows.slice(firstFlow),captures:report.captures.slice(firstCapture),errors:report.errors},null,2));
};
