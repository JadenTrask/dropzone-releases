import data from './data/sotf/map.json' with {type:'json'};
import {$,e,api,toast} from './shared.js';
import {DEFAULT_LAYERS,validateMap,filterLocations,matchesLocation,normalizePreferences} from './sotf-model.js';
import {ForestMap} from './sotf-map.js';
const KEY='dropzone-sotf-v1';
const layerIcons={poi:'poi',vehicle:'golf-cart',cave:'cave',weapons:'pistol','cave-loot':'utility-crate',attachments:'laser-sight','bunker-hatch':'bunker-hatch',outfits:'outfit','bunker-loot':'utility-case',tools:'shovel',village:'village',resources:'aloe-vera','abandoned-camp':'abandoned-camp',laptop:'laptop',pond:'water',printer:'printer',lake:'water',blueprint:'document',loot:'ammo-case',artifact:'artifact-a',documents:'book'};
const layerIcon=id=>`assets/sotf/icons/${layerIcons[id]||'poi'}.webp`;
const locationIcon=p=>{const type=types.get(p.type);return type?.icon||layerIcon(type?.layers[0]);};
const iconMarkup=(src,color)=>`<span class="sotf-marker-icon" style="border-color:${e(color)}"><img src="${e(src)}" alt="" aria-hidden="true" loading="lazy"></span>`;
let view=null,events=null,prefs,query='',region='all',selected=null,visible=[],types,layers;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{toast('Could not save map preferences on this device.');}}
const color=p=>{const ids=types.get(p.type).layers;return layers.get(ids[0])?.color||'#d8e9e0';};
export function leaveForest(){events?.abort();events=null;view?.destroy();view=null;}
export function mountForest(){
  leaveForest();validateMap(data);types=new Map(data.types.map(t=>[t.id,t]));layers=new Map(data.layers.map(l=>[l.id,l]));let raw;try{raw=JSON.parse(localStorage.getItem(KEY));}catch{}prefs=normalizePreferences(raw,data);query='';region='all';selected=null;
  $('#hub-app').innerHTML=`<main class="sotf-workspace"><aside class="sotf-sidebar"><header><span class="hub-eyebrow">SONS OF THE FOREST</span><h1>Island map</h1><p>${data.locations.length.toLocaleString()} locations · Available offline</p></header><label class="sotf-search"><span>Find an item or location</span><input id="sotf-search" type="search" placeholder="Shovel, keycard, katana…" autocomplete="off"></label><div class="sotf-presets" role="group" aria-label="Map layer presets"><button data-sotf-preset="essentials">Essentials</button><button data-sotf-preset="all">Show all</button><button data-sotf-preset="none">Hide all</button></div><label class="sotf-region"><span>Location</span><select id="sotf-region"><option value="all">Island + underground</option><option value="surface">On the surface</option><option value="underground">Underground items</option></select></label><label class="sotf-hide"><input id="sotf-hide-found" type="checkbox" ${prefs.hideFound?'checked':''}> Hide found locations</label><div class="sotf-sidebar-scroll"><details open id="sotf-legend"><summary>Map key &amp; layers <span>${data.layers.length}</span></summary><div id="sotf-layers"></div></details><details open class="sotf-index"><summary>All items &amp; locations <span id="sotf-index-count"></span></summary><p class="sotf-index-help">Selecting a result reveals it on the map.</p><div id="sotf-results"></div></details></div><footer><button data-sotf-source="${e(data.sourceUrl)}">Map by The Hidden Gaming Lair ↗</button><small>Bundled community map · Source updated ${e(data.sourceUpdatedAt.slice(0,10))}. Game assets © Endnight Games.</small></footer></aside><section class="sotf-map-area" aria-label="Sons of the Forest island map"><canvas id="sotf-canvas" tabindex="0" aria-label="Island map. Drag to pan, scroll or use plus and minus to zoom, arrow keys to pan, zero to fit the island. Use the item list to select a location."></canvas><div class="sotf-map-tools"><button data-sotf-zoom="in" aria-label="Zoom in">+</button><button data-sotf-zoom="out" aria-label="Zoom out">−</button><button data-sotf-zoom="fit">Fit island</button></div><div class="sotf-map-caption"><span id="sotf-count" role="status"></span><small>Drag to pan · Scroll to zoom</small></div><div id="sotf-detail" class="sotf-detail" hidden></div><p id="sotf-map-error" class="sotf-map-error" role="alert" hidden></p></section></main>`;
  events=new AbortController();const signal=events.signal;
  $('#sotf-search').addEventListener('input',ev=>{query=ev.target.value;$('#sotf-legend').open=!query.trim();update();},{signal});
  $('#sotf-region').addEventListener('change',ev=>{region=ev.target.value;update();},{signal});
  $('#sotf-hide-found').addEventListener('change',ev=>{prefs.hideFound=ev.target.checked;persist();update();},{signal});
  $('#hub-app').addEventListener('change',ev=>{const id=ev.target.dataset.sotfLayer;if(!id)return;prefs.layers=ev.target.checked?[...new Set([...prefs.layers,id])]:prefs.layers.filter(x=>x!==id);persist();update();},{signal});
  $('#hub-app').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.dataset.sotfPreset){prefs.layers=b.dataset.sotfPreset==='all'?data.layers.map(l=>l.id):b.dataset.sotfPreset==='none'?[]:[...DEFAULT_LAYERS];persist();renderLayers();update();}
    if(b.dataset.sotfZoom){if(b.dataset.sotfZoom==='fit')view.fit();else view.zoom(b.dataset.sotfZoom==='in'?1.5:1/1.5);}
    if(b.dataset.sotfId)choose(Number(b.dataset.sotfId));
    if(b.hasAttribute('data-sotf-close')){$('#sotf-detail').hidden=true;selected=null;view.selected=null;view.draw();}
    if(b.hasAttribute('data-sotf-found')&&selected){prefs.found=prefs.found.includes(selected.id)?prefs.found.filter(id=>id!==selected.id):[...prefs.found,selected.id];persist();renderDetail();update();}
    if(b.dataset.sotfSource)api.openSource(b.dataset.sotfSource).catch(()=>toast('Could not open the source.'));
  },{signal});
  view=new ForestMap($('#sotf-canvas'),{getLocations:()=>visible,getFound:()=>prefs.found,getColor:color,getIcon:locationIcon,onSelect:choose,onStatus:message=>{const el=$('#sotf-map-error');if(el){el.textContent=message;el.hidden=false;}}});
  renderLayers();update();
}
function renderLayers(){$('#sotf-layers').innerHTML=data.layers.map(l=>`<label><input type="checkbox" data-sotf-layer="${e(l.id)}" ${prefs.layers.includes(l.id)?'checked':''}>${iconMarkup(layerIcon(l.id),l.color)}<span>${e(l.label)}</span><small>${data.locations.filter(p=>types.get(p.type).layers.includes(l.id)).length}</small></label>`).join('');}
function update(){
  visible=filterLocations(data,{...prefs,query,region});$('#sotf-count').textContent=`${visible.length.toLocaleString()} markers shown / ${data.locations.length.toLocaleString()} total`;
  const results=data.locations.filter(p=>matchesLocation(p,query));$('#sotf-index-count').textContent=results.length;
  $('#sotf-results').innerHTML=results.length?results.map(p=>`<button data-sotf-id="${p.id}" class="${p.id===selected?.id?'selected':''}">${iconMarkup(locationIcon(p),color(p))}<span><strong>${e(p.title)}</strong><small>${e(types.get(p.type).label)}${prefs.found.includes(p.id)?' · Found':''}</small></span><span aria-hidden="true">↗</span></button>`).join(''):'<p class="sotf-empty">No locations match. Try another item name.</p>';
  view?.draw();
}
function choose(id){
  const p=data.locations.find(p=>p.id===id);if(!p)return;selected=p;
  const tags=types.get(p.type).layers;if(!tags.some(id=>prefs.layers.includes(id)))prefs.layers.push(tags[0]);
  if(prefs.hideFound&&prefs.found.includes(p.id)){prefs.hideFound=false;$('#sotf-hide-found').checked=false;}
  if(!matchesLocation(p,query)){query='';$('#sotf-search').value='';}
  region='all';$('#sotf-region').value='all';$('#sotf-region').dispatchEvent(new Event('change',{bubbles:true}));persist();renderLayers();update();view.focus(p);renderDetail();
}
function renderDetail(){
  const p=selected;if(!p)return;const type=types.get(p.type),underground=type.layers.some(l=>['cave-loot','bunker-loot'].includes(l))||/-(cave|bunker)$/.test(p.type);
  const source=p.sourceUrl&&/^https:\/\/sonsoftheforest\.wiki\.gg\//.test(p.sourceUrl)?p.sourceUrl:null;
  $('#sotf-detail').hidden=false;$('#sotf-detail').innerHTML=`<button class="sotf-close" data-sotf-close aria-label="Close location details">×</button><span class="hub-eyebrow">${e(type.label)}${underground?' · UNDERGROUND':''}</span><h2>${e(p.title)}</h2>${p.screenshot?`<img src="${e(p.screenshot)}" alt="${e(p.title)} location reference" loading="lazy">`:''}<p>${e(p.description)}</p>${underground?'<p class="sotf-underground">Below the surface. Find the nearby cave or bunker entrance; this marker shows its position on the island.</p>':''}<small>X ${p.x.toFixed(1)} · Y ${p.y.toFixed(1)}</small><div><button class="hub-button" data-sotf-found>${prefs.found.includes(p.id)?'✓ Found — mark unfound':'Mark as found'}</button>${source?`<button class="hub-button secondary" data-sotf-source="${e(source)}">Item guide ↗</button>`:''}</div>`;
}
