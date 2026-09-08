import {$,api,e,date,dateTime,toast,opts} from './shared.js';
const names={siege:'Rainbow Six Siege',lol:'League of Legends',bo7:'Black Ops 7',mw4:'Modern Warfare 4',warzone:'Warzone',finals:'THE FINALS'};
let active=false,game=null,data=null,loading=false,error=null,request=0,selected=null,playing=false,tab='matches',archiveId='broadcasts',archive=null,query='',limit=18;
const channels=()=>data?.channels||[];
const channel=()=>channels()[0];
const catalogs=()=>channel()?.catalog?.playlists||[];
const relevant=v=>game!=='warzone'||/warzone|resurgence|wsow/i.test(v.title);
function videos(){
  let list=tab==='latest'?(channel()?.videos||[]).filter(v=>!v.short&&relevant(v)):archiveId==='broadcasts'?[...(channel()?.broadcasts?.videos||[]),...(channel()?.featured||[])]:archive?.videos||[];
  const seen=new Set();return list.filter(v=>{if(seen.has(v.id)||!v.title.toLowerCase().includes(query.toLowerCase()))return false;seen.add(v.id);return true;});
}
export function leaveWatch(){active=false;request++;playing=false;selected=null;}
export async function mountWatch(filter){
  if(!Object.hasOwn(names,filter))throw new Error('Choose a game for videos.');
  active=true;game=filter;data=null;archive=null;selected=null;playing=false;tab='matches';archiveId='broadcasts';query='';limit=18;
  await load(false,true);
}
async function load(refresh=false,first=false){
  const id=++request;loading=true;error=null;render();
  try{const d=await api.media({game,refresh});if(id!==request)return;if(d.game!==game||!Array.isArray(d.channels)||d.channels.some(c=>!c.games.includes(game)))throw new Error(d.error||'Game channel mismatch.');data=d;
    if(first&&['bo7','mw4'].includes(game)){const p=catalogs().find(p=>/^2026 Match VODs$/.test(p.title));if(p)archiveId=p.id;}
    if(archiveId!=='broadcasts'&&!catalogs().some(p=>p.id===archiveId)){archiveId='broadcasts';archive=null;}
    if(archiveId!=='broadcasts'){const result=await api.media({game,playlist:archiveId,refresh:refresh||first});if(id!==request)return;if(result.game!==game||result.playlist?.id!==archiveId)throw new Error(result.error||'Archive unavailable.');archive=result.playlist;}
  }catch(ex){if(id!==request)return;error=ex.message;}
  if(id!==request)return;loading=false;render();
}
async function changeArchive(id){
  archiveId=id;archive=null;selected=null;playing=false;query='';limit=18;
  if(id==='broadcasts'){request++;loading=false;error=null;render();return;}
  const token=++request;loading=true;error=null;render();
  try{const d=await api.media({game,playlist:id,refresh:true});if(token!==request)return;if(d.game!==game||d.playlist?.id!==id)throw new Error(d.error||'Archive unavailable.');archive=d.playlist;}catch(ex){if(token!==request)return;error=ex.message;}
  if(token!==request)return;loading=false;render();
}
function player(){
  if(!selected)return '';
  const embed=selected.playlistOnly?'videoseries?list='+selected.id:e(selected.id)+'?playsinline=1&rel=0'+(selected.playlistId?'&list='+e(selected.playlistId):'');
  return `<section class="watch-player-section" id="watch-player-section"><div class="watch-player-heading"><div><span class="hub-eyebrow">${e(channel().name)}</span><h2>${e(selected.title)}</h2>${selected.publishedAt?`<p>${date(selected.publishedAt)}</p>`:''}</div><button class="source-link" data-close-video>Close ×</button></div><div class="watch-player">${playing?`<iframe src="https://www.youtube-nocookie.com/embed/${embed}" title="${e(selected.title)}" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`:`<button data-start-video class="watch-poster">${selected.thumbnail?`<img src="${e(selected.thumbnail)}" alt="">`:''}<span class="play-circle" aria-hidden="true">▶</span><strong>Load ${selected.playlistOnly?'playlist':'video'}</strong></button>`}</div><div class="watch-player-footer"><span>${selected.playlistOnly?'Use the playlist menu in the player to choose a match.':'If the player is unavailable, open it on YouTube.'}</span><button class="hub-button secondary" data-hub-source="${e(selected.url)}">Open on YouTube ↗</button></div></section>`;
}
function grid(){const list=videos();return `${list.slice(0,limit).map(v=>`<button class="video-card ${selected?.id===v.id?'selected':''}" data-video="${e(v.id)}"><span class="video-thumb"><img src="${e(v.thumbnail)}" alt="" loading="lazy"><span class="video-play" aria-hidden="true">▶</span>${v.duration?`<span class="video-duration">${e(v.duration)}</span>`:''}</span><strong>${e(v.title)}</strong><small>${v.publishedAt?date(v.publishedAt):'Official broadcast'}</small></button>`).join('')||`<div class="cod-empty"><p>${loading?'Loading matches…':'No matching videos. Try another archive or open the channel.'}</p></div>`}`;}
function render(){if(!active)return;const c=channel(),catalog=c?.catalog,streams=c?.broadcasts,p=catalogs().find(p=>p.id===archiveId),list=videos();
  $('#hub-app').innerHTML=`<main class="hub-main watch-page"><div class="library-intro"><div><span class="hub-eyebrow">${e(names[game].toUpperCase())}</span><h1>${game==='bo7'||game==='mw4'?'CDL videos':game==='warzone'?'Warzone videos':game==='lol'?'LoL Esports videos':game==='siege'?'Rainbow Six Esports videos':'THE FINALS videos'}</h1><p>${game==='mw4'?'MW4 competition has not started. Browse earlier CDL seasons below.':'Official broadcasts, match archives, and channel uploads.'}</p></div><button class="hub-button secondary" data-refresh-videos ${loading?'disabled':''}>${loading?'Checking…':'Refresh videos'}</button></div>${c?`<div class="channel-heading"><div><span class="official-channel">OFFICIAL CHANNEL</span><h2>${e(c.name)}</h2></div><div class="hub-action-row"><button class="hub-button secondary" data-hub-source="${e(c.url)}">YouTube channel ↗</button><button class="source-link" data-hub-source="${e(c.officialUrl)}">Esports website ↗</button></div></div>`:''}<div class="playlist-tabs watch-section-tabs" role="group" aria-label="Video sections"><button data-watch-tab="matches" class="${tab==='matches'?'active':''}" aria-pressed="${tab==='matches'}">Matches & events</button><button data-watch-tab="latest" class="${tab==='latest'?'active':''}" aria-pressed="${tab==='latest'}">Latest uploads</button></div>${error?`<div class="cod-notice error">${e(error)}</div>`:''}${player()}<div class="watch-filter">${tab==='matches'?`<label><span>ARCHIVE</span><select id="watch-archive" aria-label="Official event or season archive">${opts([['broadcasts','Recent broadcasts'],...catalogs().map(p=>[p.id,p.title])],archiveId)}</select></label>`:''}<label class="watch-search"><span>FIND A MATCH</span><input type="search" id="watch-search" placeholder="Team, event, or title…" value="${e(query)}"></label>${p?`<button class="hub-button secondary" data-play-playlist>Full playlist · ${e(p.countText)}</button>`:''}</div>${p?`<p class="archive-note">${e(p.title)} · ${archive?.videos?.length||0} matches loaded.${archive?.partial?' The full playlist includes earlier matches.':''}</p>`:''}${[c?.error,catalog?.error,streams?.error,archive?.error].filter(Boolean).length?'<div class="cod-notice">Some checks failed. Showing the last saved results where available.</div>':''}<div id="watch-video-grid" class="video-grid">${grid()}</div><div class="watch-more"><button class="hub-button secondary" data-more-videos ${list.length<=limit?'hidden':''}>Show more</button>${c?`<button class="source-link" data-hub-source="${e(c.url+'/streams')}">All channel broadcasts ↗</button>`:''}</div>${c?`<details class="watch-disclosure"><summary>Source checks</summary><p>Uploads: ${dateTime(c.fetchedAt)} · Archives: ${dateTime(catalog?.fetchedAt)} · Broadcasts: ${dateTime(streams?.fetchedAt)}</p><p>Checks run on launch and every 15 minutes. The channel archive page supplies recent broadcasts and playlists; open a playlist for more matches. YouTube controls playback availability.</p></details>`:''}</main>`;
}
document.addEventListener('click',async event=>{const b=event.target.closest('button');if(!active||!b)return;try{
  if(b.hasAttribute('data-refresh-videos')){playing=false;await load(true);return;}
  if(b.dataset.watchTab){tab=b.dataset.watchTab;query='';limit=18;render();return;}
  if(b.dataset.video){const v=videos().find(v=>v.id===b.dataset.video);if(!v)return;selected=v;playing=false;render();$('#watch-player-section')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(b.hasAttribute('data-play-playlist')){const p=catalogs().find(p=>p.id===archiveId);if(!p)return;selected={...p,playlistOnly:true};playing=false;render();$('#watch-player-section')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(b.hasAttribute('data-start-video')&&selected){playing=true;render();$('#watch-player-section')?.scrollIntoView({block:'start'});return;}
  if(b.hasAttribute('data-close-video')){selected=null;playing=false;render();return;}
  if(b.hasAttribute('data-more-videos')){limit+=18;const scroll=$('.hub-main').scrollTop;render();$('.hub-main').scrollTop=scroll;}
}catch(ex){toast(ex.message);}});
document.addEventListener('change',event=>{if(active&&event.target.id==='watch-archive')changeArchive(event.target.value);});
document.addEventListener('input',event=>{if(!active||event.target.id!=='watch-search')return;query=event.target.value;limit=18;$('#watch-video-grid').innerHTML=grid();$('[data-more-videos]').hidden=videos().length<=limit;});
window.addEventListener('tbb-sources-updated',()=>{if(active&&!loading&&!playing)load();});
