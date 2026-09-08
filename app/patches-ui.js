import {$,api,e,date,dateTime,toast} from './shared.js';
import {patchPresentation} from './patch-model.js';
let active=false,selectedGame=null,request=0,data=null,loading=false,error=null,gameName='';
export function leavePatches(){active=false;++request;}
export async function mountPatches(game){active=true;selectedGame=game.id;gameName=game.name;data=null;await load();}
async function load(refresh=false){
  const token=++request;loading=true;error=null;render();
  try {
    const next=await api.patches({game:selectedGame,refresh});
    if(token!==request||!active)return;
    if(next.game!==selectedGame||!Array.isArray(next.articles)) throw new Error(next.error||'Patch notes could not be loaded.');
    data=next;
  } catch(err) {if(token!==request||!active)return;error=err.message;}
  if(token!==request||!active)return;loading=false;render();
}
function render(){
  if(!active)return;
  const entries=data?.articles||[],patches=entries.filter(a=>/patch/i.test(a.kind));
  const {featured,rest,heading,action}=patchPresentation(entries);
  $('#hub-app').innerHTML=`<main class="hub-main patches-page"><div class="library-intro"><div><span class="hub-eyebrow">${e(gameName.toUpperCase())}</span><h1>Patch notes</h1><p>Official updates. Checked on launch and every 15 minutes.</p></div><button class="hub-button secondary" id="refresh-patches" ${loading?'disabled':''}>${loading?'Checking…':'Refresh notes'}</button></div>
    ${data?`<div class="patch-check ${data.error?'warning':''}" role="status"><span>${data.error?'Refresh failed · showing saved posts':data.cacheState==='bundled'?'Bundled posts':'Official feed checked'}</span><span>Last successful fetch: ${e(dateTime(data.fetchedAt))}</span></div>`:''}
    ${error?`<p class="patch-error" role="alert">${e(error)}</p>`:''}
    ${data?.error?`<p class="patch-error">${e(data.error)}</p>`:''}
    ${selectedGame==='wardogs'&&!patches.length&&data?'<p class="patch-context">No patch-note post was found in the latest 30 developer announcements. Recent news is shown below.</p>':''}
    ${featured?`<article class="patch-feature"><div class="patch-feature-top"><span class="hub-eyebrow">${heading}</span><span class="patch-kind">${e(featured.kind)}</span></div><p class="patch-publisher">${e(data.source)} · ${e(featured.dateLabel)} ${date(featured.publishedAt)}</p><h2>${e(featured.title)}</h2>${featured.excerpt?`<p class="patch-excerpt">${e(featured.excerpt)}</p>`:''}<button class="hub-button" data-hub-source="${e(featured.url)}">${action} ↗</button></article>`:loading?'<div class="cod-loading">Checking the official feed…</div>':'<div class="cod-empty">The official feed is unavailable. Try refreshing.</div>'}
    ${rest.length?`<div class="patch-list-heading"><h2>Recent official posts</h2><span>${rest.length} posts</span></div><div class="patch-list">${rest.map(a=>`<article class="patch-row"><div><span class="patch-meta">${e(a.kind)} · ${e(a.dateLabel)} ${date(a.publishedAt)}</span><h3>${e(a.title)}</h3>${a.excerpt?`<p>${e(a.excerpt)}</p>`:''}</div><button class="hub-button secondary" data-hub-source="${e(a.url)}" aria-label="Read ${e(a.title)}">Read ↗</button></article>`).join('')}</div>`:''}
    <div class="patch-footer"><p>Full notes open on the publisher’s website. These posts do not automatically validate loadouts or firing tables.</p>${data?`<button class="source-link" data-hub-source="${e(data.sourceUrl)}">All official updates ↗</button>`:''}</div></main>`;
}
document.addEventListener('click',event=>{if(active&&event.target.closest('#refresh-patches'))load(true).catch(err=>toast(err.message));});
window.addEventListener('tbb-sources-updated',()=>{if(active&&!loading)load();});
