'use strict';
// Isolated renderer checks: real pointer input and bundled Wardogs data only.
module.exports=async function({run,win,pause,capture,report,data}){
 const check=async(name,fn,arg)=>{const result=await run(fn,arg),passed=result===true||result?.passed===true;report.flows.push({name,passed,...(typeof result==='object'?result:{})});if(!passed)throw Error(name);};
 const click=async selector=>{await run(s=>document.querySelector(s).click(),selector);await pause(180);};
 const pointer=async point=>{for(const type of ['mouseMoved','mousePressed','mouseReleased'])await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type,...point,button:type==='mouseMoved'?'none':'left',buttons:type==='mousePressed'?1:0,clickCount:type==='mouseMoved'?0:1});await pause(100);};
 await run(weapons=>{const weapon=weapons.find(w=>w.name.includes('SPH-2'));if(weapon){const select=document.querySelector('#wd-weapon');select.value=weapon.id;select.dispatchEvent(new Event('change',{bubbles:true}));}},data.wardogs.weapons);await pause(150);
 await capture('wardogs-overlay-normal',1920,1080);
 await check('Wardogs measurement overlays use clear, pointer-transparent glass',()=>{
  const nodes=[...document.querySelectorAll('.wd-range-legend,.wd-map-scale,.wd-ruler-readout,.wd-cursor-label')],styles=nodes.map(el=>{const s=getComputedStyle(el);return{class:el.className,background:s.backgroundColor,border:s.borderColor,blur:s.backdropFilter,radius:s.borderRadius,pointer:s.pointerEvents};});
  return{passed:nodes.length===4&&styles.every(s=>s.background==='rgba(20, 22, 28, 0.44)'&&s.blur.includes('blur(8px)')&&s.radius==='12px'&&s.pointer==='none'),styles};
 });
 await check('Range legend retains exact source values and range colors',weapons=>{
  const weapon=weapons.find(w=>w.id===document.querySelector('#wd-weapon').value),min=document.querySelector('.wd-ring-min'),max=document.querySelector('.wd-ring-max');
  return{passed:min.querySelector('strong').textContent===weapon.minRange.toLocaleString()+' m'&&max.querySelector('strong').textContent===weapon.maxRange.toLocaleString()+' m'&&getComputedStyle(min,'::before').borderTopColor==='rgb(251, 147, 125)'&&getComputedStyle(max,'::before').borderTopColor==='rgb(242, 212, 113)',minimum:weapon.minRange,maximum:weapon.maxRange};
 },data.wardogs.weapons);
 await click('[data-wd-action="fit"]');
 const points=await run(()=>{const r=document.querySelector('#wd-map-canvas').getBoundingClientRect(),text=document.querySelector('.wd-map-scale span').textContent,metres=parseFloat(text.replaceAll(',',''))*(text.includes('km')?1000:1),length=parseFloat(document.querySelector('.wd-map-scale i').style.width);return{a:{x:r.x+r.width*.5,y:r.y+r.height*.5},b:{x:r.x+r.width*.5+120,y:r.y+r.height*.5},expected:Math.round(metres/length*120).toLocaleString()+' m',scale:text};});
 await click('[data-wd-tool="ruler"]');await pointer(points.a);await pointer(points.b);
 await check('Ruler readout matches the measured map scale for a 120 pixel span',expected=>{const el=document.querySelector('.wd-ruler-readout');return{passed:!el.hidden&&el.textContent===expected,actual:el.textContent,expected};},points.expected);
 await capture('wardogs-overlay-ruler',1920,1080);
 const before=await run(()=>({scale:document.querySelector('.wd-map-scale span').textContent,ruler:document.querySelector('.wd-ruler-readout').textContent}));
 await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseWheel',...points.a,deltaX:0,deltaY:-240});await pause(500);
 await check('Zoom updates scale while preserving ruler distance',before=>({passed:document.querySelector('.wd-map-scale span').textContent!==before.scale&&document.querySelector('.wd-ruler-readout').textContent===before.ruler,scale:document.querySelector('.wd-map-scale span').textContent,ruler:document.querySelector('.wd-ruler-readout').textContent}),before);
 await capture('wardogs-overlay-zoomed-ruler',1920,1080);
 for(const type of ['mousePressed','mouseMoved','mouseReleased'])await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type,button:'right',buttons:type==='mouseReleased'?0:2,clickCount:1,x:points.a.x+(type==='mousePressed'?0:90),y:points.a.y+(type==='mousePressed'?0:60)});await pause(200);
 await check('Pan leaves ruler distance unchanged and readout inside the map',expected=>{const el=document.querySelector('.wd-ruler-readout'),r=el.getBoundingClientRect(),m=document.querySelector('#wd-map-canvas').getBoundingClientRect();return el.textContent===expected&&r.left>=m.left&&r.top>=m.top&&r.right<=m.right&&r.bottom<=m.bottom;},before.ruler);
 await capture('wardogs-overlay-panned',1000,900);
 await run(()=>document.documentElement.dataset.appearance='light');await capture('wardogs-overlay-light',1920,1080);
 await check('Light appearance keeps readable light text over terrain glass',()=>[...document.querySelectorAll('.wd-map-scale span,.wd-range-legend span,.wd-range-legend strong')].every(el=>getComputedStyle(el).color==='rgb(244, 245, 248)'));
 await check('Light appearance keeps terrain toolbar and sight actions legible',()=>[...document.querySelectorAll('.wd-map-toolbar button:not(:disabled),.wd-map-toolbar button:not(:disabled) span,.wd-sight-tab,.wd-sight-tab span')].every(el=>getComputedStyle(el).color==='rgb(244, 245, 248)'));
 await run(()=>document.body.classList.add('app-high-contrast'));await pause(500);await check('High contrast disables translucency for measurement overlays',()=>{const styles=[...document.querySelectorAll('.wd-range-legend,.wd-map-scale,.wd-ruler-readout')].map(el=>{const s=getComputedStyle(el);return{background:s.backgroundColor,backdrop:s.backdropFilter};});return{passed:styles.every(s=>s.background==='rgb(20, 22, 28)'&&s.backdrop==='none'),styles};});
 await run(()=>{document.body.classList.remove('app-high-contrast');document.documentElement.dataset.appearance='dark';});
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-reduced-transparency',value:'reduce'}]});
 await check('Reduced transparency keeps overlays opaque and readable',()=>[...document.querySelectorAll('.wd-range-legend,.wd-map-scale,.wd-ruler-readout,.wd-cursor-label')].every(el=>{const s=getComputedStyle(el);return s.backgroundColor==='rgb(20, 22, 28)'&&s.backdropFilter==='none';}));
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await run(()=>{document.documentElement.dataset.textSize='200';document.documentElement.style.fontSize='32px';});await capture('wardogs-overlay-large-text',1920,1080);
 await check('Large text keeps the scale above the separate range key',()=>{const scale=document.querySelector('.wd-map-scale').getBoundingClientRect(),map=document.querySelector('#wd-map-canvas').getBoundingClientRect(),key=document.querySelector('.wd-range-legend').getBoundingClientRect();return scale.bottom<=map.bottom&&scale.bottom<=key.top&&scale.top>=map.top;});
 await run(()=>{delete document.documentElement.dataset.textSize;document.documentElement.style.removeProperty('font-size');});await pause(150);
 await click('[data-wd-action="clear-ruler"]');await check('Clear ruler removes the active readout',()=>document.querySelector('.wd-ruler-readout').hidden);
 await click('[data-route="home"]');await check('Leaving Wardogs removes map overlays',()=>!document.querySelector('.wd-map-scale')&&!document.querySelector('.wd-ruler-readout'));
 await click('[data-route="wardogs"]');await pause(350);await check('Returning creates exactly one measurement overlay of each type',()=>document.querySelectorAll('.wd-map-scale').length===1&&document.querySelectorAll('.wd-ruler-readout').length===1&&document.querySelector('.wd-ruler-readout').hidden);
};
