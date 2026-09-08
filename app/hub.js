import {mountForest,leaveForest} from './sotf-ui.js';
import {APP_VERSION} from './version.js';
import {startAppUpdates,mountAppUpdates} from './app-updates-ui.js';
import {startLeague} from './app.js';
import {escapeHtml as e} from './engine.js';
import {api} from './shared.js';
import {eligibleSavedBuild} from './ranked-policy.js';
import weaponImages from './data/cod/weapon-images.json' with {type:'json'};
import {mountFinals,leaveFinals} from './finals-ui.js';
import {mountWatch,leaveWatch} from './watch-ui.js';
import {mountSources,leaveSources,startUpdatePolling} from './updates-ui.js';
import {mountPatches,leavePatches} from './patches-ui.js';
import {mountWardogs,leaveWardogs} from './wardogs-ui.js';
import {mountSiege,leaveSiege} from './siege-ui.js';
import {mountWardogsProgression} from './wardogs-progression-ui.js';

const $=s=>document.querySelector(s);
const paths={arrow:'M4 12h16m-6-6 6 6-6 6',back:'M20 12H4m6-6-6 6 6 6',search:'m21 21-5-5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14',bookmark:'M6 3h12v19l-6-4-6 4Z',copy:'M8 8h13v13H8ZM3 16H2V2h14v2',external:'M5 19 19 5M5 5h14v14',refresh:'M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6m-4 9a9 9 0 0 0 15 2l3-3m0 6v-6h-6',shield:'m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6Z',check:'m5 12 4 4L20 5',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 4v6l4 2',target:'M12 2v4m0 12v4M2 12h4m12 0h4M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z',x:'m6 6 12 12M6 18 18 6',grid:'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z'};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.target}"/></svg>`;
function stored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('Could not save. Your device storage may be full.');return false;}}
let timer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),4000);}
const initialSaved=stored('tbb-saved-loadouts',[]);
const state={games:[],route:'home',watchGame:null,mode:'public',data:null,selected:null,query:'',category:'all',playstyle:'all',tier:'top',request:0,loading:false,error:null,snapshot:false,saved:Array.isArray(initialSaved)?initialSaved.filter(s=>s?.build?.id&&Array.isArray(s.build.attachments)&&eligibleSavedBuild(s)):[]};
let navigationRevision=0;
const game=()=>state.games.find(g=>g.id===state.route);
const date=value=>{const d=new Date(value);return value&&Number.isFinite(d.getTime())?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'Not supplied';};
const releaseDate=g=>date(g.releaseDate+'T12:00:00Z');
const releaseStatus=g=>g.status==='under-construction'?'Under construction':g.releaseDate&&g.releaseDate<new Date().toISOString().slice(0,10)?'Builds coming soon':'Coming soon';
const accent=g=>/^#[a-f0-9]{6}$/i.test(g.accent||'')?g.accent:'#bde683';
const options=(values,selected)=>values.map(([value,label])=>`<option value="${e(value)}" ${selected===value?'selected':''}>${e(label)}</option>`).join('');
const saveKey=(g,m,b)=>`${g}:${m}:${b.id}`;
function setTheme(g){document.documentElement.dataset.game=g?.theme||'home';document.documentElement.style.setProperty('--accent','#aac9bb');document.documentElement.style.setProperty('--game-accent',g?accent(g):'#aac9bb');document.querySelectorAll('.app-rail [data-route]').forEach(b=>b.setAttribute('aria-current',b.dataset.route===(g?.parent||g?.id||state.route)?'page':'false'));}
function gameTabs(g,page='loadouts'){const shell=$('#game-tabs');shell.hidden=!g||g.kind==='collection'||g.status==='under-construction';shell.dataset.game=g?.id||'';document.documentElement.dataset.workspace=g?.status==='active'&&['calculator','tacmap','forest'].includes(g?.kind)&&page==='loadouts'?'map':'standard';$('#league-tools').hidden=g?.id!=='lol'||page!=='loadouts';shell.querySelectorAll('[data-game-page]').forEach(b=>{b.classList.toggle('active',b.dataset.gamePage===page);b.setAttribute('aria-current',b.dataset.gamePage===page?'page':'false');if(b.dataset.gamePage==='progression')b.hidden=!g?.pages?.includes(b.dataset.gamePage);if(b.dataset.gamePage==='patches')b.hidden=g?.patches===false;if(b.dataset.gamePage==='videos')b.hidden=g?.videos===false;if(b.dataset.gamePage==='loadouts')b.textContent=g?.kind==='calculator'?'Calculator':g?.kind==='forest'?'Island map':g?.kind==='tacmap'?'Tactical map':g?.kind==='siege'?'Ranked':'Loadouts';});$('#game-tabs-name').textContent=g?.shortName||g?.name||'';}
function location(g,label){const parent=state.games.find(x=>x.id===g?.parent);$('#game-location').innerHTML=(parent?`<button class="location-parent" data-route="${e(parent.id)}">${e(parent.name)}</button><span class="location-divider">/</span>`:'')+`<span>${e(label||g?.name||'Your library')}</span>`;}
function card(g){const tools={cod:'3 games',lol:'Builds & runes',siege:'Ranked strategies',finals:'Loadouts & teams',wardogs:'Artillery & maps',sotf:'Island map',bo7:'Public & ranked',warzone:'Battle royale & ranked'};return `<button class="game-card theme-${e(g.theme)}" data-route="${e(g.id)}" style="--card-accent:${accent(g)}" aria-label="${e(g.name)} — ${g.status==='active'?'Open game':e(releaseStatus(g))}"><span class="game-card-art"><img src="${e(g.cover)}" alt="" loading="lazy"><span class="game-card-shade"></span>${g.status!=='active'?`<span class="game-status">${e(releaseStatus(g))}</span>`:''}</span><span class="game-card-copy"><strong>${e(g.name)}</strong><span class="game-card-cta"><span>${e(tools[g.id]||g.description)}</span>${icon(g.status==='active'?'arrow':'clock')}</span></span></button>`;}
function footer(){return `<footer class="hub-footer"><span>DROPZONE <b>${e(APP_VERSION)}</b></span><span>Independent companion · Your builds stay on your device</span></footer>`;}
function renderHome(){
  const available=state.games.filter(g=>!g.parent&&g.status==='active'),upcoming=state.games.filter(g=>!g.parent&&g.status!=='active');
  $('#hub-app').innerHTML=`<main class="hub-main library-page"><div class="library-intro"><div><span class="hub-eyebrow">YOUR WORKSPACE</span><h1>Game library</h1><p>Choose a game. Everything you need is right here.</p></div><span class="library-count">${available.length} game spaces</span></div><div class="game-grid root-games">${available.map(card).join('')}</div>${upcoming.length?`<section class="upcoming-games" aria-label="Games in development"><h2>In development</h2>${upcoming.map(g=>`<button class="upcoming-game" data-route="${e(g.id)}"><img src="${e(g.cover)}" alt=""><span><strong>${e(g.name)}</strong><small>${e(releaseStatus(g))}</small></span>${icon('arrow')}</button>`).join('')}</section>`:''}${footer()}</main>`;
}
function renderRail(){ $('#rail-games').innerHTML=state.games.filter(g=>!g.parent).sort((a,b)=>(a.status==='active'?0:1)-(b.status==='active'?0:1)).map(g=>`<button class="rail-link rail-game ${g.status!=='active'?'rail-game-upcoming':''}" data-route="${e(g.id)}" aria-label="${e(g.name)}${g.status!=='active'?' · '+e(releaseStatus(g)):''}" title="${e(g.name)}${g.status!=='active'?' · '+e(releaseStatus(g)):''}"><img src="${e(g.cover)}" alt=""><span>${e(g.name)}</span>${g.status!=='active'?'<span class="rail-soon" aria-label="In development">Soon</span>':''}</button>`).join(''); }
function renderCollection(g){
  const children=state.games.filter(x=>x.parent===g.id);
  $('#hub-app').innerHTML=`<main class="hub-main library-page collection-page"><div class="library-intro"><div><span class="hub-eyebrow">GAME COLLECTION</span><h1>${e(g.name)}</h1><p>Loadouts, patch notes, and competitive videos.</p></div><span class="library-count">${children.length} titles</span></div><div class="game-grid collection-games">${children.map(card).join('')}</div><div class="collection-note">${icon('target')}<p>${g.id==='cod'?'Black Ops 7 and Warzone each have their own builds, modes, and attachment sets.':e(g.description)}</p></div>${footer()}</main>`;
}
function renderUnderConstruction(g){
  $('#hub-app').innerHTML=`<main class="hub-main"><section class="release-hero construction-hero"><img src="${e(g.cover)}" alt=""><div class="release-shade"></div><div><span class="hub-eyebrow">UNDER CONSTRUCTION</span><h1>${e(g.name)}</h1><p>Under construction.</p><div class="hub-action-row"><button class="hub-button secondary" data-route="home">Back to games</button></div></div></section></main>`;
}
function renderComingSoon(g){
  $('#hub-app').innerHTML=`<main class="hub-main"><section class="release-hero"><img src="${e(g.cover)}" alt="${e(g.name)} official artwork"><div class="release-shade"></div><div><span class="hub-eyebrow">${e(releaseStatus(g).toUpperCase())}</span><h1>${e(g.name)}</h1><p class="release-date">${releaseDate(g)}</p><p>Build support will be added in a future app update.</p><div class="hub-action-row"><button class="hub-button" data-hub-source="${e(g.releaseSource)}">Official announcement ${icon('external')}</button><button class="hub-button secondary" data-route="${e(g.parent||'home')}">Back to games</button></div><small>Announcement last checked ${date(g.releaseVerifiedAt)}.${g.releaseError?" Automatic refresh failed; verify the date in the official announcement.":""}</small></div></section>${footer()}</main>`;
}
async function route(id,watchGame=null,initialView=null){
  const navigation=++navigationRevision;
  leaveFinals();leaveWatch();leaveSources();leavePatches();leaveWardogs();leaveSiege();leaveForest();
  if(id==='progression'){const target=state.games.find(g=>g.id===(watchGame||state.watchGame));if(!target?.pages?.includes(id))return;state.watchGame=target.id;}
  if(id==='watch'||id==='patches'){state.watchGame=watchGame||game()?.id||state.watchGame;if(!(id==='watch'?['lol','bo7','warzone','finals','mw4','siege']:['lol','bo7','warzone','finals','mw4','wardogs','siege']).includes(state.watchGame))return;}
  ++state.request;state.route=id;state.data=null;state.error=null;state.snapshot=false;
  const g=['watch','patches','progression'].includes(id)?state.games.find(g=>g.id===state.watchGame):game();setTheme(g);gameTabs(g,id==='watch'?'videos':['patches','progression'].includes(id)?id:'loadouts');$('#league-app').hidden=id!=='lol';$('#hub-app').hidden=id==='lol';
  location(g,id==='saved'?'Saved loadouts':id==='watch'?g.name+' / Videos':id==='patches'?g.name+' / Patch notes':id==='updates'?'App updates':id==='sources'?'Sources':null);
  document.querySelectorAll('.global-tools [data-route]').forEach(b=>b.setAttribute('aria-current',b.dataset.route===id?'page':'false'));
  $('.font-menu').open=false;
  if(id==='lol'){await startLeague(initialView);return;}
  if(id==='home')renderHome();else if(id==='watch')await mountWatch(state.watchGame);else if(id==='patches')await mountPatches(g);else if(id==='progression')mountWardogsProgression();else if(id==='updates')mountAppUpdates();else if(id==='sources')mountSources();else if(id==='saved')renderSaved();else if(!g){state.route='home';renderHome();}else if(g.status==='under-construction')renderUnderConstruction(g);else if(g.status!=='active')renderComingSoon(g);else if(g.kind==='collection')renderCollection(g);else if(g.kind==='finals')await mountFinals(initialView);else if(g.kind==='calculator')await mountWardogs();else if(g.kind==='siege')await mountSiege();else if(g.kind==='forest')mountForest();else{
    state.mode=stored('tbb-mode-'+g.id,g.modes[0]?.id);if(!g.modes.some(m=>m.id===state.mode))state.mode=g.modes[0]?.id;
    resetFilters();await loadBuilds();
  }
  if(navigation===navigationRevision)$('.hub-main')?.scrollTo({top:0});
}
function resetFilters(){state.query='';state.category='all';state.playstyle='all';state.tier='top';state.selected=null;}
async function loadBuilds(refresh=false){
  const g=game();if(!g)return;
  const request=++state.request;state.loading=true;state.error=null;state.snapshot=false;renderArsenal();
  try{
    const data=await api.loadouts({game:g.id,mode:state.mode,refresh});if(request!==state.request)return;
    if(!Array.isArray(data.builds)||!data.builds.length)throw new Error(data.error||'No complete loadouts are available.');
    if(data.game!==g.id||data.mode!==state.mode)throw new Error('The selected game mode did not match the response.');
    state.data=data;if(!data.builds.some(b=>b.id===state.selected))state.selected=data.builds[0].id;
  }catch(error){if(request!==state.request)return;state.error=error.message;}
  if(request!==state.request)return;state.loading=false;renderArsenal();
}
function filtered(){return (state.data?.builds||[]).filter(b=>(state.tier==='all'||(state.tier==='top'?b.tierRank<=1:String(b.tierRank)===state.tier))&&(state.category==='all'||b.category===state.category)&&(state.playstyle==='all'||b.playstyle===state.playstyle)&&(`${b.weapon} ${b.category} ${b.playstyle}`.toLowerCase().includes(state.query.toLowerCase())));}
function grouped(list){const groups=new Map();for(const b of list){const key=b.weapon+'|'+b.playstyle;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(b);}return [...groups.values()];}
function weaponImage(b,cls=''){return b.image?`<img class="${cls}" src="assets/weapons/${e(b.asset)}.webp" data-remote="${e(b.image)}" data-fallback="${e(weaponImages[(b.weaponGame||'')+'|'+b.weapon]||'')}" alt="${e(b.weapon)}" loading="lazy">`:`<div class="weapon-placeholder ${cls}">${icon('target')}</div>`;}
function results(){
  const groups=grouped(filtered());const selected=state.data?.builds.find(b=>b.id===state.selected);
  return groups.map(group=>{const b=group[0];const active=selected?.weapon===b.weapon&&selected?.playstyle===b.playstyle;return `<button class="weapon-row ${active?'selected':''}" data-cod-build="${e(b.id)}"><span class="weapon-row-top"><span class="tier-tag tier-${b.tierRank}">${e(b.tier)}</span><span>${group.length>1?group.length+' variants':b.attachmentCount+' attachments'}</span></span>${weaponImage(b)}<span class="weapon-row-title"><strong>${e(b.weapon)}</strong>${icon('arrow')}</span><span class="weapon-row-meta">${e(b.category)} · ${e(b.playstyle)}</span></button>`;}).join('')||`<div class="cod-empty"><h2>No matching builds.</h2><p>Try another weapon or clear your filters.</p><button class="hub-button secondary" data-hub-action="reset-filters">Clear filters</button></div>`;
}
function status(){
  const data=state.data;if(!data)return '';
  const old=data.sourceUpdatedAt&&Date.now()-Date.parse(data.sourceUpdatedAt)>30*86400000;
  let message='';
  if(state.snapshot)message='Saved loadout snapshot. Refresh to check the provider’s latest recommendations.';
  else if(data.cacheState==='offline')message='Live refresh failed. Showing the saved feed from '+date(data.fetchedAt)+'.';
  if(old)message+=(message?' ':'')+'This source was last changed '+date(data.sourceUpdatedAt)+'. Check the current playlist restrictions before using these builds.';
  return message?`<div class="cod-notice">${icon('clock')}<span>${e(message)}</span></div>`:'';
}
function renderArsenal(){
  const g=game();const mode=g.modes.find(m=>m.id===state.mode);const data=state.data;
  const categories=[...new Set(data?.builds.map(b=>b.category)||[])].sort();const styles=[...new Set(data?.builds.map(b=>b.playstyle)||[])];
  const candidates=filtered();if(!candidates.some(b=>b.id===state.selected))state.selected=candidates[0]?.id||null;
  $('#hub-app').innerHTML=`<main class="hub-main arsenal-page"><div class="arsenal-heading"><div><span class="hub-eyebrow">${e(g.name.toUpperCase())} // ${e(mode.name.toUpperCase())}</span><h1>Weapon loadouts</h1><p>${state.mode==='ranked'?'Attachment sets from CODMunity’s ranked feed.':'CODMunity recommendations, sorted by source tier.'}</p></div><button class="hub-button secondary" data-hub-action="refresh" ${state.loading?'disabled':''}>${icon('refresh')}${state.loading?'Checking source…':'Refresh builds'}</button></div><div class="playlist-bar"><div class="playlist-tabs" role="group" aria-label="Game mode">${g.modes.map(m=>`<button data-cod-mode="${m.id}" class="${m.id===state.mode?'active':''}" aria-pressed="${m.id===state.mode}">${icon(m.id==='ranked'?'shield':'target')}${e(m.name)}</button>`).join('')}</div><div class="feed-label"><span class="feed-dot"></span>${e(data?.source||g.sourceName||'Build source')}<span>${data?(data.cacheState==='live'?'Just checked':data.cacheState==='bundled'?'Bundled feed':data.cacheState==='offline'?'Offline cache':'Cached feed'):'Loading feed'}</span></div></div>${status()}${data?.eligibility?'<p class="ranked-pool-note">Ranked primary weapons: M15 Mod 0 · MPC-25</p>':''}${state.error?`<div class="cod-notice error">${icon('x')}<span>${e(state.error)}</span><button data-hub-action="refresh">Try again</button></div>`:''}${!data?`<div class="cod-loading">${icon('refresh')}<h2>${state.loading?'Loading builds…':'The feed is unavailable.'}</h2><p>${state.loading?'Getting complete attachment sets for this mode.':'Try refreshing when your connection is available.'}</p></div>`:`<div class="arsenal-filters"><div class="cod-search">${icon('search')}<input id="cod-search" type="search" aria-label="Search weapons" placeholder="Search weapons…" value="${e(state.query)}"></div><label><span>WEAPON TYPE</span><select id="cod-category" aria-label="Weapon type">${options([['all','All weapons'],...categories.map(c=>[c,c])],state.category)}</select></label><label><span>PLAYSTYLE</span><select id="cod-playstyle" aria-label="Playstyle">${options([['all','All playstyles'],...styles.map(c=>[c,c])],state.playstyle)}</select></label><label><span>SOURCE TIER</span><select id="cod-tier" aria-label="Source tier">${options([['top','Top meta picks'],['all','All builds'],['0','Absolute meta'],['1','Meta'],['2','Contenders']],state.tier)}</select></label></div><div class="arsenal-layout"><aside class="weapon-browser"><div class="weapon-list-title"><strong>WEAPONS</strong><span id="result-count">${grouped(candidates).length} setups</span></div><div id="loadout-results" class="weapon-results">${results()}</div></aside><section id="loadout-detail" class="loadout-detail">${detail()}</section></div><div class="source-disclosure"><strong>About these recommendations</strong><p>${e(data.methodology)} Updated ${date(data.sourceUpdatedAt)} · Checked ${date(data.fetchedAt)}.${data.eligibility?' Weapon pool reviewed '+date(data.eligibility.reviewedAt)+'. Attachment sets refresh automatically; weapon-pool changes require an app update.':''}</p><button data-hub-source="${e(data.sourceUrl)}">View this game mode on ${e(data.source)} ${icon('external')}</button></div>`}${footer()}</main>`;
}
function detail(){
  const b=state.data?.builds.find(b=>b.id===state.selected);if(!b)return '<div class="cod-empty"><h2>Choose a loadout</h2><p>Choose a loadout from the arsenal.</p></div>';
  const g=game(),variants=state.data.builds.filter(x=>x.weapon===b.weapon&&x.playstyle===b.playstyle),saved=state.saved.some(s=>s.key===saveKey(g.id,state.mode,b));
  const stats=[['Aim-down-sights',b.stats?.ads,'ms'],['Sprint-to-fire',b.stats?.sprintToFire,'ms'],['Bullet velocity',b.stats?.velocity,'m/s'],['Magazine',b.stats?.magazine,'rounds']].filter(x=>Number.isFinite(x[1]));
  return `<article class="weapon-build"><div class="weapon-hero"><div class="weapon-title-row"><span class="tier-tag tier-${b.tierRank}">${e(b.tier)}</span><button class="save-loadout ${saved?'saved':''}" data-hub-action="save" aria-label="${saved?'Loadout saved':'Save loadout'}">${icon(saved?'check':'bookmark')}${saved?'Saved':'Save'}</button></div><div class="weapon-title"><span>${e(b.category)} <i>/</i> ${e(b.playstyle)}</span><h2>${e(b.weapon)}</h2></div>${weaponImage(b,'detail-weapon-image')}<div class="weapon-hero-bottom"><span>${b.attachmentCount} attachments</span><span>${b.proFavorite?'CODMunity pro favorite':e(game().modes.find(m=>m.id===state.mode).name)}</span></div></div><div class="weapon-body">${variants.length>1?`<div class="variant-picker"><span>BUILD VARIANT</span><div>${variants.map((v,i)=>`<button data-cod-build="${e(v.id)}" class="${v.id===b.id?'active':''}" aria-pressed="${v.id===b.id}">${v.attachmentCount} attachments${variants.filter(x=>x.attachmentCount===v.attachmentCount).length>1?' · '+(i+1):''}</button>`).join('')}</div></div>`:''}<div class="attachments-heading"><h3>Attachments</h3><span>Exact source attachments</span></div><div class="attachment-grid">${b.attachments.map((a,i)=>`<div class="attachment"><span class="attachment-number">${String(i+1).padStart(2,'0')}</span><div><span>${e(a.slot)}</span><strong>${e(a.name)}</strong>${a.unlock?`<small>${e(a.unlock)}${a.unlockWeapon&&a.unlockWeapon!==b.weapon?' · '+e(a.unlockWeapon):''}</small>`:''}</div></div>`).join('')}</div>${b.attachmentCount>5?'<p class="attachment-note">This is the extended attachment variant. Make sure your in-game class supports this many attachments.</p>':''}<div class="loadout-code"><div><span>IN-GAME LOADOUT CODE</span><code>${e(b.code||'No code supplied')}</code></div><button class="hub-button" data-hub-action="copy-code" ${b.code?'':'disabled'}>${icon('copy')}Copy code</button></div><div class="hub-action-row"><button class="hub-button secondary" data-hub-action="copy-build">${icon('copy')}Copy full build</button><button class="source-link" data-hub-source="${e(b.sourceUrl)}">View source ${icon('external')}</button></div>${stats.length?`<div class="weapon-stats">${stats.map(([label,value,unit])=>`<div><strong>${Math.round(value)}<small>${unit}</small></strong><span>${label}</span></div>`).join('')}</div><p class="stats-note">Source estimates for this attachment set. In-game values may change with balance updates.</p>`:''}<div class="loadout-footnote">${icon('clock')}<span>Build last edited ${date(b.updatedAt)} · Source feed changed ${date(state.data.sourceUpdatedAt)}. Perks and equipment are not included in this attachment feed.</span></div></div></article>`;
}
function updateFiltered(){
  const list=filtered();if(!list.some(b=>b.id===state.selected))state.selected=list[0]?.id||null;
  $('#loadout-results').innerHTML=results();$('#result-count').textContent=grouped(list).length+' setups';$('#loadout-detail').innerHTML=detail();
}
function renderSaved(){
  $('#hub-app').innerHTML=`<main class="hub-main"><div class="library-intro"><div><span class="hub-eyebrow">SAVED LOADOUTS</span><h1>Saved builds</h1><p>Saved weapon builds keep the original attachments and source dates. League saves are in the League workspace; THE FINALS has its own class and team playbook.</p></div></div><div class="hub-action-row saved-game-links"><button class="hub-button secondary" data-saved-workspace="lol">League saved builds</button><button class="hub-button secondary" data-saved-workspace="finals">THE FINALS saved loadouts</button></div><div class="saved-loadouts">${state.saved.map(s=>{const g=state.games.find(g=>g.id===s.game);return `<article class="saved-loadout"><span class="hub-eyebrow">${e(g?.name||s.game)} / ${e(g?.modes?.find(m=>m.id===s.mode)?.name||s.mode)}</span>${weaponImage(s.build)}<h2>${e(s.build.weapon)}</h2><p>${e(s.build.playstyle)} · ${s.build.attachmentCount} attachments</p><small>Saved ${date(s.savedAt)}</small><div class="hub-action-row"><button class="hub-button" data-hub-saved="${e(s.key)}">Open build ${icon('arrow')}</button><button class="source-link" data-hub-delete="${e(s.key)}" aria-label="Remove saved ${e(s.build.weapon)}">Remove</button></div></article>`;}).join('')||'<div class="cod-empty"><h2>No saved weapon builds</h2><p>Choose a Call of Duty loadout and click Save.</p><button class="hub-button" data-route="cod">Find a loadout</button></div>'}</div>${footer()}</main>`;
}
async function action(name){
  if(name==='saved')return route('saved');
  if(name==='refresh')return loadBuilds(true);
  if(name==='reset-filters'){resetFilters();renderArsenal();return;}
  const b=state.data?.builds.find(b=>b.id===state.selected);if(!b)return;
  if(name==='copy-code'){if(b.code){await api.copy(b.code);toast('Loadout code copied. Paste it into the in-game build importer.');}return;}
  if(name==='copy-build'){
    await api.copy(`DROPZONE\n${game().name} — ${game().modes.find(m=>m.id===state.mode).name}\n${b.weapon} | ${b.playstyle} | ${b.tier}\n${b.attachments.map(a=>a.slot+': '+a.name).join('\n')}\n${b.code?'Loadout code: '+b.code+'\n':''}Source: ${b.sourceUrl}\nSource feed changed: ${date(state.data.sourceUpdatedAt)}\nFetched: ${state.data.fetchedAt}`);toast('Full build copied.');return;
  }
  if(name==='save'){
    const key=saveKey(game().id,state.mode,b);const record={key,game:game().id,mode:state.mode,build:structuredClone(b),source:state.data.source,sourceUrl:state.data.sourceUrl,sourceUpdatedAt:state.data.sourceUpdatedAt,fetchedAt:state.data.fetchedAt,savedAt:new Date().toISOString()};
    const next=[record,...state.saved.filter(s=>s.key!==key)].slice(0,60);if(save('tbb-saved-loadouts',next)){state.saved=next;$('#loadout-detail').innerHTML=detail();toast('Loadout saved.');}
  }
}
document.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  try{
    if(b.dataset.gamePage){const id=$('#game-tabs').dataset.game;return await route(b.dataset.gamePage==='videos'?'watch':['patches','progression'].includes(b.dataset.gamePage)?b.dataset.gamePage:id,id);}
    if(b.hasAttribute('data-watch-current'))return await route('watch',game()?.id||state.watchGame);
    if(b.dataset.watchGame)return await route('watch',b.dataset.watchGame);
    if(b.dataset.savedWorkspace)return await route(b.dataset.savedWorkspace,null,'saved');
    if(b.dataset.route)return await route(b.dataset.route);
    if(b.dataset.codMode){state.mode=b.dataset.codMode;save('tbb-mode-'+game().id,state.mode);resetFilters();state.data=null;await loadBuilds();return;}
    if(b.dataset.codBuild){state.selected=b.dataset.codBuild;$('#loadout-results').innerHTML=results();$('#loadout-detail').innerHTML=detail();return;}
    if(b.dataset.hubSource){await api.openSource(b.dataset.hubSource);return;}
    if(b.dataset.hubAction)return await action(b.dataset.hubAction);
    if(b.dataset.hubDelete){const next=state.saved.filter(s=>s.key!==b.dataset.hubDelete);if(save('tbb-saved-loadouts',next)){state.saved=next;renderSaved();}return;}
    if(b.dataset.hubSaved){
      const s=state.saved.find(s=>s.key===b.dataset.hubSaved);if(!s||!eligibleSavedBuild(s))return;++navigationRevision;leaveFinals();leaveWatch();leaveSources();leavePatches();leaveWardogs();leaveSiege();leaveForest();++state.request;state.route=s.game;state.mode=s.mode;setTheme(game());resetFilters();state.tier='all';state.data={builds:[s.build],source:s.source,sourceUrl:s.sourceUrl,sourceUpdatedAt:s.sourceUpdatedAt,fetchedAt:s.fetchedAt,cacheState:'snapshot',methodology:'Saved source attachment set.'};state.selected=s.build.id;state.loading=false;state.error=null;state.snapshot=true;location(game(),game().name+' / Saved loadout');gameTabs(game());renderArsenal();
    }
  }catch(error){toast(error.message||'Something went wrong. Please try again.');}
});
document.addEventListener('input',event=>{if(event.target.id==='cod-search'){state.query=event.target.value;updateFiltered();}});
document.addEventListener('change',event=>{const fields={'cod-category':'category','cod-playstyle':'playstyle','cod-tier':'tier'};const field=fields[event.target.id];if(field){state[field]=event.target.value;updateFiltered();}});
window.addEventListener('tbb-sources-updated',event=>{const row=event.detail?.rows.find(r=>r.id==='mw4-release'),mw4=state.games.find(g=>g.id==='mw4');if(row&&mw4){if(row.releaseDate)mw4.releaseDate=row.releaseDate;if(row.checkedAt)mw4.releaseVerifiedAt=row.checkedAt;mw4.releaseError=row.error;if(state.route==='mw4')renderComingSoon(mw4);else if(state.route==='cod')renderCollection(game());else if(state.route==='home')renderHome();}if(game()?.kind==='loadouts'&&game().status==='active'&&!state.loading&&!state.snapshot)loadBuilds();});
try{state.games=await api.games();if(!Array.isArray(state.games))throw new Error('Game library could not be read.');renderRail();await route('home');startUpdatePolling();startAppUpdates();}catch(error){$('#hub-app').innerHTML=`<main class="hub-main"><div class="cod-empty"><h1>The app could not load</h1><p>${e(error.message)}</p><p>Close and reopen the app with its bundled files together.</p></div></main>`;}
