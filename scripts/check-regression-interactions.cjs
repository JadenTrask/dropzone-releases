'use strict';
// Uses only the harness's isolated browser and mocked desktop APIs.
module.exports=async function({route,run,win,pause,capture,report,data}){
 const check=async(name,fn)=>{const passed=await run(fn);report.flows.push({name,passed});if(!passed)throw Error(name);};
 const click=async selector=>{await run(s=>{const el=document.querySelector(s);if(!el)throw Error('Missing '+s);el.click();},selector);await pause(150);};
 const point=async(fx,fy)=>run(({fx,fy})=>{const r=document.querySelector('#wd-map-canvas').getBoundingClientRect();return{x:r.x+r.width*fx,y:r.y+r.height*fy};},{fx,fy});
 const pointer=async p=>{for(const type of ['mouseMoved','mousePressed','mouseReleased'])await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type,...p,button:type==='mouseMoved'?'none':'left',buttons:type==='mousePressed'?1:0,clickCount:type==='mouseMoved'?0:1});await pause(120);};
 if(route==='wardogs'){
  const p=await point(.5,.5);for(let i=0;i<2;i++)await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseWheel',...p,deltaX:0,deltaY:-200});await pause(400);
  await click('[data-wd-tool="origin"]');await pointer(await point(.48,.52));
  await click('[data-wd-tool="target"]');await pointer(await point(.54,.49));
  await check('Wardogs pointer placement saves gun and target in isolated browser',()=>{const m=JSON.parse(localStorage.getItem('dropzone-wardogs-v1')),p=m.positions[m.map];return !!p.origin&&!!p.target&&!document.querySelector('[data-wd-action="clear-target"]').disabled;});
  await click('[data-wd-tool="ruler"]');await pointer(await point(.42,.60));await pointer(await point(.60,.42));
  await capture('wardogs-placed-target-ruler',1920,1080);
  for(const action of ['clear-ruler','clear-target','undo','fit','sight']){
   const r=await run(a=>{const r=document.querySelector('[data-wd-action="'+a+'"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};},action);
   await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',...r});await capture('wardogs-active-hover-'+action,1920,1080);
  }
  await click('[data-wd-action="clear-target"]');await check('Clear target works after pointer placement',()=>document.querySelector('[data-wd-action="clear-target"]').disabled);
  await click('[data-wd-action="undo"]');await check('Undo restores the placed target',()=>!document.querySelector('[data-wd-action="clear-target"]').disabled);
 }
 if(route==='bo7'){
  await run(()=>{const input=document.querySelector('#cod-search');input.value='VMP';input.dispatchEvent(new Event('input',{bubbles:true}));});await pause(200);
  await run(()=>{const b=[...document.querySelectorAll('[data-cod-build]')].find(b=>b.textContent.includes('VMP'));if(!b)throw Error('Current source has no VMP build');b.click();});await pause(350);
  await check('Current sourced VMP build renders its actual weapon art',()=>document.querySelector('#loadout-detail h2').textContent.includes('VMP')&&document.querySelector('.detail-weapon-image').naturalWidth>0);
  await capture('cod-vmp-rounded-detail',1920,1080);await capture('cod-vmp-rounded-detail',1000,900);
 }
 if(route==='settings'){
  await check('Preview cannot change real Windows startup',()=>document.querySelector('#launch-at-login').disabled&&!document.querySelector('#launch-at-login').checked);
  await capture('settings-startup-preview',1920,1080);
  await run(async()=>{window.qaStartup={enabled:false,calls:[],fail:false};window.rift.loginStartup=async o=>{const q=window.qaStartup;q.calls.push(o);if(q.fail)throw Error('Simulated OS denial');if(o.action==='set')q.enabled=o.enabled;return{available:true,enabled:q.enabled,message:q.enabled?'Enabled at Windows sign-in.':'Disabled. Dropzone will not start with Windows.'};};const {mountSettings}=await import('/app-settings.js');mountSettings();});await pause(100);
  await click('#launch-at-login');await check('Mock startup opt-in succeeds and reads back state',()=>window.qaStartup.enabled&&document.querySelector('#launch-at-login').checked);
  await run(async()=>{const {mountSettings}=await import('/app-settings.js');mountSettings();});await pause(100);
  await check('Remount queries actual startup state rather than local preference',()=>document.querySelector('#launch-at-login').checked&&window.qaStartup.calls.filter(o=>o.action==='status').length===2);
  await capture('settings-startup-enabled-mock',1000,900);
  await run(()=>window.qaStartup.fail=true);await click('#launch-at-login');await check('Failed mock startup save restores prior enabled state',()=>document.querySelector('#launch-at-login').checked&&!document.querySelector('#launch-at-login').disabled&&document.querySelector('#launch-at-login-status').textContent.includes('Could not save'));
  await capture('settings-startup-error-mock',1000,900);
 }
 if(route==='sotf'){
  await click('[data-sotf-preset="all"]');await check('Sons initially renders bounded result rows',()=>document.querySelectorAll('[data-sotf-id]').length===120&&!!document.querySelector('[data-sotf-more]'));
  await click('[data-sotf-more]');await check('Show more adds the next result page',()=>document.querySelectorAll('[data-sotf-id]').length===240);
  const last=await run(async()=>{const {default:d}=await import('/data/sotf/map.json',{with:{type:'json'}});const p=d.locations.at(-1);const input=document.querySelector('#sotf-search');input.value=p.title;input.dispatchEvent(new Event('input',{bubbles:true}));return p.id;});
  const found=await run(id=>!!document.querySelector('[data-sotf-id="'+id+'"]'),last);report.flows.push({name:'Sons search covers locations beyond the initial DOM page',passed:found});if(!found)throw Error('Sons search lost later source locations');await capture('sotf-full-data-search',1000,900);
 }
 if(route==='apex'){
  await run(identity=>{const i=document.querySelector('.apex-player-form input');i.value=identity.name;i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.apex-player-form').requestSubmit();},data.liveApex.profile.identity);await pause(300);
  await capture('apex-profile-softened-replay',1920,1080);await capture('apex-profile-softened-replay',1000,900);
  await run(()=>{window.qaApexResult={status:'sign-in-required',available:false,configured:true};document.querySelector('.apex-player-form').requestSubmit();});await pause(150);await capture('apex-sign-in-recent-readable',1000,900);
  await check('Signed-out recent player remains readable and routes to sign-in',()=>{const row=document.querySelector('[data-apex-uid]');return !row.disabled&&row.hasAttribute('data-apex-sign-in')&&row.textContent.includes('Sign in to view');});
  await run(()=>{window.rift.onRocketLeague=()=>()=>{};window.rift.rocketLeague=async o=>o.action==='account-state'?{enabled:true,user:null}:o.action==='state'?{status:'waiting',settings:{}}:o.action==='coaching'?{suggestions:[]}:{};document.querySelector('[data-apex-uid]').click();});await pause(600);
  await check('Apex sign-in action opens the existing account form',()=>!!document.querySelector('#rl-account-auth'));
  await capture('apex-sign-in-account-destination',1000,900);
 }
};
