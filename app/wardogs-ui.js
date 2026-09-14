import {offerWardogsTutorial,startWardogsTutorial,stopWardogsTutorial} from './wardogs-tutorial.js';
import {$,api,e,dateTime,stored,persist,toast,opts} from './shared.js';
import {validPoint,clampPoint,firingSolution,bearingText,parseCoordinates,coordinateText,validateBackup} from './wardogs-model.js';
import {WardogsMap} from './wardogs-map.js';
import {emptyHeights,cleanHeights} from './wardogs-terrain.js';
const histories=new Map(),cameras=new Map();
try{for(const [id,c] of JSON.parse(localStorage.getItem('dropzone-wardogs-cameras')||'[]'))if(['bakurani','ozeti','zestafona'].includes(id)&&[c.x,c.y,c.scale].every(Number.isFinite)&&c.scale>0)cameras.set(id,c);}catch{}
window.addEventListener('beforeunload',()=>{if(view)cameras.set(view.map.id,{...view.camera});try{localStorage.setItem('dropzone-wardogs-cameras',JSON.stringify([...cameras]));}catch{}});
function remember(){const stack=histories.get(memory.map)||[];stack.push(structuredClone(position()));if(stack.length>30)stack.shift();histories.set(memory.map,stack);}
function refreshPlacement(){save();setTool(position().origin?'target':'origin');updateResult();updateTargets();view?.draw();}
const STORAGE='dropzone-wardogs-v1';
let active=false,data=null,view=null,loading=false,error=null,request=0,tool='origin',panel='positions';
let memory={map:'bakurani',positions:{},targets:[],grid:true,ranges:true,landmarks:true};
const currentMap=()=>data?.maps.maps.find(m=>m.id===memory.map);
const position=()=>memory.positions[memory.map]||(memory.positions[memory.map]={origin:null,target:null,weapon:'mortar',arc:'single',lockOrigin:false,heights:emptyHeights()});
const weapon=()=>data?.weapons.find(w=>w.id===position().weapon);
const save=()=>{try{persist(STORAGE,memory);}catch(err){toast(err.message);}};
function readSaved(){
  const raw=stored(STORAGE,null);if(!raw||typeof raw!=='object')return;
  const maps=data.maps.maps;
  if(maps.some(m=>m.id===raw.map))memory.map=raw.map;
  for(const map of maps){
    const p=raw.positions?.[map.id];if(!p||typeof p!=='object')continue;
    memory.positions[map.id]={origin:validPoint(p.origin,map)?p.origin:null,target:validPoint(p.target,map)?p.target:null,weapon:['mortar','spg'].includes(p.weapon)?p.weapon:'mortar',arc:['single','low','high'].includes(p.arc)?p.arc:'single',lockOrigin:validPoint(p.origin,map),heights:cleanHeights(p.heights)};
  }
  for(const field of ['grid','ranges','landmarks'])if(typeof raw[field]==='boolean')memory[field]=raw[field];
  if(Array.isArray(raw.targets)){
    memory.targets=[];
    for(const t of raw.targets.slice(0,200)){try{const clean=validateBackup({schema:1,game:'wardogs',targets:[t]},maps)[0];memory.targets.push({...clean,id:typeof t.id==='string'&&/^[a-zA-Z0-9-]+$/.test(t.id)?t.id:clean.id});}catch{/* Ignore a damaged local record. */}}
  }
}
export function leaveWardogs(){stopWardogsTutorial();if(view&&data)cameras.set(memory.map,{...view.camera});active=false;++request;view?.destroy();view=null;}
export async function mountWardogs(){active=true;loading=true;error=null;data=null;render();await load(false,true);if(active&&data){offerWardogsTutorial();}}
async function load(refresh=false,initial=false){
  const token=++request;loading=true;updateSource();
  try{
    const next=await api.wardogs({refresh});if(token!==request||!active)return;
    if(!Array.isArray(next.weapons)||!next.maps?.maps?.length)throw new Error(next.error||'Calculator data is unavailable.');
    data=next;if(initial){readSaved();tool=position().origin?'target':'origin';render();}
  }catch(err){if(token!==request||!active)return;error=err.message;if(!data)render();else toast(err.message);}
  if(token!==request||!active)return;loading=false;updateSource();updateResult();updateTargets();
}
function setTool(value){
  const p=position();
  if(value==='target'&&!p.origin)value='origin';
  p.lockOrigin=!!p.origin&&value!=='origin';tool=value;
  document.querySelectorAll('[data-wd-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.wdTool===tool);b.setAttribute('aria-pressed',b.dataset.wdTool===tool);if(b.dataset.wdTool==='origin')b.textContent=p.origin?'Move gun':'Place gun';});
  const hint=$('#wd-tool-hint');if(hint)hint.textContent={origin:p.origin?'Next click moves your gun · drag to pan':'1. Click to place gun · drag to pan',target:'Gun locked · click a new target · drag to pan',pan:'Drag to pan · select Place target to aim',ruler:'Click two points to measure distance and bearing'}[tool];
  const lock=$('#wd-lock');if(lock)lock.checked=p.lockOrigin;view?.draw();
}
function setPoint(key,value,commit=true){
  if(!validPoint(value,currentMap())){toast('Choose a point inside the playable map.');return;}
  if(!commit)return;
  remember();const p=position();
  p[key]=clampPoint({x:Math.round(value.x*100)/100,y:Math.round(value.y*100)/100},currentMap());
  p.heights[key]=null;p.heights[key+'Offset']=0;
  refreshPlacement();
  if(key==='target')window.dispatchEvent(new CustomEvent('dropzone-local-target',{detail:{map:memory.map,target:{...p.target}}}));
}
function updateCursorLabel(text,point){
  const footer=$('#wd-cursor'),label=$('#wd-cursor-label');
  if(footer&&footer.textContent!==text)footer.textContent=text;
  if(!label)return;
  label.hidden=!point;
  if(!point)return;
  if(label.textContent!==text)label.textContent=text;
  const frame=label.parentElement,gap=18,edge=8,w=label.offsetWidth,h=label.offsetHeight;
  const x=point.x+gap+w<=frame.clientWidth-edge?point.x+gap:point.x-gap-w;
  const y=point.y+gap+h<=frame.clientHeight-edge?point.y+gap:point.y-gap-h;
  label.style.transform=`translate(${Math.max(edge,Math.min(x,frame.clientWidth-w-edge))}px,${Math.max(edge,Math.min(y,frame.clientHeight-h-edge))}px)`;
}
function coordinateForm(key,title){
  const b=currentMap().bounds,p=position()[key];
  return `<form class="wd-coordinate-form" data-wd-coordinate="${key}"><div class="wd-control-heading"><h3>${title}</h3>${key==='origin'?`<label class="wd-lock"><input type="checkbox" id="wd-lock" ${position().lockOrigin?'checked':''}> Lock pin</label>`:''}</div><div class="wd-coordinate-fields"><label>X<input type="number" name="x" id="wd-${key}-x" step="0.01" min="${b.minX}" max="${b.maxX}" value="${p?p.x.toFixed(2):''}" placeholder="${b.minX.toFixed(2)}" required></label><label>Y<input type="number" name="y" id="wd-${key}-y" step="0.01" min="${b.minY}" max="${b.maxY}" value="${p?p.y.toFixed(2):''}" placeholder="${b.minY.toFixed(2)}" required></label><button class="hub-button secondary" type="submit">Set</button></div><label class="wd-paste-label">Or paste coordinates<input class="wd-paste" data-wd-paste="${key}" placeholder="X100.00 Y80.00" aria-label="Paste ${title.toLowerCase()} coordinates and press Enter"></label></form>`;
}
function render(){
  if(!active)return;if(view)cameras.set(view.map.id,{...view.camera});view?.destroy();view=null;
  if(!data){$('#hub-app').innerHTML=`<main class="hub-main wardogs-page"><div class="library-intro"><div><span class="hub-eyebrow">WARDOGS</span><h1>Artillery calculator</h1></div></div><div class="cod-loading"><h2>${error?'Calculator unavailable':'Loading maps and firing tables…'}</h2>${error?`<p>${e(error)}</p><button class="hub-button" data-wd-action="refresh">Retry</button>`:''}</div></main>`;return;}
  const map=currentMap(),p=position();
  $('#hub-app').innerHTML=`<main class="hub-main wardogs-page wd-fixed"><div class="wd-workspace"><aside class="wd-controls" aria-label="Firing controls"><div class="wd-sidebar-heading"><h1>Artillery calculator</h1><button class="wd-tutorial-button" data-wd-action="tutorial">Tutorial</button></div><div class="wd-selectors"><label>Map<select id="wd-map" aria-label="WARDOGS map">${opts(data.maps.maps.map(m=>[m.id,m.name]),map.id)}</select></label><label>Weapon<select id="wd-weapon" aria-label="WARDOGS weapon">${opts(data.weapons.map(w=>[w.id,w.name]),p.weapon)}</select></label></div><div id="wd-result" class="wd-result" aria-live="polite" aria-atomic="true"></div>

<div class="wd-control-buttons wd-shot-actions"><button class="hub-button" data-wd-action="copy">Copy distance & bearing</button><button class="hub-button secondary" data-wd-action="swap">Swap points</button></div>
<details class="wd-more-controls"><summary>Positions & map options</summary><nav class="wd-panel-tabs" aria-label="Calculator controls">${[['positions','Positions'],['layers','Map options']].map(([id,label])=>`<button data-wd-panel="${id}" class="${panel===id?'active':''}" aria-pressed="${panel===id}">${label}</button>`).join('')}</nav><div class="wd-panel-body"><section data-wd-panel-content="positions" ${panel!=='positions'?'hidden':''}>${coordinateForm('origin','Gun position')}${coordinateForm('target','Target position')}</section>
<section data-wd-panel-content="layers" ${panel!=='layers'?'hidden':''} class="wd-layers"><div class="wd-layer-options">${[['grid','Coordinate grid'],['ranges','Weapon range rings'],['landmarks','Radio tower labels']].map(([id,label])=>`<label><input type="checkbox" data-wd-layer="${id}" ${memory[id]?'checked':''}> ${label}</label>`).join('')}</div><p>Scroll to zoom. Drag to pan. Click Place target to aim, or Move gun to relocate. The gun stays locked between shots.</p><button class="source-link" data-wd-action="clear-ruler">Clear ruler</button><button class="source-link" data-wd-action="clear">Clear gun and target</button></section></div>
</details><div class="wd-sidebar-footer"><button class="hub-button secondary" data-wd-action="targets">Saved targets</button><button class="source-link" data-wd-action="help">Data & help</button></div></aside><section class="wd-map-card" aria-label="Interactive ${e(map.name)} map"><div class="wd-map-toolbar"><div class="wd-tools" role="group" aria-label="Map tool">${[['origin','Place gun'],['target','Place target'],['ruler','Ruler']].map(([id,label])=>`<button data-wd-tool="${id}" class="${tool===id?'active':''}" aria-pressed="${tool===id}">${label}</button>`).join('')}</div><div class="wd-view-tools"><button data-wd-action="zoom-out" aria-label="Zoom map out">−</button><button data-wd-action="zoom-in" aria-label="Zoom map in">+</button><button data-wd-action="fit">Fit map</button><button data-wd-action="frame">Fit gun and target</button><button data-wd-action="clear-target">Clear target</button><button data-wd-action="undo">Undo</button></div></div><div class="wd-map-frame"><canvas id="wd-map-canvas" tabindex="0" aria-label="${e(map.name)} tactical map. Press G for gun, T for target, R for ruler, F to fit; arrow keys pan. Use coordinate forms for precise positions."></canvas><div id="wd-cursor-label" class="wd-cursor-label" hidden aria-hidden="true"></div><div id="wd-tool-hint" class="wd-tool-hint"></div><div id="wd-range-legend" class="wd-range-legend" aria-label="Weapon range ring legend"></div></div><div class="wd-map-footer"><span id="wd-cursor">${e(map.name)} · North is up</span><span id="wd-image-status">Loading map…</span></div><div id="wd-source-status" class="wd-source-status" role="status"></div></section></div><dialog id="wd-target-dialog" class="wd-dialog" aria-label="Saved targets"><form method="dialog" class="wd-dialog-close"><button class="hub-button secondary">Close targets</button></form><section class="wd-targets"><div class="wd-target-heading"><div><span class="hub-eyebrow">SAVED ON THIS PC</span><h2>Targets</h2></div><div class="hub-action-row"><button class="hub-button secondary" data-wd-action="export">Export targets</button><button class="hub-button secondary" data-wd-action="import">Import targets</button><input type="file" id="wd-import-file" accept=".json,application/json" hidden></div></div><form id="wd-save-target" class="wd-save-form"><label>Target name<input name="name" maxlength="80" placeholder="North bridge" required></label><label class="wd-save-origin"><input type="checkbox" name="includeOrigin" checked> Include gun position</label><button class="hub-button" type="submit">Save target</button></form><div id="wd-target-list"></div></section></dialog><dialog id="wd-help-dialog" class="wd-dialog" aria-label="Calculator data and controls"><form method="dialog" class="wd-dialog-close"><button class="hub-button secondary">Close help</button></form><p class="wd-key-help">Map shortcuts: G gun · T target · H pan · R ruler · F fit · arrows pan · + / − zoom. Esc closes this window.</p><section class="wd-method"><h3>Firing data & map sources</h3><p>Distance and compass bearing use the reference map’s coordinate calibration. One coordinate unit is 100 metres; 0.01 is one metre. Coordinates increase east and north.</p><p>Elevation is the game’s HUD MIL value from community firing tables, with interpolation between samples. These are level-ground table solutions. Community collision terrain provides relative height context at 4 m spacing. It does not correct barrel MIL, evaluate trajectories, or prove clearance. Buildings, trees, wind, dispersion and vehicle tilt are not evaluated. Keep the SPH-2 level.</p><p>No shots have been tested in WARDOGS for this update. Verify a short, middle, and long shot for each weapon when the game is available. Save the gun, intended target, displayed MIL, and actual impact coordinates when reporting a miss.</p><p>Firing tables refresh on launch and every 15 minutes. The app checks for changed map calibration; affected maps stop showing elevation solutions until an app update. Map images and the bundled grid are pinned to the same source revision.</p><p>Sight distance is horizontal ground range. Both mortar and SPH-2 use the original flat-ground firing tables; terrain and manual heights do not adjust distance or barrel MIL.</p><p>Bakurani, Ozeti and Zestafona include map tiles and community terrain for offline use. Terrain comes from a pinned community source; its exact game build and absolute altitude reference are unverified. Automatic heights are shown relative to gun ground. Manual heights must share your own reference. Closer zoom can load extra detail online from that same revision. New maps or changed game behavior may require an app update.</p><div class="hub-action-row"><button class="source-link" data-hub-source="https://wardogs-artillery.com/">Calculator reference ↗</button><button class="source-link" data-hub-source="${e(map.referenceUrl)}">${e(map.name)} on MetaForge ↗</button><button class="source-link" data-hub-source="https://github.com/apollyon-sys/wardogs-calculator">Source project & credits ↗</button></div><p>Original source and calibration: Apollyon (MIT). WARDOGS artwork and trademarks belong to their respective owners. Independent companion.</p></section></dialog></main>`;
  view=new WardogsMap($('#wd-map-canvas'),{map,revision:data.maps.revision,getState:()=>({...position(),weapon:weapon(),tool,grid:memory.grid,ranges:memory.ranges,landmarks:memory.landmarks,saved:memory.targets}),onPoint:setPoint,onTool:setTool,onCursor:updateCursorLabel,onImageStatus:text=>{if($('#wd-image-status'))$('#wd-image-status').textContent=text;}});
  if(cameras.has(map.id)){view.camera={...cameras.get(map.id)};view.constrain();view.draw();}setTool(tool);updateSource();updateResult();updateTargets();
}
function updateSource(){
  const el=$('#wd-source-status');if(!active||!el||!data)return;
  const changed=data.mapsChanged.includes(memory.map),offline=!!data.error;
  el.classList.toggle('warning',changed||offline);
  el.innerHTML=`<span>${changed?'Map calibration changed · elevation disabled':offline?'Refresh failed · saved firing tables':'Community tables · in-game accuracy unverified'}</span><span>${loading?'Checking…':'Fetched '+e(dateTime(data.fetchedAt))}</span><button class="source-link" data-wd-action="refresh" ${loading?'disabled':''}>Refresh data</button>`;
}
function result(){return firingSolution(position().origin,position().target,currentMap(),weapon());}
function selectedArc(){const p=position();return p.weapon==='mortar'?'single':p.arc==='low'?'low':'high';}
function updateResult(){
  if(!active||!data||!$('#wd-result'))return;
  const p=position(),w=weapon(),r=result(),changed=data.mapsChanged.includes(memory.map);
  const ready=!!r&&r.range==='in'&&r.azimuth!=null&&!changed;
  const status=!p.origin?'Place your gun on the map.':!p.target?'Now click a target.':changed?'Map calibration changed. Update required.':r.range==='coincident'?'Gun and target are in the same place.':r.range==='short'?'Too close for this weapon.':r.range==='long'?'Out of range for this weapon.':'Use this distance and compass bearing.';
  $('#wd-result').innerHTML=`<div class="wd-distance"><span>DISTANCE</span><strong>${r?Math.round(r.distance).toLocaleString():'—'}<small>${r?' m':''}</small></strong></div><div class="wd-bearing"><span>AZIMUTH</span><strong>${bearingText(r?.azimuth)}</strong></div><p class="wd-shot-status">${e(status)}</p><p class="wd-shot-range">${w.name}: ${w.minRange.toLocaleString()}–${w.maxRange.toLocaleString()} m · 0° is north</p>`;
  $('#wd-result').dataset.state=ready?'ready':p.origin&&p.target?'invalid':'waiting';
  const copy=$('[data-wd-action="copy"]');if(copy)copy.disabled=!ready;
  const swap=$('[data-wd-action="swap"]');if(swap)swap.disabled=!p.origin||!p.target;
  const undo=$('[data-wd-action="undo"]');if(undo)undo.disabled=!histories.get(memory.map)?.length;
  const clear=$('[data-wd-action="clear-target"]');if(clear)clear.disabled=!p.target;
  for(const key of ['origin','target'])for(const axis of ['x','y']){const input=$(`#wd-${key}-${axis}`);if(input&&document.activeElement!==input)input.value=p[key]?p[key][axis].toFixed(2):'';}
  $('#wd-range-legend').innerHTML=`<span class="wd-ring-min">Minimum range <strong>${w.minRange.toLocaleString()} m</strong></span><span class="wd-ring-max">Maximum range <strong>${w.maxRange.toLocaleString()} m</strong></span>${memory.ranges?'':'<small>Rings hidden · enable in Layers</small>'}`;

}
function updateTargets(){
  const el=$('#wd-target-list');if(!active||!data||!el)return;
  const targets=memory.targets.filter(t=>t.map===memory.map);
  el.innerHTML=targets.length?`<div class="wd-target-grid">${targets.map(t=>{const r=firingSolution(position().origin,t.target,currentMap(),weapon());return `<article class="wd-target"><div><h3>${e(t.name)}</h3><p>${coordinateText(t.target)}</p><small>${r?Math.round(r.distance)+' m from current gun · '+bearingText(r.azimuth):'Place your gun to see range'}</small></div><div class="wd-target-actions"><button class="hub-button secondary" data-wd-target="${e(t.id)}">Use target</button>${t.origin?`<button class="source-link" data-wd-restore="${e(t.id)}">Restore shot</button>`:''}<button class="source-link" data-wd-delete="${e(t.id)}" aria-label="Delete saved target ${e(t.name)}">Remove</button></div></article>`;}).join('')}</div>`:`<p class="wd-empty">No saved targets on ${e(currentMap().name)}.</p>`;
}
async function action(name){
  if(name==='tutorial')return startWardogsTutorial();
  if(name==='refresh')return load(true,!data);
  if(!data)return;
  const p=position();
  if(name==='targets')$('#wd-target-dialog').showModal();
  if(name==='help')$('#wd-help-dialog').showModal();
  if(name==='fit')view.fit();
  if(name==='frame')view.frameShot();
  if(name==='zoom-in')view.zoom(1.5);
  if(name==='zoom-out')view.zoom(1/1.5);
  if(name==='clear-ruler'){view.ruler=[];view.draw();}
  if(name==='clear'){remember();p.origin=null;p.target=null;p.heights=emptyHeights();refreshPlacement();}
  if(name==='clear-target'){remember();p.target=null;p.heights.target=null;p.heights.targetOffset=0;refreshPlacement();}
  if(name==='undo'){const previous=histories.get(memory.map)?.pop();if(previous){memory.positions[memory.map]=previous;refreshPlacement();}}
  if(name==='swap'){remember();[p.origin,p.target]=[p.target,p.origin];[p.heights.origin,p.heights.target]=[p.heights.target,p.heights.origin];[p.heights.originOffset,p.heights.targetOffset]=[p.heights.targetOffset,p.heights.originOffset];refreshPlacement();}
  if(name==='copy'){
    const r=result();if(!r||r.azimuth==null)throw new Error('Place your gun and target first.');
    if(r.range!=='in'||data.mapsChanged.includes(memory.map))throw new Error('Choose a target within the supported range on a calibrated map.');
    await api.copy(`Dropzone · WARDOGS · ${currentMap().name}\n${weapon().name}\nDistance: ${Math.round(r.distance)} m\nAzimuth: ${bearingText(r.azimuth)}\nGun: ${coordinateText(p.origin)}\nTarget: ${coordinateText(p.target)}\nHorizontal distance · obstacles not evaluated.`);toast('Distance and bearing copied.');
  }
  if(name==='export'){const r=await api.exportFile('Dropzone-WARDOGS-targets.json',{schema:1,game:'wardogs',exportedAt:new Date().toISOString(),targets:memory.targets});if(!r.canceled)toast('Targets exported.');}
  if(name==='import')$('#wd-import-file').click();
}
document.addEventListener('click',event=>{
  if(!active)return;const b=event.target.closest('button');if(!b)return;
  const run=async()=>{
    if(b.dataset.wdPanel){panel=b.dataset.wdPanel;document.querySelectorAll('[data-wd-panel-content]').forEach(x=>x.hidden=x.dataset.wdPanelContent!==panel);document.querySelectorAll('.wd-panel-tabs button').forEach(x=>{x.classList.toggle('active',x.dataset.wdPanel===panel);x.setAttribute('aria-pressed',x.dataset.wdPanel===panel);});return;}
    if(b.dataset.wdAction)return action(b.dataset.wdAction);
    if(!data)return;
    if(b.dataset.wdTool)setTool(b.dataset.wdTool);
    if(b.dataset.wdArc){position().arc=b.dataset.wdArc;save();updateResult();}
    if(b.dataset.wdTarget||b.dataset.wdRestore){const t=memory.targets.find(t=>t.id===(b.dataset.wdTarget||b.dataset.wdRestore));if(!t)return;remember();position().target={...t.target};position().heights.target=null;position().heights.targetOffset=0;if(b.dataset.wdRestore){position().origin={...t.origin};position().heights.origin=null;position().heights.originOffset=0;position().weapon=t.weapon;position().arc=t.arc;save();render();}else{save();updateResult();}refreshPlacement();$('#wd-target-dialog').close();view.frameShot();}
    if(b.dataset.wdDelete){memory.targets=memory.targets.filter(t=>t.id!==b.dataset.wdDelete);save();updateTargets();view.draw();}
  };run().catch(err=>toast(err.message));
});
document.addEventListener('change',async event=>{
  if(!active||!data)return;const el=event.target;
  try{
    if(el.id==='wd-map'){if(view)cameras.set(memory.map,{...view.camera});memory.map=el.value;save();tool=position().origin?'target':'origin';render();}
    if(el.id==='wd-weapon'){position().weapon=el.value;position().arc=el.value==='mortar'?'single':'high';save();updateResult();updateTargets();view.draw();}
    if(el.id==='wd-lock'){setTool(el.checked?'target':'origin');save();}
    if(el.dataset.wdLayer){memory[el.dataset.wdLayer]=el.checked;save();updateResult();view.draw();}
    if(el.id==='wd-import-file'&&el.files[0]){const f=el.files[0];if(f.size>200000)throw new Error('The targets file is too large.');const targets=validateBackup(JSON.parse(await f.text()),data.maps.maps);if(memory.targets.length+targets.length>200)throw new Error('Keep at most 200 saved targets.');memory.targets=[...memory.targets,...targets];save();updateTargets();view?.draw();toast(`${targets.length} targets imported.`);el.value='';}
  }catch(err){toast(err.message);}
});
document.addEventListener('keydown',event=>{
  const key=event.target.dataset?.wdPaste;if(!active||!key||event.key!=='Enter')return;
  event.preventDefault();const point=parseCoordinates(event.target.value);
  if(!validPoint(point,currentMap())){toast('Enter valid X and Y coordinates within this map.');return;}
  setPoint(key,point);event.target.value='';
});
document.addEventListener('submit',event=>{
  if(!active||!data)return;
  const form=event.target,key=form.dataset.wdCoordinate;
  if(!key&&form.id!=='wd-save-target')return;event.preventDefault();
  try{
    if(key){const point={x:Number(form.elements.x.value),y:Number(form.elements.y.value)};if(!validPoint(point,currentMap()))throw new Error('Coordinates are outside this map.');setPoint(key,point);}
    else {const p=position();if(!p.target)throw new Error('Place a target first.');if(memory.targets.length>=200)throw new Error('You have reached 200 saved targets. Export or remove some before saving more.');const name=form.elements.name.value.trim();if(!name)throw new Error('Name your target.');memory.targets.unshift({id:crypto.randomUUID(),map:memory.map,name,target:{...p.target},origin:form.elements.includeOrigin.checked&&p.origin?{...p.origin}:null,weapon:p.weapon,arc:selectedArc(),savedAt:new Date().toISOString()});save();form.elements.name.value='';updateTargets();view.draw();toast('Target saved.');}
  }catch(err){toast(err.message);}
});
window.addEventListener('tbb-sources-updated',()=>{if(active&&data&&!loading)load();});
