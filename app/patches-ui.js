import {renderNewsPage} from './news-view.js';
import {sourceStatus} from './source-status.js';
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
    if(next.game!==selectedGame||!Array.isArray(next.articles)) throw new Error(next.error||'News could not be loaded.');
    data=next;
  } catch(err) {if(token!==request||!active)return;error=err.message;}
  if(token!==request||!active)return;loading=false;render();
}
function render(){
  if(!active)return;
  if(selectedGame==='finals'){renderFinalsNews();return;}
  $('#hub-app').innerHTML=renderNewsPage({gameName,selectedGame,data,loading,error});
}
function finalsNewsCard(article){
 const version=article.title.match(/\b\d+\.\d+(?:\.\d+)?\b/)?.[0];
 return `<article class="fn-news-card"><div class="fn-news-card-art" aria-hidden="true"><span>${e(article.kind||'Official update')}</span>${version?`<b>${e(version)}</b>`:'<svg viewBox="0 0 48 48" fill="none"><path d="M12 36V12h24v24H12Zm7-16h10m-10 8h10"/></svg>'}</div><div class="fn-news-card-copy"><p class="fn-media-meta"><span>${e(data?.source||'Embark Studios')}</span>${article.publishedAt?`<time datetime="${e(article.publishedAt)}">${date(article.publishedAt)}</time>`:''}</p><h3><button data-hub-source="${e(article.url)}">${e(article.title)}</button></h3>${article.excerpt?`<p class="fn-news-excerpt">${e(article.excerpt)}</p>`:''}<button class="fn-media-read" data-hub-source="${e(article.url)}" aria-label="Read ${e(article.title)}">Read update <span aria-hidden="true">↗</span></button></div></article>`;
}
function renderFinalsNews(){
 const {featured,rest,action}=patchPresentation(data?.articles||[]),issue=error||data?.error,saved=Boolean(data?.articles?.length);
 const status=loading?'Checking news':issue?saved?'Saved updates':'Feed unavailable':data?.cacheState==='bundled'?'Included with Dropzone':'Official updates';
 $('#hub-app').innerHTML=`<main class="hub-main patches-page fn-media-page fn-news-page"><div class="fn-media-container"><header class="fn-media-heading"><div><span class="hub-eyebrow">THE FINALS / OFFICIAL UPDATES</span><h1>News & updates</h1><p>Patch notes, store updates and announcements from Embark.</p></div><div class="fn-media-header-actions">${sourceStatus({label:status,tone:issue?'warning':'neutral',detail:[data?.source,'Last successful check: '+dateTime(data?.fetchedAt),issue].filter(Boolean).join('\n')})}<button class="hub-button secondary" id="refresh-patches" ${loading?'disabled':''}>${loading?'Checking…':'Refresh news'}</button></div></header>
  ${issue?`<section class="fn-media-alert" role="status"><span class="fn-media-alert-icon" aria-hidden="true">!</span><div><strong>We couldn’t check for new posts.</strong><p>${saved?'Your saved updates are still available below.':'Try again when your connection is available.'}</p><details><summary>Source details</summary><p>${e(issue)}</p></details></div><button class="hub-button secondary" data-retry-patches ${loading?'disabled':''}>Try again</button></section>`:''}
  <div class="fn-media-body" aria-busy="${loading}">${featured?`<article class="fn-news-feature"><div class="fn-news-feature-art" aria-hidden="true"></div><div class="fn-news-feature-copy"><div class="fn-media-feature-meta"><span class="fn-media-kicker">Latest update</span><span class="fn-media-category">${e(featured.kind||'Official update')}</span></div><h2>${e(featured.title)}</h2><p class="fn-media-meta"><span>${e(data?.source||'Embark Studios')}</span>${featured.publishedAt?`<time datetime="${e(featured.publishedAt)}">${date(featured.publishedAt)}</time>`:''}</p>${featured.excerpt?`<p class="fn-news-feature-excerpt">${e(featured.excerpt)}</p>`:''}<button class="hub-button" data-hub-source="${e(featured.url)}">${action} <span aria-hidden="true">↗</span></button></div></article>`:loading?`<section class="fn-media-empty fn-media-loading" role="status"><span class="fn-media-empty-mark" aria-hidden="true">↗</span><h2>Checking the official feed</h2><p>Looking for the latest updates from Embark.</p></section>`:`<section class="fn-media-empty"><span class="fn-media-empty-mark" aria-hidden="true">↗</span><h2>No updates available</h2><p>${issue?'We couldn’t load the feed and no saved posts are available.':'Official posts will appear here when the source supplies them.'}</p><button class="hub-button" data-retry-patches>Refresh news</button></section>`}
  ${rest.length?`<section class="fn-news-archive" aria-labelledby="fn-news-archive-heading"><header class="fn-media-section-heading"><h2 id="fn-news-archive-heading">Previous updates</h2><span>${rest.length} posts</span></header><div class="fn-news-grid">${rest.map(finalsNewsCard).join('')}</div></section>`:''}</div>
  <footer class="fn-media-footer"><p>Full posts open on the official website.</p>${data?.sourceUrl?`<button class="source-link" data-hub-source="${e(data.sourceUrl)}">All official updates ↗</button>`:''}<details><summary>Source & update details</summary><p>${e(data?.source||'Embark Studios')} · Last successful check: ${dateTime(data?.fetchedAt)}</p><p>Checks run on launch and every 15 minutes. News posts do not automatically verify recommended builds.</p>${data?.cacheState==='bundled'?'<p>These saved posts were included with your Dropzone installation.</p>':''}</details></footer></div></main>`;
}
document.addEventListener('click',event=>{if(active&&event.target.closest('#refresh-patches,[data-retry-patches]'))load(true).catch(err=>toast(err.message));});
window.addEventListener('tbb-sources-updated',()=>{if(active&&!loading)load();});
