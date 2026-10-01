// Focused renderer/interaction checks using bundled Siege data and an isolated
// headless browser. No account writes or native app/window lifecycle actions.
module.exports=async({run,win,pause,capture,report,data})=>{
 const check=async(name,fn,...args)=>{const result=await run(fn,...args),passed=typeof result==='boolean'?result:result.passed;report.flows.push({name,passed,...(typeof result==='object'?result:{})});if(!passed)report.errors.push(name);};
 const click=async selector=>{await run(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.focus();el.click();},selector);await pause(100);};
 const key=async key=>{for(const type of ['keyDown','keyUp'])await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type,key,code:key,windowsVirtualKeyCode:({Escape:27,Enter:13,Tab:9})[key],...(type==='keyDown'&&key==='Enter'?{text:'\r'}:{})});await pause(120);};
 for(const [width,height]of [[1920,1080],[2560,1440],[3840,2160],[1000,900],[640,900]]){
  await capture('siege-compact-attack',width,height);
  await check('Siege '+width+' team alignment, legibility and viewport fit',()=>{
   const entries=[...document.querySelectorAll('.r6-team-member')],portraits=entries.map(el=>el.querySelector('.r6-team-art').getBoundingClientRect()),rows=entries.map(el=>el.getBoundingClientRect()),styles=entries.map(el=>getComputedStyle(el));
   const sameRow=rows.every(r=>Math.abs(r.top-rows[0].top)<2),sameBaseline=portraits.every(r=>Math.abs(r.bottom-portraits[0].bottom)<2),desktop=innerWidth>=1000;
   return{passed:entries.length===5&&(!desktop||(sameRow&&sameBaseline&&Math.max(...rows.map(r=>r.bottom))<innerHeight))&&styles.every(s=>parseFloat(s.borderTopWidth)===0),sameRow,sameBaseline,teamBottom:Math.max(...rows.map(r=>r.bottom)),viewport:innerHeight,portraitHeight:portraits[0].height};
  });
 }
 await click('[data-r6-side="defense"]');
 await check('Defense segmented selection preserves keyboard focus and actual five operators',expected=>{
  const ids=[...document.querySelectorAll('[data-open-operator]')].map(el=>el.dataset.openOperator);
  return document.activeElement.matches('[data-r6-side="defense"]')&&document.activeElement.getAttribute('aria-pressed')==='true'&&JSON.stringify(ids)===JSON.stringify(expected)&&!document.querySelector('.r6-round-plan').textContent.includes('Starter operators')&&document.querySelector('.r6-round-plan').textContent.includes('No site-specific defense objective');
 },data.siege.guides.maps.clubhouse.defense.map(p=>p.id));
 await capture('siege-compact-defense',1920,1080);
 await run(()=>{const map=document.querySelector('#r6-map');map.value='oregon';map.dispatchEvent(new Event('change',{bubbles:true}));});
 await check('Map change updates artwork and defense lineup from actual guide',expected=>document.querySelector('.r6-context-image').alt==='Oregon'&&JSON.stringify([...document.querySelectorAll('[data-open-operator]')].map(el=>el.dataset.openOperator))===JSON.stringify(expected),data.siege.guides.maps.oregon.defense.map(p=>p.id));
 await click('[data-r6-side="attack"]');
 await check('Attack objective and every operator purpose match bundled guide',guide=>document.querySelector('.r6-objective').textContent===guide.plan.match(/[^.!?]+[.!?]*/)[0]&&JSON.stringify([...document.querySelectorAll('.r6-team-reason')].map(el=>el.textContent))===JSON.stringify(guide.attack.map(p=>p.reason)),data.siege.guides.maps.oregon);
 await run(()=>{const map=document.querySelector('#r6-map');map.value='calypso-casino';map.dispatchEvent(new Event('change',{bubbles:true}));});
 await capture('siege-compact-provisional',1920,1080);
 await check('Provisional guide keeps explicit coverage and source caveat',()=>document.querySelector('.r6-round-plan').textContent.includes('Provisional guide')&&document.querySelector('.r6-round-plan').textContent.includes('site-specific setup has not been verified'));
 await click('[data-r6-tab="stats"]');
 await check('Major view change keeps focus on its selected tab',()=>document.activeElement.matches('[data-r6-tab="stats"]')&&document.activeElement.getAttribute('aria-pressed')==='true');
 await capture('siege-compact-pick-ban',1920,1080);
 await click('[data-r6-chart]');await capture('siege-compact-chart',1920,1080);await key('Escape');
 await check('Chart Escape closes the dialog and restores chart focus',()=>!document.querySelector('#r6-chart-dialog').open&&document.activeElement.hasAttribute('data-r6-chart'));
 await click('[data-r6-tab="maps"]');
 await run(()=>document.querySelector('[data-open-operator]').focus());await key('Enter');await pause(450);
 await capture('siege-compact-operator-details',1920,1080);
 await check('Keyboard activation opens existing operator details and loadout',()=>!!document.querySelector('.operator-hero')&&!!document.querySelector('.operator-loadout'));
 await run(()=>history.back());await pause(450);
 await check('Back navigation returns to chosen map and side',()=>document.querySelector('#r6-map')?.value==='calypso-casino'&&document.querySelector('[data-r6-side="attack"]')?.getAttribute('aria-pressed')==='true');
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await run(()=>{window.qaSiegeTransitions=0;window.qaSiegeRejections=[];const start=document.startViewTransition.bind(document);document.startViewTransition=callback=>{window.qaSiegeTransitions++;return start(callback);};window.addEventListener('unhandledrejection',event=>window.qaSiegeRejections.push(String(event.reason)));});
 for(const tab of ['stats','maps','stats'])await click('[data-r6-tab="'+tab+'"]');await pause(500);
 await check('Interrupted major view transitions settle on the last tab without rejected promises',()=>window.qaSiegeTransitions===3&&window.qaSiegeRejections.length===0&&document.querySelector('[data-r6-tab="stats"]').getAttribute('aria-pressed')==='true'&&!!document.querySelector('.r6-stats-grid'));
 await click('[data-r6-tab="maps"]');await pause(400);
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await run(()=>{window.qaSiegeRefreshRequested=false;window.rift.siege=async()=>{window.qaSiegeRefreshRequested=true;throw Error('Controlled offline validation');};});await click('[data-r6-refresh]');
 // Await completion, rather than racing the 300ms workspace transition.
 for(let attempt=0;attempt<100;attempt++){if(await run(()=>window.qaSiegeRefreshRequested&&!document.querySelector('[data-r6-refresh]')?.disabled&&document.querySelector('.r6-context-source')?.textContent.includes('Refresh failed')))break;await pause(50);}
 await check('Source refresh error retains five operators and the selected map',()=>document.querySelectorAll('.r6-team-member').length===5&&document.querySelector('#r6-map').value==='calypso-casino'&&document.querySelector('.r6-context-source').textContent.includes('Refresh failed'));
 await capture('siege-compact-saved-data',1000,900);
};
