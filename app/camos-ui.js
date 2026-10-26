import {$,e,toast} from './shared.js';
// shortcut: requirements are bundled; refresh the catalog when MW4 challenges change.
import catalog from './data/cod/mw4-camos.json' with {type:'json'};
import {CAMO_STORAGE_KEY,emptyProgress,readProgress,toggleCamo,toggleMastery,masteryEarned,earned,weaponCount,camoTotals,camoGate} from './camos-model.js';

const modes={mp:'Multiplayer',dmz:'DMZ'};
let progress,view='weapons',selected,query='',category='all',saveError='',readError=false;
const art=(item,className='')=>item.image?`<img class="${className}" src="${e(item.image)}" alt="" loading="lazy">`:'';
const meter=(value,max)=>`<progress value="${value}" max="${max}" aria-label="${value} of ${max} completed"></progress>`;
const currentWeapon=()=>catalog.weapons.find(w=>w.id===selected)||catalog.weapons[0];

function summary(){
 const totals=camoTotals(catalog,progress);
 return `<div class="camo-summary">${[['Gold',totals.gold,'gold'],['Platinum',totals.platinum,'platinum'],['Harmonic Break',totals.harmonic,'harmonic']].map(([name,count,tier])=>`<div>${art(catalog.weapons[0].camos.find(c=>c.tier===tier))}<span><span>${name}</span><strong>${count}<small> / ${catalog.requiredWeapons}</small></strong>${meter(count,catalog.requiredWeapons)}</span></div>`).join('')}<div class="camo-divergence ${totals.divergence?'is-earned':''}">${art(catalog.divergence)}<span><span>Divergence</span><strong>${totals.divergence?'Unlocked':`${totals.harmonic} / ${catalog.requiredWeapons}`}</strong><small>${totals.divergence?'Mastery available':'Harmonic Break unlocks'}</small></span></div></div>`;
}

function weaponList(){
 const weapons=catalog.weapons.filter(w=>(category==='all'||w.category===category)&&w.name.toLowerCase().includes(query.trim().toLowerCase()));
 let group='';
 return `<p class="camo-list-count">${weapons.length} / ${catalog.weapons.length} weapons</p><div class="camo-weapon-list">${weapons.map(w=>{const count=weaponCount(progress,w),heading=group!==w.category?`<h3 class="camo-list-group">${e(w.category)}</h3>`:'';group=w.category;return `${heading}<button class="camo-weapon ${w.id===selected?'active':''}" data-camo-weapon="${e(w.id)}" aria-pressed="${w.id===selected}">${art(w)}<span><strong>${e(w.name)}</strong><small>${count===w.camos.length?'Complete':count?'In progress':'Not started'}</small></span><b class="camo-weapon-count ${count===w.camos.length?'is-earned':''}">${count}<small>/${w.camos.length}</small></b></button>`;}).join('')||'<p>No weapons match your search.</p>'}</div>`;
}

function camoRow(weapon,camo){
 const checked=earned(progress,weapon,camo.id);
 return `<label class="camo-challenge ${checked?'is-earned':''}" for="camo-${e(weapon.id)}-${e(camo.id)}"><input id="camo-${e(weapon.id)}-${e(camo.id)}" type="checkbox" data-camo-id="${e(camo.id)}" ${checked?'checked':''} ${readError?'disabled':''}>${art(camo)}<div><strong>${e(camo.name)}</strong><dl class="camo-requirements">${Object.entries(modes).map(([id,name])=>`<div><dt>${name}</dt><dd>${e(camo.requirements[id])}</dd></div>`).join('')}</dl><small>${e(camoGate(catalog,progress,weapon,camo))}</small>${camo.warning?`<small class="camo-warning">${e(camo.warning)}</small>`:''}</div></label>`;
}

function weaponDetail(){
 const weapon=currentWeapon(),count=weaponCount(progress,weapon);
 return `<header class="camo-weapon-heading"><div><span class="hub-eyebrow">${e(weapon.category)}</span><h2>${e(weapon.name)}</h2><p>${count} / ${weapon.camos.length} weapon camos recorded</p></div>${art(weapon)}</header>${meter(count,weapon.camos.length)}<section class="camo-stage"><h3>Military <small>8 level unlocks · shared across modes</small></h3><div class="camo-military">${weapon.camos.filter(c=>c.tier==='military').map(c=>`<label class="${earned(progress,weapon,c.id)?'is-earned':''}" for="camo-${e(weapon.id)}-${e(c.id)}">${art(c)}<span><input id="camo-${e(weapon.id)}-${e(c.id)}" data-camo-id="${e(c.id)}" type="checkbox" aria-label="${e(c.name)}: ${e(c.requirements.mp)}" ${earned(progress,weapon,c.id)?'checked':''} ${readError?'disabled':''}>${e(c.name.replace('Military Camo ','Military '))}</span><small>Level ${e(c.level)}</small></label>`).join('')}</div></section><section class="camo-stage"><h3>Special <small>Complete in Multiplayer or DMZ</small></h3>${weapon.camos.filter(c=>c.tier==='special').map(c=>camoRow(weapon,c)).join('')}</section><section class="camo-stage"><h3>Completionist</h3>${weapon.camos.filter(c=>['gold','platinum','harmonic'].includes(c.tier)).map(c=>camoRow(weapon,c)).join('')}</section><p class="camo-help">Checking a Military camo marks earlier Military unlocks. Checking a Completionist camo marks earlier camos on this weapon. Unchecking changes only that camo.</p>`;
}

