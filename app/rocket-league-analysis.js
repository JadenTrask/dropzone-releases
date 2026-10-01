import {stored,persist} from './shared.js';

export function mountAnalysisOverview(root,{load,copy}={}){
 let tone=stored('rl-analysis-tone','nice')==='brutal'?'brutal':'nice',busy=false,disposed=false;
 root.innerHTML=`<section class="rl-ai-overview"><header class="rl-ai-heading"><span class="hub-eyebrow">EXPERIMENTAL</span><h2>AI Overview</h2><p>Your recorded matches, ready for a second opinion.</p></header><div class="rl-ai-workspace"><div class="rl-ai-compose"><h3>Choose your coach</h3><div class="rl-ai-tones" role="group" aria-label="Coaching tone"><button type="button" data-ai-tone="nice" aria-pressed="${tone==='nice'}">Nice Coach</button><button type="button" data-ai-tone="brutal" aria-pressed="${tone==='brutal'}">Brutal Coach</button></div><p class="rl-ai-tone-description"></p><div class="rl-ai-copy-area"><button type="button" class="hub-button rl-ai-copy" data-ai-copy>Copy analysis prompt</button><p class="rl-ai-feedback" role="status" aria-live="polite"></p></div><p class="rl-ai-privacy">Copying includes your tracked gameplay stats. Nothing is automatically sent to an AI or other external service.</p></div><aside class="rl-ai-guide"><h3>Bring your own AI</h3><p>Dropzone does not currently fund an AI API. This experiment copies a ready-to-use prompt for your preferred AI.</p><ol><li>Choose a coaching tone.</li><li>Copy your analysis prompt.</li><li>Paste it into your AI and ask follow-up questions.</li></ol><div class="rl-ai-scope"><h3>Grounded in your recordings</h3><p>All accessible history is checked, including available cloud records. The prompt separates complete matches, partial recordings and observed playtime.</p><p>Rank/MMR and official lifetime stats aren’t recorded. Missing data stays unknown.</p></div></aside></div><footer class="rl-ai-summary" aria-label="Last copied snapshot"><div><span>Matched records</span><strong data-ai-count>Ready when you are</strong></div><div><span>Recorded period</span><strong data-ai-period>Checked when you copy</strong></div><div><span>History coverage</span><strong data-ai-coverage>Current retention window</strong></div></footer></section>`;
 const element=root.querySelector('.rl-ai-overview'),status=element.querySelector('.rl-ai-feedback'),button=element.querySelector('[data-ai-copy]');
 const alive=()=>!disposed&&element.isConnected&&root.contains(element);
 const renderTone=()=>{for(const b of element.querySelectorAll('[data-ai-tone]')){b.setAttribute('aria-pressed',String(b.dataset.aiTone===tone));b.disabled=busy;}element.querySelector('.rl-ai-tone-description').textContent=tone==='brutal'?'Blunt, funny and useful. Roast the patterns the stats support, then build a practical plan.':'Encouraging, candid and constructive. Build on your strengths and tackle what needs work.';};
 const setBusy=value=>{busy=value;button.disabled=value;button.setAttribute('aria-busy',String(value));renderTone();};
 const click=async event=>{
  const target=event.target.closest('button');if(!target||busy||!alive())return;
  if(target.dataset.aiTone){tone=target.dataset.aiTone==='brutal'?'brutal':'nice';persist('rl-analysis-tone',tone);renderTone();status.textContent='';return;}
  if(!target.hasAttribute('data-ai-copy'))return;
  if(typeof load!=='function'||typeof copy!=='function'){status.textContent='Open the desktop app to copy an analysis of your saved Rocket League history.';return;}
  const selectedTone=tone;setBusy(true);status.dataset.state='loading';status.textContent='Reading your full accessible history…';
  try{
   const result=await load(selectedTone);if(!alive())return;
   if(typeof result?.text!=='string'||!result.text.length||result.text.length>200000||!result.summary||!Number.isInteger(result.summary.matches)||result.summary.matches<0||![30,365].includes(result.summary.retentionDays)||![result.summary.detailIncluded,result.summary.detailTotal].every(v=>Number.isInteger(v)&&v>=0)||result.summary.detailIncluded>result.summary.detailTotal||result.summary.detailTotal!==result.summary.matches||(result.summary.matches>0&&![result.summary.first,result.summary.last].every(v=>typeof v==='string'&&Number.isFinite(Date.parse(v)))))throw Error('The analysis prompt could not be prepared. Nothing was copied.');
   const copied=await Promise.resolve().then(()=>copy(result.text)).catch(()=>false);if(copied===false)throw Error('Clipboard access failed. Try copying again.');if(!alive())return;
   const s=result.summary,date=value=>value?new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):null;
   element.querySelector('[data-ai-count]').textContent=s.matches.toLocaleString()+' '+(s.matches===1?'match':'matches');
   element.querySelector('[data-ai-period]').textContent=s.first&&s.last?date(s.first)+' – '+date(s.last):'No recorded matches';
   element.querySelector('[data-ai-coverage]').textContent='Up to '+s.retentionDays+' days · '+(s.cloud?'Local + cloud':'Local history');
   status.dataset.state='success';status.textContent=s.matches?'Copied. Paste into your preferred AI. All '+s.matches.toLocaleString()+' matches inform the report'+(s.detailIncluded<s.detailTotal?'; '+s.detailIncluded+' recent match records are included in detail.':'.'):'Copied a no-data prompt. It explains the gaps and asks what to collect next.';
  }catch(error){if(alive()){status.dataset.state='error';status.textContent=error?.message||'Couldn’t copy the analysis prompt. Try again.';}}
  finally{if(alive())setBusy(false);}
 };
 element.addEventListener('click',click);renderTone();
 return()=>{disposed=true;element.removeEventListener('click',click);};
}
