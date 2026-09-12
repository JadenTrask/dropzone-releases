import {readMutedReviews,saveMutedReviews,isOldSource,needsSourceAttention} from './source-alerts.js';
import {$,api,e,date,dateTime,toast} from './shared.js';

let active=false,data=null,polling=false,lastFinished=null,lastSignature='';
let muted=readMutedReviews(localStorage),gameFilter='all',statusFilter='all';
const attention=row=>needsSourceAttention(row,muted);
const gameGroups=[['league','League of Legends'],['cod','Call of Duty'],['siege','Rainbow Six Siege'],['finals','THE FINALS'],['wardogs','WARDOGS'],['gray-zone','Gray Zone Warfare'],['other','Other sources']];

function groupFor(row){
  if(row.id==='league'||row.id.startsWith('lol-')||row.id==='patches-lol')return 'league';
  if(row.id==='warzone'||/^(bo7-|warzone-|cod-|mw4-)/.test(row.id)||/^patches-(bo7|warzone|mw4)$/.test(row.id))return 'cod';
  for(const id of ['siege','finals','wardogs','gray-zone'])if(row.id.startsWith(id+'-')||row.id==='patches-'+id)return id;
  return 'other';
}
function sourceState(row){
  if(row.state==='checking')return ['checking','Checking…'];
  if(row.state==='offline')return ['warning','Refresh failed'];
  if(row.state==='waiting')return ['waiting','Waiting'];
  if(row.state==='review')return [muted.has(row.id)?'muted':'warning',muted.has(row.id)?'Review muted':'Review needed'];
  if(isOldSource(row))return [muted.has(row.id)?'muted':'warning',muted.has(row.id)?'Age reminder muted':'Over 30 days old'];
  return ['checked','Source checked'];
}
function sourceTitle(row){
  if(row.id==='league')return 'Champion & item catalog';
  if(row.id==='mw4-release')return 'Modern Warfare 4 · release announcement';
  if(groupFor(row)!=='cod'&&row.name.includes(' · '))return row.name.split(' · ').slice(1).join(' · ');
  return row.name;
}

export function leaveSources(){active=false;}
export function mountSources(){active=true;render();poll();}
function badge(){
  const b=$('#updates-button');if(!b||!data)return;
  const issues=data.rows.filter(attention).length;
  b.dataset.status=data.running?'checking':issues?'warning':'checked';
  (b.querySelector('span')||b.appendChild(document.createElement('span'))).textContent=issues?`Sources · ${issues}`:'Sources';
  b.title=data.running?'Checking game sources':issues?`${issues} source${issues===1?'':'s'} need attention`:'Game sources and review preferences';
}

function sourceRow(row,opened){
  const [state,label]=sourceState(row),detailId='update-detail-'+row.id;
  return `<article class="update-row">
    <details id="${e(detailId)}" ${opened.has(detailId)?'open':''}>
      <summary class="source-row-summary" id="source-summary-${e(row.id)}">
        <span class="source-row-name"><strong>${e(sourceTitle(row))}</strong><span>${e(row.scope)}</span></span>
        <span class="source-row-fetch"><span>Last fetched</span><time>${row.checkedAt?e(dateTime(row.checkedAt)):'Not yet checked'}</time></span>
        <span class="update-state ${state}"><i aria-hidden="true"></i>${label}</span>
        <svg class="source-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      </summary>
      <div class="source-row-detail">
        <p>${e(row.detail||'This source has not completed a successful check yet.')}</p>
        <dl class="update-dates"><div><dt>Source changed</dt><dd>${e(date(row.sourceUpdatedAt))}</dd></div><div><dt>Successfully fetched</dt><dd>${e(dateTime(row.checkedAt))}</dd></div><div><dt>Last attempt</dt><dd>${e(dateTime(row.attemptedAt))}</dd></div>${row.patch?`<div><dt>${row.id==='league'?'Catalog':'Source patch'}</dt><dd>${e(row.patch)}</dd></div>`:''}</dl>
        <div class="source-detail-actions">
          <button class="source-link" id="source-open-${e(row.id)}" data-hub-source="${e(row.sourceUrl)}">Inspect source ↗</button>
          <div class="source-review-control"><button class="hub-button secondary" id="source-mute-${e(row.id)}" data-mute-source="${e(row.id)}" aria-pressed="${muted.has(row.id)}">${muted.has(row.id)?'Unmute review warnings':'Mute review warnings'}</button><span>${muted.has(row.id)?'Review reminders are muted. Refresh failures still appear.':'Mutes age and review reminders only.'}</span></div>
        </div>
      </div>
    </details>
    ${row.error?`<p class="update-error"><strong>Refresh failed.</strong> ${e(row.error)}</p>`:''}
  </article>`;
}