function masteryDetail(mode){
 const totals=camoTotals(catalog,progress),items=catalog.mastery[mode];
 return `<header class="camo-mastery-heading"><h2>${modes[mode]} mastery</h2><p>Account-wide challenges after Divergence. Unlocks here belong to ${modes[mode]} only.</p><p class="${totals.divergence?'camo-success':'camo-help'}">${totals.divergence?'Divergence recorded. Work through these challenges in order.':`Unlock Divergence first: ${totals.harmonic}/${catalog.requiredWeapons} Harmonic Break camos recorded. Check off mastery camos you have already earned in game.`}</p></header><div class="camo-mastery-list">${items.map((c,index)=>{const checked=masteryEarned(progress,mode,c);return `<label class="camo-mastery ${checked?'is-earned':''}" for="mastery-${e(c.id)}"><input id="mastery-${e(c.id)}" data-camo-mastery="${e(c.id)}" aria-label="${e(c.name)} unlocked" type="checkbox" ${checked?'checked':''} ${readError?'disabled':''}>${art(c)}<span><span class="hub-eyebrow">MASTERY ${index+1}${checked?' · COMPLETE':''}</span><strong>${e(c.name)}</strong><span>${e(c.requirement)}</span><small>Requires ${index?e(items[index-1].name):'Divergence'}</small></span></label>`;}).join('')}</div>`;
}

function renderContent(){
 const listScroll=$('.camo-weapon-list')?.scrollTop||0;
 $('#camo-summary').innerHTML=summary();
 $('#camo-save-status').textContent=saveError||(readError?'Saved progress could not be read. Editing is paused to protect it.':'Saves automatically on this PC');
 $('#camo-save-status').classList.toggle('camo-warning',!!saveError||readError);
 if(view==='weapons'){
  $('#camo-weapons').innerHTML=weaponList();
  $('.camo-weapon-list').scrollTop=listScroll;
  $('#camo-detail').innerHTML=weaponDetail();
 }else $('#camo-mastery').innerHTML=masteryDetail(view);
}

function commit(change){
 if(readError)return;
 const focus=document.activeElement?.id;
 try{
  const next=change(readProgress(localStorage));
  localStorage.setItem(CAMO_STORAGE_KEY,JSON.stringify(next));
  progress=next;saveError='';
 }catch{saveError='Progress was not saved. Check device storage and try again.';toast(saveError);}
 renderContent();
 if(focus)document.getElementById(focus)?.focus({preventScroll:true});
}

function render(){
 const categories=[...new Set(catalog.weapons.map(w=>w.category))];
 $('#hub-app').innerHTML=`<main class="hub-main camos-page"><header class="game-simple-heading"><div><span class="hub-eyebrow">MODERN WARFARE 4</span><h1>Camo tracker</h1><p>One weapon grind. Two ways to play.</p></div><span id="camo-save-status" role="status" aria-live="polite"></span></header><p class="camo-shared-note">Weapon camo unlocks are shared across Multiplayer and DMZ. Complete either requirement.</p><div id="camo-summary"></div><div class="camo-view-tabs" aria-label="Camo tracks">${[['weapons','Weapon camos'],['mp','Multiplayer mastery'],['dmz','DMZ mastery']].map(([id,name])=>`<button class="${view===id?'active':''}" data-camo-view="${id}" aria-pressed="${view===id}">${name}</button>`).join('')}</div>${view==='weapons'?`<div class="camo-layout"><aside class="camo-sidebar" aria-label="Weapons"><label for="camo-search">Find a weapon</label><input id="camo-search" type="search" placeholder="Search weapons…" value="${e(query)}" autocomplete="off"><label for="camo-category">Weapon class</label><select id="camo-category"><option value="all">All weapons</option>${categories.map(name=>`<option value="${e(name)}" ${category===name?'selected':''}>${e(name)}</option>`).join('')}</select><div id="camo-weapons"></div></aside><div id="camo-detail" class="camo-detail"></div></div>`:'<div id="camo-mastery"></div>'}<footer class="camo-footer"><p>Tick off the camos you have unlocked in game. Progress stays on this device; no CODMunity account required.</p><p>Bundled requirements from CODMunity · Checked ${e(catalog.checkedAt.slice(0,10))}</p><div><button class="source-link" data-hub-source="${e(catalog.sourceUrl)}">CODMunity camo tracker ↗</button><button class="source-link" data-hub-source="https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige">Official MW4 camo rules ↗</button></div></footer></main>`;
 const root=$('.camos-page');
 root.onclick=event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.camoView){view=button.dataset.camoView;render();document.querySelector(`[data-camo-view="${view}"]`).focus({preventScroll:true});}
  else if(button.dataset.camoWeapon){selected=button.dataset.camoWeapon;renderContent();document.querySelector(`[data-camo-weapon="${selected}"]`).focus({preventScroll:true});}
 };
 root.oninput=event=>{if(event.target.id==='camo-search'){query=event.target.value;$('#camo-weapons').innerHTML=weaponList();}};
 root.onchange=event=>{
  const input=event.target;
  if(input.id==='camo-category'){category=input.value;$('#camo-weapons').innerHTML=weaponList();}
  else if(input.dataset.camoId)commit(saved=>toggleCamo(saved,currentWeapon(),input.dataset.camoId,input.checked));
  else if(input.dataset.camoMastery){const camo=catalog.mastery[view]?.find(c=>c.id===input.dataset.camoMastery);if(camo)commit(saved=>toggleMastery(saved,view,camo,input.checked));}
 };
 renderContent();
}

export function mountCamos(){
 readError=false;saveError='';
 try{progress=readProgress(localStorage);}catch{progress=emptyProgress();readError=true;}
 selected=selected||catalog.weapons[0].id;
 render();
}
