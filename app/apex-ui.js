import {$,api,e,opts,date,dateTime,stored,persist} from './shared.js';
import {sourceStatus} from './source-status.js';
import {playerProfile,renderPlayerProfile} from './apex-profile.js';
import {transitionPage} from './page-transition.js';
import bundle from './data/apex/apex-content.json' with {type:'json'};
import art from './data/apex/legend-art.json' with {type:'json'};
import {renderApexMeta} from './apex-meta.js';
import {renderNewsPage} from './news-view.js';
let active=false,revision=0,lookupRevision=0,data=bundle,page='overview',query='',role='all',loading=false,searching=false;
let service={available:false,status:'setup-required',message:'Player lookup requires secure provider configuration.'};
let profile=null,lookupMessage='',playerName='',platform='PC',historyTab='recent',identifierMode='name';
let cooldownUntil=0,cooldownTimer=null,playerView='landing',lastLookup=null;
let metaView='picks',metaSelectedLegend=null,metaDirectoryScroll=0,metaReturnFocus=null;
function saveMetaNavigation(push=false){window.history[push?'pushState':'replaceState']({...window.history.state,apexGuide:{view:metaView,query,role,legend:metaSelectedLegend,scroll:metaDirectoryScroll}},'');}
function returnToDirectory(){metaReturnFocus=metaSelectedLegend;if(window.history.state?.apexGuide?.legend){window.history.back();return;}metaSelectedLegend=null;saveMetaNavigation();animateRender();}
const profileCache=new Map();
const playerKey=identity=>identity.platform+':'+identity.uid;
const searchState=()=>({playerName,platform,identifierMode,historyTab});
function restoreSearch(saved){if(!saved)return;playerName=typeof saved.playerName==='string'?saved.playerName.slice(0,64):'';platform=platformNames[saved.platform]?saved.platform:'PC';identifierMode=saved.identifierMode==='uid'?'uid':'name';historyTab=saved.historyTab==='favorites'?'favorites':'recent';}
function saveNavigation(view,details={},push=false){const value={...(window.history.state||{}),dropzone:true,route:{id:'apex',context:null,view:'loadouts'},apexPlayer:{view,search:searchState(),...details}};window.history[push?'pushState':'replaceState'](value,'');}
function animateRender(){void transitionPage(render).then(()=>{if(active&&page==='overview'&&playerView!=='landing'){const target=document.querySelector('.apex-profile-identity h1,.apex-player-error h1,[data-apex-back]');if(target){if(target.tagName==='H1')target.tabIndex=-1;target.focus({preventScroll:true});}}}).catch(()=>{if(active)render();});}
function backToPlayers(){if(window.history.state?.apexPlayer?.fromPlayers){window.history.back();return;}++lookupRevision;searching=false;playerView='landing';profile=null;lookupMessage='';saveNavigation('landing');animateRender();}
const canLookup=()=>service.available&&!searching&&Date.now()>=cooldownUntil;
const platformNames={PC:'PC / EA',PS4:'PlayStation',X1:'Xbox',SWITCH:'Nintendo Switch'};
const historyKey='dropzone-apex-players-v1';
function history(){const value=stored(historyKey,{});const clean=rows=>(Array.isArray(rows)?rows:[]).filter(r=>typeof r?.name==='string'&&r.name.length<=64&&/^\d{1,20}$/.test(r.uid)&&platformNames[r.platform]).slice(0,20).map(r=>({name:r.name,uid:r.uid,platform:r.platform,rank:typeof r.rank==='string'?r.rank.slice(0,80):'',checkedAt:Number.isFinite(Date.parse(r.checkedAt))?r.checkedAt:null}));return {recent:clean(value?.recent),favorites:clean(value?.favorites)};}
const same=(a,b)=>a.uid===b.uid&&a.platform===b.platform;
function rememberedProfile(next){const rank=next.ranks[0];return {...next.identity,rank:rank?rank.name+(rank.division?' '+rank.division:''):'',checkedAt:next.checkedAt};}
function remember(next){const saved=history(),identity=rememberedProfile(next);saved.recent=[identity,...saved.recent.filter(row=>!same(row,identity))].slice(0,12);saved.favorites=saved.favorites.map(row=>same(row,identity)?identity:row);try{persist(historyKey,saved);}catch{lookupMessage='Player loaded. This device could not save recent players.';}}
function toggleFavorite(identity){const saved=history();saved.favorites=saved.favorites.some(row=>same(row,identity))?saved.favorites.filter(row=>!same(row,identity)):[identity,...saved.favorites].slice(0,20);try{persist(historyKey,saved);}catch{lookupMessage='This device could not save favorites.';}render();}
export function leaveApex(){active=false;++revision;++lookupRevision;searching=false;}
export async function mountApex(view){
 page=({'apex-legends':'legends','apex-news':'news','apex-esports':'news'})[view]||'overview';active=true;lookupMessage='';
 if(page==='legends'){const guide=window.history.state?.apexGuide;if(guide){metaView=['picks','teams','directory','evidence'].includes(guide.view)?guide.view:'picks';query=typeof guide.query==='string'?guide.query:'';role=typeof guide.role==='string'?guide.role:'all';metaSelectedLegend=typeof guide.legend==='string'?guide.legend:null;metaDirectoryScroll=Number.isFinite(guide.scroll)?guide.scroll:0;}}
 const nav=window.history.state?.apexPlayer;restoreSearch(nav?.search);playerView='landing';profile=null;
 if(page==='overview'&&nav?.view==='profile'){
  const cached=profileCache.get(nav.key);if(cached){profile=cached;playerView='profile';}
  else if(nav.identity?.platform&&platformNames[nav.identity.platform]&&(typeof nav.identity.player==='string'||/^\d{1,20}$/.test(nav.identity.uid||''))){playerView='loading';lastLookup=nav.identity;}
 }
 render();await refresh();
 if(active&&page==='overview'&&playerView==='loading'&&lastLookup){if(canLookup())await lookup(lastLookup,{push:false});else{playerView='error';lookupMessage=service.message||'Sign in to view this player.';render();}}
}
async function refresh(force=false){
 const ticket=++revision;loading=true;render();
 const results=await Promise.allSettled([api.apexContent({refresh:force}),api.apexPlayer({action:'status'})]);
 if(!active||ticket!==revision)return;
 const content=results[0];if(content.status==='fulfilled'&&content.value.catalog?.legends?.length&&content.value.news?.length)data=content.value;else data={...data,error:content.reason?.message||content.value?.error||'Official content could not be checked.'};
 service=results[1].status==='fulfilled'?results[1].value:{available:false,status:'service-unavailable',message:'Player service could not be reached. Try again later.'};loading=false;render();
}
function articleRows(rows){return rows.map(article=>({...article,image:article.image||[...bundle.news,...bundle.esports].find(saved=>saved.url===article.url)?.image})).map(article=>`<button class="apex-article" data-hub-source="${e(article.url)}">${article.image?`<img src="${e(article.image)}" alt="" loading="lazy">`:''}<span class="apex-article-copy"><strong>${e(article.title)}</strong><small>${article.publishedAt?date(article.publishedAt):'ALGS · Official news'}</small></span><span class="apex-article-arrow" aria-hidden="true">↗</span></button>`).join('');}
function recentPlayers(){const saved=history(),rows=saved[historyTab];return `<section class="apex-recent"><div class="apex-history-tabs" aria-label="Saved player lists"><button data-apex-history="recent" aria-pressed="${historyTab==='recent'}">Recent players <span>${saved.recent.length}</span></button><button data-apex-history="favorites" aria-pressed="${historyTab==='favorites'}">Favorites <span>${saved.favorites.length}</span></button></div>${rows.length?`<div class="apex-recent-list">${rows.map(row=>{const favorite=saved.favorites.some(f=>same(f,row));return `<article class="apex-saved-player"><button class="apex-saved-open" data-apex-uid="${e(row.uid)}" data-apex-platform="${e(row.platform)}" ${service.status==='sign-in-required'?'data-apex-sign-in':!canLookup()?'disabled':''}><span class="apex-saved-avatar" aria-hidden="true">${e(row.name.slice(0,1).toUpperCase())}</span><span class="apex-saved-copy"><strong>${e(row.name)}</strong><span>${e(platformNames[row.platform])}${row.rank?' · '+e(row.rank):''}${service.status==='sign-in-required'?' · Sign in to view':''}</span>${row.checkedAt?`<small>Cached · ${e(dateTime(row.checkedAt))}</small>`:''}</span><span aria-hidden="true">→</span></button><button class="apex-saved-favorite" data-apex-toggle="${e(row.uid)}" data-apex-platform="${e(row.platform)}" aria-pressed="${favorite}" aria-label="${favorite?'Remove':'Add'} ${e(row.name)} ${favorite?'from':'to'} favorites">${favorite?'★':'☆'}</button></article>`;}).join('')}</div>`:`<div class="apex-history-empty"><strong>${historyTab==='recent'?'Your players, a search away':'Keep your players close'}</strong><p>${historyTab==='recent'?'Look up a player above to save them here on this device.':'Use the star on a player profile or recent entry to add a favorite.'}</p></div>`}</section>`;}
function serviceNotice(){
 const signIn=service.status==='sign-in-required';
 return `<section class="apex-service-state" role="status"><div><strong>${signIn?'Sign in to look up players':'Player lookup unavailable'}</strong><p>${signIn?'Use your Dropzone account to access the player service.':e(service.message||'The player service could not be reached.')}</p></div>${signIn?'<button class="hub-button" data-apex-sign-in>Sign in</button>':`<button class="hub-button secondary" data-apex-refresh ${loading?'disabled':''}>${loading?'Checking…':'Try again'}</button>`}</section>`;
}
function playerAttribution(){return `<div class="apex-player-attribution"><button class="source-link" data-hub-source="https://apexlegendsstatus.com">Player data: Apex Legends Status ↗</button><span>Unofficial provider · Partial tracker coverage</span></div>`;}
function profileLoading(){return `<section class="apex-profile apex-profile-pending" aria-busy="true"><div class="apex-profile-context"><button class="apex-back" data-apex-back>← Back to Players</button><span role="status">Looking up player…</span></div><div class="apex-skeleton-identity"><i></i><span></span><small></small></div><div class="apex-skeleton-summary"><i></i><i></i></div><div class="apex-skeleton-legends">${Array.from({length:6},()=>'<i></i>').join('')}</div></section>`;}
function profileError(){return `<section class="apex-profile"><div class="apex-profile-context"><button class="apex-back" data-apex-back>← Back to Players</button></div><div class="apex-player-error" role="status"><span class="apex-game-label">PLAYER LOOKUP</span><h1>${service.status==='sign-in-required'?'Sign in to continue':'Player could not be loaded'}</h1><p>${e(lookupMessage||service.message||'Check the player name and platform, then try again.')}</p><div>${service.status==='sign-in-required'?'<button class="hub-button" data-apex-sign-in>Sign in</button>':`<button class="hub-button" data-apex-retry ${!canLookup()?'disabled':''}>${Date.now()<cooldownUntil?'Please wait before retrying':'Try again'}</button>`}<button class="hub-button secondary" data-apex-back>Back to Players</button></div></div></section>`;}
function overview(){
 if(playerView==='loading')return profileLoading();
 if(playerView==='error')return profileError()+playerAttribution();
 if(playerView==='profile'&&profile)return renderPlayerProfile(profile,art,history().favorites.some(row=>same(row,profile.identity)))+(lookupMessage?`<p class="apex-lookup-state" role="status">${e(lookupMessage)}</p>`:'')+playerAttribution();
 const platformOptions=[['PC','PC / EA'],['PS4','PlayStation'],['X1','Xbox'],...(identifierMode==='uid'?[['SWITCH','Nintendo Switch']]:[])];
 return `<section class="apex-search-stage" style="--apex-scene:url('${e(bundle.cover)}')"><div class="apex-search-content"><header><span class="apex-game-label">APEX LEGENDS</span><h1>Players</h1><p>Find a player. Explore the stats their trackers share.</p></header><form class="apex-player-form" aria-label="Apex player lookup"><label><span class="sr-only">Platform</span><select id="apex-platform" name="platform">${opts(platformOptions,platform)}</select></label><label><span class="sr-only">${identifierMode==='uid'?'Player UID':'Player name'}</span><input name="player" autocomplete="off" maxlength="${identifierMode==='uid'?20:64}" inputmode="${identifierMode==='uid'?'numeric':'text'}" value="${e(playerName)}" placeholder="${identifierMode==='uid'?'Enter player UID':'Enter your EA or platform name'}"></label><button type="submit" class="hub-button" ${!canLookup()?'disabled':''}>Find player <span aria-hidden="true">→</span></button></form><p class="apex-search-help">${identifierMode==='uid'?'Use the exact player UID for the selected platform.':'PC players: use your linked EA name, not your Steam display name.'} <button type="button" class="source-link" data-apex-identifier>${identifierMode==='uid'?'Search by name':'Search by UID'}</button></p></div></section><div class="apex-landing-workspace">${lookupMessage?`<p class="apex-lookup-state" role="status">${e(lookupMessage)}</p>`:''}${!service.available?serviceNotice():''}${recentPlayers()}<div class="apex-landing-news"><section><div class="apex-section-heading"><h2>Latest from EA</h2><button class="source-link" data-apex-page="news">All news ↗</button></div>${articleRows(data.news.slice(0,4))}</section></div>${playerAttribution()}</div>`;
}
function legends(){return renderApexMeta({data,art,query,role,view:metaView,selectedLegend:metaSelectedLegend});}
function news(){return renderNewsPage({gameName:'Apex Legends',selectedGame:'apex',loading,error:data.error||null,refreshId:'apex-refresh-news',description:'Official updates from EA / Respawn.',data:{source:'EA / Respawn',sourceUrl:'https://www.ea.com/games/apex-legends/apex-legends/news',fetchedAt:data.fetchedAt,cacheState:data.cacheState,articles:(data.news||[]).map(row=>({...row,dateLabel:'Published',kind:/patch.*notes/i.test(row.title)?'Patch notes':'Announcement'}))}});}
function render(){
 const focusedLegend=document.activeElement?.dataset?.apexLegendOpen;
 const directoryScroll=document.querySelector('.am-directory-list')?document.querySelector('.apex-page')?.scrollTop:metaDirectoryScroll;
 if(!active)return;if(page==='news'){$('#hub-app').innerHTML=news();return;}const openTrackers=[...document.querySelectorAll('.apex-profile-legend details[open]')].map(node=>node.closest('[data-apex-legend]')?.dataset.apexLegend);const focusedFavorite=document.activeElement?.hasAttribute('data-apex-favorite');const inputFocused=document.activeElement?.id==='apex-query',selection=inputFocused?[document.activeElement.selectionStart,document.activeElement.selectionEnd]:null;
 $('#hub-app').innerHTML=`<main class="hub-main apex-page" data-apex-view="${page}" data-player-view="${playerView}" data-profile-loaded="${playerView==='profile'&&!!profile}" style="--apex-scene:url('${e(bundle.cover)}')">${page==='overview'?overview():page==='legends'?legends():news()}<footer class="apex-attribution"><div class="apex-source-actions">${sourceStatus({label:loading?'Checking official pages':'Official content · '+date(data.fetchedAt),tone:data.error?'warning':'neutral',detail:data.error||'EA Help, EA news and ALGS pages. The roster includes official EA character artwork.'})}<button class="source-link" data-apex-refresh ${loading?'disabled':''}>Refresh official content</button></div>Game content and artwork © EA / Respawn. Official pages checked ${dateTime(data.fetchedAt)}. ${data.cacheState==='offline'||data.error?'Showing the last saved snapshot.':''}</footer></main>`;
 for(const details of document.querySelectorAll('.apex-profile-legend details'))if(openTrackers.includes(details.closest('[data-apex-legend]')?.dataset.apexLegend))details.open=true;if(focusedFavorite)document.querySelector('[data-apex-favorite]')?.focus({preventScroll:true});
 if(selection){const input=$('#apex-query');input.focus({preventScroll:true});input.setSelectionRange(...selection);}
 if(page==='legends'&&metaView==='directory'&&!metaSelectedLegend){document.querySelector('.apex-page').scrollTop=directoryScroll||0;const focus=metaReturnFocus||focusedLegend;if(focus){[...document.querySelectorAll('[data-apex-legend-open]')].find(node=>node.dataset.apexLegendOpen===focus)?.focus({preventScroll:true});metaReturnFocus=null;}}
}
async function lookup(identity,{push=true}={}){
 if(!canLookup())return;
 const ticket=++lookupRevision;lastLookup=identity;
 if(push){saveNavigation('landing');saveNavigation('profile',{identity,fromPlayers:true},true);}
 searching=true;profile=null;playerView='loading';lookupMessage='';animateRender();
 try{
  const result=await api.apexPlayer({action:'lookup',...identity});if(!active||ticket!==lookupRevision)return;
  const next=result.status==='ready'?playerProfile(result.profile):null;
  if(next){profile=next;playerView='profile';lookupMessage='';remember(next);const key=playerKey(next.identity);profileCache.set(key,next);if(profileCache.size>12)profileCache.delete(profileCache.keys().next().value);saveNavigation('profile',{key,identity:{uid:next.identity.uid,platform:next.identity.platform},fromPlayers:!!window.history.state?.apexPlayer?.fromPlayers});}
  else{
   playerView='error';lookupMessage=result.message||'No player result was returned. Check the name and platform.';
   if(result.status==='sign-in-required')service={...service,...result,available:false};
   if(result.status==='rate-limited'){
    const wait=Math.min(300,Math.max(2,Number(result.retryAfter)||2));cooldownUntil=Date.now()+wait*1000;
    clearTimeout(cooldownTimer);cooldownTimer=setTimeout(()=>{cooldownUntil=0;if(active)render();},wait*1000);
   }
  }
 }catch{if(active&&ticket===lookupRevision){playerView='error';lookupMessage='The player service could not be reached. Try again shortly.';}}
 finally{if(active&&ticket===lookupRevision){searching=false;animateRender();}}
}
 document.addEventListener('click',event=>{
  if(!active)return;const button=event.target.closest('button');if(!button)return;
  if(button.dataset.apexLegendOpen&&page==='legends'){metaDirectoryScroll=document.querySelector('.apex-page').scrollTop;saveMetaNavigation();metaSelectedLegend=button.dataset.apexLegendOpen;saveMetaNavigation(true);animateRender();return;}
  if('apexLegendBack'in button.dataset&&page==='legends'){returnToDirectory();return;}
  if(button.dataset.apexMetaView&&page==='legends'){
   const next=button.dataset.apexMetaView;if(!['picks','teams','directory','evidence'].includes(next)||next===metaView)return;
   const keyboard=event.detail===0;metaView=next;metaSelectedLegend=null;metaDirectoryScroll=0;saveMetaNavigation();
   void transitionPage(()=>{render();if(keyboard)document.querySelector('.am-guide-nav [aria-pressed="true"]')?.focus({preventScroll:true});}).catch(()=>render());return;
  }
  if('apexBack'in button.dataset){backToPlayers();return;}
  if('apexRetry'in button.dataset&&lastLookup){void lookup(lastLookup,{push:false});return;}
  if('apexIdentifier'in button.dataset){identifierMode=identifierMode==='name'?'uid':'name';if(identifierMode==='name'&&platform==='SWITCH')platform='PC';playerName='';saveNavigation('landing');render();document.querySelector('.apex-player-form input')?.focus();return;}
  if('apexRefresh'in button.dataset||button.id==='apex-refresh-news')void refresh(true);
  if(button.dataset.apexHistory){historyTab=button.dataset.apexHistory;saveNavigation('landing');render();}
  if(button.dataset.apexUid&&!('apexSignIn'in button.dataset))void lookup({uid:button.dataset.apexUid,platform:button.dataset.apexPlatform});
  if(button.dataset.apexToggle){const row=[...history().recent,...history().favorites].find(row=>row.uid===button.dataset.apexToggle&&row.platform===button.dataset.apexPlatform);if(row)toggleFavorite(row);}
  if('apexFavorite'in button.dataset&&profile)toggleFavorite(rememberedProfile(profile));
 });
 document.addEventListener('input',event=>{if(!active)return;if(event.target.id==='apex-query'){query=event.target.value;render();}if(event.target.matches('.apex-player-form input')){playerName=event.target.value;saveNavigation('landing');}});
 document.addEventListener('change',event=>{if(!active)return;if(event.target.id==='apex-role'){role=event.target.value;render();}if(event.target.id==='apex-platform'){platform=event.target.value;saveNavigation('landing');}});
 document.addEventListener('submit',event=>{if(active&&event.target.closest('.apex-player-form')){event.preventDefault();if(!playerName.trim()){lookupMessage='Enter your EA or platform name.';render();return;}if(identifierMode==='uid'&&!/^\d{1,20}$/.test(playerName.trim())){lookupMessage='Enter a numeric player UID, up to 20 digits.';render();return;}lookup({[identifierMode==='uid'?'uid':'player']:playerName.trim(),platform});}});
 document.addEventListener('error',event=>{if(event.target.matches?.('.apex-page img'))event.target.hidden=true;},true);
 document.addEventListener('keydown',event=>{if(active&&page==='legends'&&metaSelectedLegend&&event.key==='Escape'){event.preventDefault();returnToDirectory();}});
 window.addEventListener('tbb-sources-updated',()=>{if(active&&!loading)refresh();});