function refreshGuide(opened){
  return `<section class="source-reference" aria-label="Source coverage and methodology">
    <details id="source-refresh-guide" ${opened.has('source-refresh-guide')?'open':''}>
      <summary id="source-refresh-guide-summary"><span><strong>How automatic refresh works</strong><span>What updates in the background, and what needs an app update.</span></span><span class="source-guide-plus" aria-hidden="true">+</span></summary>
      <div class="source-guide-body">
        <p>Sources are checked on every launch, every 15 minutes while the app is open, and after your PC wakes. Every check makes a new request, even if the saved copy is recent. A successful download loads the publisher’s current data without a new app ZIP.</p>
        <div class="update-coverage-table"><table><thead><tr><th>Game</th><th>Downloads automatically</th><th>Limits</th></tr></thead><tbody>
          <tr><th>League of Legends</th><td>Champion and item catalog; builds for the champion and filters you open.</td><td>Guide-only modes have no live in-app build feed. Saved builds remain snapshots.</td></tr>
          <tr><th>BO7 / Warzone</th><td>Public and ranked attachment sets, source tiers, and patch notes.</td><td>BO7’s allowed ranked weapon list is bundled. Source recommendations can lag behind the game.</td></tr>
          <tr><th>THE FINALS</th><td>Class loadouts, equipment within the existing team presets, and patch notes.</td><td>Team-comp choices and their fixed weapon picks need a separate review; they do not update automatically.</td></tr>
          <tr><th>WARDOGS</th><td>Mortar / SPH-2 firing tables, map calibration checks, and official posts.</td><td>Map images and new calculator features need an app update. Progression is on external sites.</td></tr>
          <tr><th>Videos / MW4</th><td>Official channel uploads and archives; the linked MW4 release announcement.</td><td>Open a playlist to refresh its matches. New game support needs an app update.</td></tr>
        </tbody></table></div>
        <p class="source-guide-note">An unavailable or changed source keeps the last valid data with a failed-refresh warning. The source’s review date stays separate from the download time.</p>
      </div>
    </details>
    <details id="source-update-limits" ${opened.has('source-update-limits')?'open':''}>
      <summary id="source-update-limits-summary"><span><strong>Coverage & limitations</strong><span>Build reviews, data reliability, and saved snapshots.</span></span><span class="source-guide-plus" aria-hidden="true">+</span></summary>
      <div class="source-guide-body source-limits-copy">
        <p><strong>League:</strong> builds are checked when you select a champion and filter combination. Downloading every champion, matchup, rank, and mode at launch is not practical. Normal / Quickplay and Mayhem use labeled foundations; several rotating modes only offer external guides.</p>
        <p><strong>Call of Duty:</strong> CODMunity’s public website feeds provide attachment sets and editorial tiers. This is not an official API partnership. BO7 ranked is limited to the M15 Mod 0 and MPC-25. That weapon pool requires an app update if the rules change. Warzone ranked uses its own feed.</p>
        <p><strong>THE FINALS:</strong> community loadouts and Embark patch notes refresh automatically. Team composition strategy is reviewed separately and is flagged when a newer non-store patch appears. No verified ranked win-rate feed is connected.</p>
        <p><strong>WARDOGS:</strong> community firing tables refresh automatically. Map calibration changes require an app update and disable elevation solutions for the affected map. The release build has not been tested; terrain and vehicle tilt are not corrected. Progression links open external community services, outside these checks.</p>
        <p><strong>Patch notes:</strong> each game has an official post feed and links to full notes. Reading a new patch does not automatically validate community loadouts or firing tables.</p>
        <p><strong>MW4 and future games:</strong> new game support needs a compatible provider and app update. The coming-soon card does not unlock builds just because its release date has passed. The linked MW4 announcement is checked for release-date changes; separate future announcements are not monitored.</p>
        <p>Saved builds stay as snapshots. If a website changes format, rejects requests, or stops publishing, the app keeps its last valid data and shows the failure. App updates use the installed Windows version and a connected release destination. Use the App updates tab to check for a new Dropzone version.</p>
      </div>
    </details>
  </section>`;
}

