import {$} from './shared.js';
export const TOUR_KEY='dropzone-wardogs-tutorial-v1';
export const TOUR_STEPS=[
 ['#wd-map-control','Choose your map','Start with the map you are playing. Each map keeps its own gun and target positions.'],
 ['#wd-weapon-control','Choose your weapon','Pick Mortar or SPH-2. Their supported ranges and firing settings differ.'],
 ['[data-wd-tool="origin"]','Place your gun','Click Place gun, then click your position on the map. The calculator switches to target placement automatically. Use Move gun when you relocate.'],
 ['[data-wd-tool="target"]','Pick a target','Click a target on the map. Click another location for the next shot; your gun stays locked.'],
 ['#wd-map-canvas','Move around the map','Drag to pan and scroll to zoom. A drag does not place a marker. Cursor coordinates appear beside your pointer.'],
 ['#wd-result','Read your firing settings','Sight distance is the distance to dial into the weapon when a supported solution is available. Ground range is horizontal distance. Barrel elevation is an angle in MIL, not terrain height. Read the accuracy or unavailable message before firing.'],
 ['#wd-height-summary','Check the height difference','Positive means the target is above your gun; negative means below. Under Shot, choose community terrain, enter manual heights, or explicitly assume flat ground. SPH-2 height correction is experimental; mortar correction needs calibration.'],
 ['.wd-view-tools','Adjust or start another shot','Fit gun and target brings both into view. Clear target keeps your gun. Undo restores your last placement.'],
 ['[data-wd-action="tutorial"]','Ready when you are','This Tutorial button replays the guide whenever you need it. Your positions, map view and firing settings have not been changed.']
];
export function tourPlacement(rect,viewport,card){
 const pad=16,gap=24,w=Math.min(card.width,viewport.width-pad*2),h=card.height;
 const right=rect.right+gap,left=rect.left-gap-w;
 let x,y;
 if(right+w<=viewport.width-pad){x=right;y=rect.top;}
 else if(left>=pad){x=left;y=rect.top;}
 else{x=(viewport.width-w)/2;y=rect.bottom+gap+h<=viewport.height-pad?rect.bottom+gap:rect.top-gap-h;}
 return {x:Math.max(pad,Math.min(x,viewport.width-w-pad)),y:Math.max(pad,Math.min(y,viewport.height-h-pad))};
}
let current=null,autoTimer=null,shown=false;
export function stopWardogsTutorial(){clearTimeout(autoTimer);autoTimer=null;current?.close();}
export function offerWardogsTutorial(){
 let seen=shown;try{seen ||= localStorage.getItem(TOUR_KEY)==='seen';}catch{}
 if(seen)return;
 const ready=()=>{if(!$('.wardogs-page #wd-map-canvas'))return;if($('.dz-intro')){autoTimer=setTimeout(ready,150);return;}startWardogsTutorial();};
 autoTimer=setTimeout(ready,150);
}
export function startWardogsTutorial(){
 stopWardogsTutorial();if(!$('#wd-map-canvas'))return;
 shown=true;try{localStorage.setItem(TOUR_KEY,'seen');}catch{}
 const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='wd-tour';
 dialog.setAttribute('aria-labelledby','wd-tour-title');dialog.setAttribute('aria-describedby','wd-tour-copy');
 dialog.innerHTML='<div class="wd-tour-highlight" aria-hidden="true"></div><svg class="wd-tour-arrow" aria-hidden="true"><defs><marker id="wd-tour-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#c7ead5"/></marker></defs><path class="wd-tour-line" fill="none" stroke="#c7ead5" stroke-width="2" marker-end="url(#wd-tour-arrowhead)"/></svg><section class="wd-tour-card"><div class="wd-tour-top"><span id="wd-tour-progress"></span><button type="button" data-tour="close" aria-label="Close tutorial">×</button></div><h2 id="wd-tour-title"></h2><p id="wd-tour-copy"></p><div class="wd-tour-actions"><button type="button" data-tour="back">Back</button><button type="button" data-tour="next">Next</button></div></section>';
 document.body.append(dialog);let index=0,frame=0,closed=false;
 const card=dialog.querySelector('.wd-tour-card'),highlight=dialog.querySelector('.wd-tour-highlight');
 const place=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  const target=$(TOUR_STEPS[index][0]);if(!target){close();return;}
  const r=target.getBoundingClientRect(),width=innerWidth,height=innerHeight,p=tourPlacement(r,{width,height},{width:card.offsetWidth,height:card.offsetHeight});
  Object.assign(card.style,{left:p.x+'px',top:p.y+'px'});
  const l=Math.max(4,r.left-5),t=Math.max(4,r.top-5),right=Math.min(width-4,r.right+5),bottom=Math.min(height-4,r.bottom+5);
  Object.assign(highlight.style,{left:l+'px',top:t+'px',width:Math.max(0,right-l)+'px',height:Math.max(0,bottom-t)+'px'});
  const cx=p.x+card.offsetWidth/2,cy=p.y+card.offsetHeight/2;
  // Connect the nearest card edge to the nearest highlighted control edge.
  const tx=Math.max(l,Math.min(cx,right)),ty=Math.max(t,Math.min(cy,bottom));
  const sx=Math.max(p.x,Math.min(tx,p.x+card.offsetWidth)),sy=Math.max(p.y,Math.min(ty,p.y+card.offsetHeight));
  dialog.querySelector('.wd-tour-line').setAttribute('d',`M ${sx} ${sy} L ${tx} ${ty}`);
 });};
 const show=()=>{const [,title,copy]=TOUR_STEPS[index];dialog.querySelector('#wd-tour-title').textContent=title;dialog.querySelector('#wd-tour-copy').textContent=copy;dialog.querySelector('#wd-tour-progress').textContent=`WARDOGS GUIDE · ${index+1} / ${TOUR_STEPS.length}`;dialog.querySelector('[data-tour="back"]').disabled=index===0;dialog.querySelector('[data-tour="next"]').textContent=index===TOUR_STEPS.length-1?'Start calculating':'Next';$(TOUR_STEPS[index][0])?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});place();};
 const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(frame);removeEventListener('resize',place);document.removeEventListener('scroll',place,true);dialog.close();dialog.remove();current=null;if(previous?.isConnected)previous.focus({preventScroll:true});};
 current={close};dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{const action=event.target.closest('[data-tour]')?.dataset.tour;if(action==='close')close();else if(action==='back'&&index>0){index--;show();}else if(action==='next'){if(++index===TOUR_STEPS.length)close();else show();}});
 addEventListener('resize',place);document.addEventListener('scroll',place,true);dialog.showModal();show();dialog.querySelector('[data-tour="next"]').focus();
}
