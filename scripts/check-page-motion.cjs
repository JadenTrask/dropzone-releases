'use strict';
// Actual Chromium animation frames with isolated, explicitly simulated services.
const fs=require('node:fs'),path=require('node:path');
module.exports=async({run,win,report,pause,output})=>{
 const before=process.argv.includes('--before'),frameDir=path.join(output,'fade-motion');fs.mkdirSync(frameDir,{recursive:true});
 await win.setContentSize(1440,900);await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:1440,height:900,screenWidth:1440,screenHeight:900,deviceScaleFactor:1,mobile:false});
 await run(()=>{
  window.qaMotion={transitions:[],unhandled:[],freeze:false,animations:[]};
  addEventListener('unhandledrejection',event=>qaMotion.unhandled.push(String(event.reason)));
  const start=document.startViewTransition.bind(document);
  document.startViewTransition=update=>{
   const row={startedAt:performance.now()};qaMotion.transitions.push(row);const transition=start(()=>{row.callbackAt=performance.now();const value=update();row.callbackReturnsPromise=!!value?.then;return value;});
   transition.ready.then(()=>{
    row.readyAt=performance.now();row.animations=document.getAnimations().filter(a=>a.playState!=='finished'&&(/view-transition|dz-workspace/.test(a.animationName||'')||a.transitionProperty?.startsWith('--atmos-')));
    row.timing=row.animations.map(a=>({name:a.animationName,...a.effect.getTiming()}));
    qaMotion.animations=row.animations;if(qaMotion.freeze)for(const animation of row.animations)animation.pause();
   },error=>{row.skipped=String(error);});
   transition.finished.then(()=>row.finishedAt=performance.now(),error=>row.failed=String(error));return transition;
  };
 });
 const waitFor=async(fn,timeout=5000)=>{const started=Date.now();while(!await run(fn)){if(Date.now()-started>timeout)throw Error('Motion check timed out: '+fn.toString());await pause(15);}};
 const check=(name,passed,details={})=>{report.flows.push({name,passed,...details});if(!passed)throw Error(name);};
 const click=selector=>run(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click();},selector);
 const settle=()=>waitFor(()=>qaMotion.transitions.every(t=>t.finishedAt||t.failed)&&!document.getAnimations().some(a=>(/view-transition|dz-workspace/.test(a.animationName||'')||a.transitionProperty?.startsWith('--atmos-'))&&a.playState!=='finished'));
 const go=async id=>{await click('[data-route="'+id+'"]');await waitFor(()=>qaMotion.transitions.every(t=>t.callbackAt||t.skipped));await settle();await pause(120);};
 const frames=async(name,selector)=>{
  const record=!process.argv.includes('--motion-flows-only')&&(before||name.includes('theme-')||name.includes('home-siege'));
  await run(record=>{qaMotion.freeze=record;qaMotion.animations=[];qaMotion.transitions=[];},record);await click(selector);
  if(before){await pause(220);await run(()=>{qaMotion.animations=document.getAnimations().filter(a=>a.effect?.target?.closest?.('#hub-app,#league-app'));for(const a of qaMotion.animations)a.pause();});}
  else await waitFor(()=>qaMotion.transitions.some(t=>t.readyAt));
  const timeline=await run(()=>({transitions:qaMotion.transitions.map(({animations,...t})=>t),animations:qaMotion.animations.map(a=>({name:a.animationName||'content-opacity',timing:a.effect.getTiming(),frames:a.effect.getKeyframes()}))}));
  if(!before)check(name+' uses original 300ms easing and real old/new snapshots',timeline.animations.filter(a=>/fade-(in|out)/.test(a.name)).length===2&&timeline.animations.filter(a=>/fade-(in|out)/.test(a.name)).every(a=>a.timing.duration===300&&a.frames[0].easing==='cubic-bezier(0.4, 0, 0.2, 1)')&&timeline.animations.some(a=>a.name==='dz-workspace-rise'&&a.timing.duration===200&&a.frames[0].transform==='translateY(5px)'),timeline);
  for(const time of record?[0,75,150,225,300]:[]){
   await run(time=>{for(const animation of qaMotion.animations)animation.currentTime=time;},time);
   await run(()=>new Promise(requestAnimationFrame));
   const shot=await win.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true,clip:{x:0,y:0,width:1440,height:900,scale:1},optimizeForSpeed:true});
   const file=name+'-'+time+'ms.png';fs.writeFileSync(path.join(frameDir,file),Buffer.from(shot.data,'base64'));report.captures.push({file:'fade-motion/'+file,time,width:1440,height:900,method:'Actual Chromium snapshot animation paused at its original timeline offset'});
  }
  if(!record)await pause(350);await run(()=>{qaMotion.freeze=false;for(const a of qaMotion.animations)a.finish();qaMotion.animations=[];});await settle();await pause(120);
 };
 await go('siege');await go('home');await frames(before?'released-home-siege':'restored-home-siege','[data-route="siege"]');
 if(before){report.flows.push({name:'Released 2.4.9 comparison',nativeCrossfades:await run(()=>qaMotion.transitions.length)});return;}
 await go('rocket-league');
 const blend=await run(async()=>{const root=document.documentElement,read=()=>getComputedStyle(root).getPropertyValue('--atmos-primary').trim();const blue=read();root.dataset.game='apex';await new Promise(r=>setTimeout(r,95));const mid=read();root.dataset.game='siege';const interrupted=read();await new Promise(r=>setTimeout(r,340));const end=read();root.dataset.game='rocket-league';await new Promise(r=>setTimeout(r,340));return{blue,mid,interrupted,end};});
 check('Theme channels interpolate and retarget from the displayed color',blend.mid!==blend.blue&&blend.mid!=='244 70 87'&&blend.interrupted===blend.mid&&blend.end==='69 150 228',blend);
 await frames('theme-rocket-apex','[data-route="apex"]');await frames('theme-apex-rocket','[data-route="rocket-league"]');
 await go('wardogs');await go('siege');await frames('restored-siege-map','[data-route="wardogs"]');
 await go('apex');await frames('restored-apex-news','[data-game-page="apex-news"]');
 await frames('restored-news-player','[data-game-page="loadouts"]');
 await go('lol');await go('home');await frames('restored-home-league','[data-route="lol"]');
 check('League releases its snapshot root after the shared crossfade',await run(()=>getComputedStyle(document.querySelector('#league-app')).viewTransitionName==='none'&&!document.documentElement.classList.contains('dz-transitioning')));
 await go('home');await go('finals');await go('siege');await run(()=>history.back());await waitFor(()=>new URL(location.href).searchParams.get('game')==='finals'&&!!document.querySelector('.fn-weapon-stage'));await settle();check('Back restores Finals',await run(()=>!!document.querySelector('.fn-weapon-stage')));await run(()=>history.forward());await waitFor(()=>new URL(location.href).searchParams.get('game')==='siege'&&!!document.querySelector('.r6-team-member'));await settle();check('Forward restores Siege',await run(()=>!!document.querySelector('.r6-team-member')));
 await run(()=>{for(const id of ['home','apex','wardogs','finals','siege'])document.querySelector('[data-route="'+id+'"]').click();});await pause(700);
 check('Rapid switches end on the latest workspace',await run(()=>document.documentElement.dataset.game==='siege'&&!!document.querySelector('.r6-team-member')));
 await go('home');await run(()=>{qaMotion.transitions=[];document.querySelector('[data-route="siege"]').click();});await waitFor(()=>qaMotion.transitions.some(t=>t.readyAt));
 const point=await run(()=>{const r=document.querySelector('[data-route="finals"]').getBoundingClientRect();qaMotion.pointerEvents=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,event=>qaMotion.pointerEvents.push({type,target:event.target.outerHTML?.slice(0,240)}),{once:true,capture:true});return{x:r.x+r.width/2,y:r.y+r.height/2};});
 for(const type of ['mousePressed','mouseReleased'])await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type,button:'left',buttons:type==='mousePressed'?1:0,clickCount:1,...point});await pause(650);
 check('Pointer navigation interrupts the visible fade',await run(()=>!!document.querySelector('.fn-weapon-stage')),{point,events:await run(()=>qaMotion.pointerEvents),game:await run(()=>document.documentElement.dataset.game)});
 await go('home');await run(()=>{
  qaMotion.transitions=[];qaMotion.providerFinished=false;qaMotion.originalContent=rift.apexContent;
  rift.apexContent=()=>new Promise(resolve=>{qaMotion.releaseProvider=async()=>{qaMotion.providerFinished=true;resolve(await qaMotion.originalContent());};});
  document.querySelector('[data-route="apex"]').click();
 });
 try{
  await waitFor(()=>qaMotion.transitions.some(t=>t.readyAt));await waitFor(()=>qaMotion.transitions.some(t=>t.finishedAt));
  const loading=await run(()=>({visible:!!document.querySelector('.apex-player-form'),providerFinished:qaMotion.providerFinished,finished:qaMotion.transitions.some(t=>t.finishedAt),callbackReturnsPromise:qaMotion.transitions.some(t=>t.callbackReturnsPromise)}));
  check('A slow provider does not hold paint or the crossfade',loading.visible&&!loading.providerFinished&&loading.finished&&!loading.callbackReturnsPromise,loading);
  await go('siege');await run(()=>qaMotion.releaseProvider());await pause(200);check('Late provider completion cannot replace a newer game',await run(()=>!!document.querySelector('.r6-team-member')&&!document.querySelector('.apex-page')));
 }finally{await run(()=>{qaMotion.releaseProvider?.();rift.apexContent=qaMotion.originalContent;});}
 await go('finals');await run(()=>{qaFeedFailure=true;});await click('[data-game-page="patches"]');await waitFor(()=>!!document.querySelector('.fn-media-alert'));await settle();
 check('An error view remains visible after its fade',await run(()=>document.querySelector('#hub-app').textContent.includes('News could not be reached')));await run(()=>qaFeedFailure=false);
 for(const preference of ['os','app']){
  if(preference==='os')await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});else await run(()=>document.body.classList.add('app-reduced-motion'));
  await run(()=>qaMotion.transitions=[]);await go('home');check(preference+' reduced motion bypasses snapshots',await run(()=>qaMotion.transitions.length===0));
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await run(()=>document.body.classList.remove('app-reduced-motion'));
 }
 await go('gray-zone');check('GZW stays under construction',await run(()=>!!document.querySelector('.construction-hero')&&!document.querySelector('#gz-canvas')));
 await go('sotf');check('Sons canvas still draws after navigation',await run(()=>{const c=document.querySelector('#sotf-canvas');return !!c&&c.width>0&&c.height>0;}));
 await go('settings');await go('updates');await go('home');
 check('No rejected transition promise or duplicate overlay remains',await run(()=>qaMotion.unhandled.length===0&&!document.activeViewTransition&&document.querySelectorAll('[data-page-transition-overlay]').length===0),{unhandled:await run(()=>qaMotion.unhandled)});
 report.motionEvidence={frames:frameDir,method:'Real Chromium crossfade keyframes, original 300ms timing; paused sequentially for deterministic screenshot inspection. Flow checks run at normal speed with actual interrupted browser transitions.'};
};