function render(){
  if(!active)return;
  const scroll=$('.sources-page')?.scrollTop||0;
  const opened=new Set([...document.querySelectorAll('.sources-page details[open]')].map(x=>x.id));
  const focused=document.activeElement?.closest('.sources-page')?document.activeElement.id:null;
  const rows=data?.rows||[],issues=rows.filter(attention).length;
  const groups=gameGroups.filter(([id])=>rows.some(row=>groupFor(row)===id));
  const visible=rows.filter(row=>(gameFilter==='all'||groupFor(row)===gameFilter)&&(statusFilter==='all'||attention(row)));
  const cycle=data?.running?'Checking your sources':!data?.finishedAt?'Preparing source checks':issues?'Some sources need attention':'All sources checked';
  const cycleDetail=data?.running?'Background checks are running. Keep using the app.':data?.finishedAt?'Last check cycle finished '+dateTime(data.finishedAt):'Status will appear as the first checks complete.';
  $('#hub-app').innerHTML=`<main class="hub-main updates-page sources-page">
    <div class="library-intro sources-intro"><div><span class="hub-eyebrow">WORKSPACE</span><h1>Sources</h1><p>Keep track of the data behind your games.</p></div><button class="hub-button" id="check-all-sources" ${data?.running||polling?'disabled':''}><svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M16.5 7A7 7 0 1 0 17 11M16.5 2v5h-5"/></svg>${data?.running?'Checking…':'Check all sources'}</button></div>
    <section class="sources-overview ${data?.running?'checking':issues?'warning':''}" aria-label="Source health">
      <div class="sources-health"><span class="sources-health-icon" aria-hidden="true">${data?.running?'↻':!data?.finishedAt?'·':issues?'!':'✓'}</span><div class="update-run-summary" role="status"><strong>${cycle}</strong><span>${e(cycleDetail)}</span></div></div>
      <div class="sources-overview-stats"><div><strong>${data?rows.length:'—'}</strong><span>Sources</span></div><div class="${issues?'has-issues':''}"><strong>${data?issues:'—'}</strong><span>Need attention</span></div><div><strong>15 <small>min</small></strong><span>Auto-check interval</span></div></div>
    </section>
    <div class="sources-toolbar"><label class="sources-game-filter" for="source-game-filter"><span>Game</span><select id="source-game-filter" aria-label="Filter sources by game"><option value="all">All games</option>${groups.map(([id,label])=>`<option value="${id}" ${id===gameFilter?'selected':''}>${label}</option>`).join('')}</select></label><div class="sources-status-filter" role="group" aria-label="Filter source status"><button id="source-filter-all" data-source-filter="all" aria-pressed="${statusFilter==='all'}">All sources</button><button id="source-filter-attention" data-source-filter="attention" aria-pressed="${statusFilter==='attention'}">Needs attention${issues?`<span>${issues}</span>`:''}</button></div><span class="sources-result-count">${visible.length} ${visible.length===1?'source':'sources'}</span></div>
    <div class="source-groups">${!data?'<div class="sources-empty" role="status">Loading source status…</div>':!visible.length?`<div class="sources-empty"><strong>${statusFilter==='attention'?'No sources need attention':'No sources to show'}</strong><p>${statusFilter==='attention'?'No refresh failures or unmuted review reminders for this selection.':'Source status will appear when a source is registered.'}</p></div>`:groups.map(([id,label])=>{const matching=visible.filter(row=>groupFor(row)===id);return matching.length?`<section class="source-group" aria-labelledby="source-group-${id}"><div class="source-group-heading"><h2 id="source-group-${id}">${label}</h2><span>${matching.length}</span></div><div class="update-rows">${matching.map(row=>sourceRow(row,opened)).join('')}</div></section>`:'';}).join('')}</div>
    ${refreshGuide(opened)}
  </main>`;
  $('.sources-page').scrollTop=scroll;
  if(focused)queueMicrotask(()=>document.getElementById(focused)?.focus({preventScroll:true}));
}

async function poll(refresh=false){
  if(polling)return;polling=true;
  if(refresh)render();
  try{
    const next=await api.updates(refresh);
    if(!Array.isArray(next.rows))throw new Error(next.error||'The source status could not be read.');
    data=next;badge();
    const sig=JSON.stringify(next);if(sig!==lastSignature){lastSignature=sig;render();}
    if(next.finishedAt&&next.finishedAt!==lastFinished){lastFinished=next.finishedAt;window.dispatchEvent(new CustomEvent('tbb-sources-updated',{detail:next}));}
  }catch(error){
    if(refresh||active)toast(error.message);
    const b=$('#updates-button');if(b){(b.querySelector('span')||b.appendChild(document.createElement('span'))).textContent='Sources unavailable';b.dataset.status='warning';}
  }finally{
    polling=false;
    const button=$('#check-all-sources');if(button)button.disabled=!!data?.running;
  }
}

document.addEventListener('change',event=>{
  if(!active||event.target.id!=='source-game-filter')return;
  gameFilter=event.target.value;render();
});
document.addEventListener('click',event=>{
  if(!active)return;
  if(event.target.closest('#check-all-sources')){poll(true);return;}
  const filter=event.target.closest('[data-source-filter]')?.dataset.sourceFilter;
  if(filter){statusFilter=filter;render();return;}
  const id=event.target.closest('[data-mute-source]')?.dataset.muteSource;
  if(!id||!data?.rows.some(row=>row.id===id))return;
  const next=new Set(muted);if(next.has(id))next.delete(id);else next.add(id);
  try{saveMutedReviews(localStorage,next);muted=next;badge();render();}catch{toast('Could not save this preference.');}
});
export function startUpdatePolling(){poll();setInterval(()=>poll(),3000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});}

