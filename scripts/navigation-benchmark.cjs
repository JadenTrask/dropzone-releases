'use strict';
// Invoked by the isolated renderer harness; never uses the desktop profile.
module.exports=async function benchmark({run,win,report,pause}){
 await win.webContents.debugger.sendCommand('Performance.enable');
 await win.webContents.debugger.sendCommand('Network.setBlockedURLs',{urls:['https://*','http://*.com/*']});
 await run(()=>{
  window.qaNavigationPaints=[];
  const start=document.startViewTransition.bind(document);
  document.startViewTransition=callback=>{
   const at=performance.now(),transition=start(callback);
   transition.ready.then(()=>window.qaNavigationPaints.push(performance.now()-at)).catch(()=>{});
   return transition;
  };
 });
 const heap=async()=>{await win.webContents.debugger.sendCommand('HeapProfiler.collectGarbage');return Object.fromEntries((await win.webContents.debugger.sendCommand('Performance.getMetrics')).metrics.filter(x=>['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents'].includes(x.name)).map(x=>[x.name,x.value]));};
 const initial=await heap();
 const resourcesBeforeIdle=await run(()=>performance.getEntriesByType('resource').map(r=>r.name));
 await pause(2200);
 const idleHeap=await heap();
 const idleResources=await run(before=>performance.getEntriesByType('resource').map(r=>r.name).filter(n=>!before.includes(n)).map(n=>new URL(n).pathname),resourcesBeforeIdle);
 const selectors={siege:'.r6-team-member',finals:'.fn-weapon-stage',apex:'.apex-player-form','gray-zone':'#gz-canvas',sotf:'#sotf-canvas','rocket-league':'.rl-page'};
 const samples=[];
 for(const pass of ['cold','warm'])for(const [route,selector] of Object.entries(selectors)){
  await run(()=>document.querySelector('[data-route="home"]').click());await pause(350);
  samples.push(await run(async({route,selector,pass})=>{
   const t=performance.now(),resources=performance.getEntriesByType('resource').length;
   document.querySelector('[data-route="'+route+'"]').click();
   while(!document.querySelector(selector)){if(performance.now()-t>10000)throw Error('Navigation timed out: '+route);await new Promise(r=>setTimeout(r,8));}
   const domMs=performance.now()-t;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   return{route,pass,domMs:Math.round(domMs),visibility:document.visibilityState,contentMs:Math.round(performance.now()-t),newResources:performance.getEntriesByType('resource').length-resources};
  },{route,selector,pass}));await pause(450);
 }
 await run(()=>document.querySelector('[data-route="home"]').click());await pause(350);
 const delayed=await run(async()=>{
  const old=window.rift.apexContent;let providerCompletedMs=null;
  window.rift.apexContent=async(...args)=>{await new Promise(r=>setTimeout(r,600));providerCompletedMs=performance.now()-at;return old(...args);};
  window.qaNavigationPaints=[];const at=performance.now();document.querySelector('[data-route="apex"]').click();
  while(!document.querySelector('.apex-page')){if(performance.now()-at>8000)throw Error('Delayed destination did not mount');await new Promise(r=>setTimeout(r,8));}
  const destinationDomMs=performance.now()-at;
  const firstDestinationFrameMs=await Promise.race([new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(performance.now()-at)))),new Promise(r=>setTimeout(()=>r(null),8000))]);
  while(performance.now()-at<8000&&(providerCompletedMs===null||(!window.qaNavigationPaints.length&&performance.now()-at<2000)))await new Promise(r=>setTimeout(r,25));
  return{destinationDomMs,providerCompletedMs,firstDestinationFrameMs};
 });
 report.flows.push({name:'Navigation timing (isolated Chromium, bundled service fixtures)',samples,delayed,delayedContentTransitionMs:await run(()=>window.qaNavigationPaints),transitionMechanism:process.argv.includes('--before')?'released full-page snapshot':'nonblocking content fade',initialHeap:initial,idleResources,idleHeap,finalHeap:await heap()});
};
