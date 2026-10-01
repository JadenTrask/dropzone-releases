'use strict';
module.exports={
 instrument:async function(){
  const {GzwMap}=await import('/gzw-map.js');
  const paint=GzwMap.prototype.paint;
  window.qaMapFrames=[];
  GzwMap.prototype.paint=function(now){
   this.motion={matches:false};paint.call(this,now);window.qaMap=this;
   if(window.qaMapRecording){const seen=new Set();window.qaMapFrames.push({camera:{...this.camera},zooming:!!this.zoomTarget,cell:this.clusterCell,anchors:this.hitTargets.filter(t=>t.item.type!=='region').flatMap(t=>{const members=t.item.points?.map(p=>p.id).sort()||[t.item.id],id=t.item.id||'cluster:'+members.join('|');if(seen.has(id))return [];seen.add(id);return[{id,members,x:this.world(t.screen).x,y:this.world(t.screen).y}];})});}
  };
 },
 run:async function({run,win,pause,capture,report}){
  await capture('gzw-initial-fit',1920,1080);
  await run(()=>{document.querySelector('[data-gz-preset="all"]').click();window.qaMap.fit();window.qaMapRecording=true;});await pause(300);
  const before=await run(()=>({canvas:document.querySelector('#gz-canvas').id,scale:window.qaMap.camera.scale,ids:window.qaMap.hitTargets.map(t=>t.item.id)}));
  for(let i=0;i<8;i++){
   await run(direction=>{window.qaMap.zoom(direction?1.2:1/1.2,{x:window.qaMap.width*.58,y:window.qaMap.height*.45});},i%2===0);await pause(300);
  }
  await capture('gzw-zoom-symbols',1920,1080);
  // Pan in small increments that used to move points between screen cells.
  await run(()=>{window.qaMap.stop();window.qaMapFrames=[];});
  for(let i=0;i<20;i++){await run(()=>{window.qaMap.camera.x+=2/window.qaMap.camera.scale;window.qaMap.draw();});await pause(25);}
  const stability=await run(()=>{const frames=window.qaMapFrames,byId=new Map(),membership=new Map();let drift=0,changed=0;for(const f of frames)for(const p of f.anchors){const old=byId.get(p.id);if(old)drift=Math.max(drift,Math.hypot(old.x-p.x,old.y-p.y));else byId.set(p.id,p);for(const id of p.members){if(membership.has(id)&&membership.get(id)!==p.id)changed++;membership.set(id,p.id);}}return{frames:frames.length,maxWorldAnchorDrift:drift,clusterMembershipChangesDuringPan:changed};});
  report.flows.push({name:'GZW repeated animated zoom and pan stability',before,...stability});
  if(stability.maxWorldAnchorDrift>1e-7)report.errors.push('Marker anchor moved relative to world coordinates');
  if(!process.argv.includes('--before')&&stability.clusterMembershipChangesDuringPan>0)report.errors.push('Cluster membership changed during pan');
  await run(()=>{window.qaMapRecording=false;document.querySelector('[data-gz-preset="essential"]').click();window.qaMap.fit();});await pause(250);await capture('gzw-essential-symbols',1920,1080);
  if(!process.argv.includes('--before')){
   const rect=await run(()=>{const r=document.querySelector('#gz-canvas').getBoundingClientRect();return{x:r.x+r.width*.55,y:r.y+r.height*.6};});
   for(let n=0;n<5;n++){await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseWheel',deltaX:0,deltaY:-160,...rect});await pause(240);}
   await capture('gzw-category-symbols-zoomed',1920,1080);
   // Exercise label hysteresis around the threshold where labels used to pop.
   const labels=await run(async()=>{const m=window.qaMap,fit=m.fitScale,states=[];m.stop();m.camera.scale=fit*2.1;m.draw();await new Promise(requestAnimationFrame);for(const ratio of [1.9,1.75,1.9,1.75]){m.camera.scale=fit*ratio;m.draw();await new Promise(requestAnimationFrame);states.push(m.showLzNames);}m.camera.scale=fit*1.4;m.draw();await new Promise(requestAnimationFrame);return{states,hiddenBelowThreshold:!m.showLzNames};});
   report.flows.push({name:'LZ labels retain visibility within zoom hysteresis band',...labels,passed:labels.states.every(Boolean)&&labels.hiddenBelowThreshold});
   await run(()=>{const s=document.querySelector('#gz-search');s.value='Juliett 4';s.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#gz-search').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));});await pause(400);
   for(const [w,h] of [[1000,900],[2560,1440],[3840,2160],[1920,1080]])await capture('gzw-selected-lz-resize',w,h);
   const selected=await run(()=>{const m=window.qaMap,s=m.getState();return{selected:s.selected,labels:m.lzLabels.length,canvasConnected:m.canvas.isConnected,inspectorOpen:!document.querySelector('#gz-detail').hidden};});report.flows.push({name:'Selected LZ and inspector survive all viewport resizes',...selected,passed:!!selected.selected&&selected.labels>0&&selected.canvasConnected&&selected.inspectorOpen});
   await run(()=>document.querySelector('[data-gz-tab="missions"]').click());await pause(150);
   const mission=await run(()=>{const r=document.querySelector('[data-gz-mission]').getBoundingClientRect();return{x:r.x+30,y:r.y+r.height/2};});await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',...mission});await capture('gzw-mission-hover-final',1920,1080);
  }
 }
};
