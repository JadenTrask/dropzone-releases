// Profile motion is short-lived and driven by visibility, never by game telemetry.
let previousKey=null;
const enteredSections=new Set();
export function resetProfileMotion(){previousKey=null;enteredSections.clear();}

export function mountProfileMotion(root){
  const page=root?.matches?.('.rl-player-page')?root:root?.querySelector?.('.rl-player-page');
  if(!page)return ()=>{};
  const doc=page.ownerDocument,win=doc.defaultView,key=page.dataset.profileMotionKey;
  if(key!==previousKey){previousKey=key;enteredSections.clear();}
  const query=win.matchMedia?.('(prefers-reduced-motion: reduce)'),sections=[...page.querySelectorAll('[data-motion-section]')],running=new Map(),timers=new Set();
  let disposed=false,frame=0,observer=null,tooltipPoint=null;
  const reduced=()=>query?.matches||doc.documentElement.classList.contains('cc-reduced-motion');
  const format=(target,value)=>value.toLocaleString(undefined,{maximumFractionDigits:Number(target.dataset.digits)||0})+(target.dataset.suffix||'');
  const finish=section=>{
    for(const target of section.querySelectorAll('[data-count]'))target.textContent=format(target,Number(target.dataset.count));
    section.classList.add('is-entered','rl-motion-complete');running.delete(section);
  };
  const tick=now=>{
    frame=0;if(disposed)return;
    for(const [section,job] of running){
      if(!section.isConnected||doc.hidden||reduced()){finish(section);continue;}
      if(job.start===null)job.start=now;
      const progress=Math.min(1,(now-job.start)/780),eased=1-Math.pow(1-progress,3);
      for(const target of job.targets)target.textContent=format(target,Number(target.dataset.count)*eased);
      if(progress===1)running.delete(section);
    }
    if(running.size)frame=win.requestAnimationFrame(tick);
  };
  const enter=section=>{
    if(disposed||!section.isConnected)return;
    observer?.unobserve(section);
    const sectionKey=section.dataset.motionSection;
    if(enteredSections.has(sectionKey)||reduced()||doc.hidden){enteredSections.add(sectionKey);finish(section);return;}
    enteredSections.add(sectionKey);section.classList.add('is-entered');
    const targets=[...section.querySelectorAll('[data-count]')];
    if(targets.length){running.set(section,{start:null,targets});if(!frame)frame=win.requestAnimationFrame(tick);}
    const timer=win.setTimeout(()=>{timers.delete(timer);if(!disposed)finish(section);},950);timers.add(timer);
  };
  if(win.IntersectionObserver)observer=new win.IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)enter(entry.target);},{threshold:.12});
  for(const section of sections){
    section.classList.add('rl-motion-ready');
    if(enteredSections.has(section.dataset.motionSection)||reduced())finish(section);
    else{
      for(const target of section.querySelectorAll('[data-count]'))target.textContent=format(target,0);
      if(observer)observer.observe(section);else enter(section);
    }
  }
  const settle=()=>{if(doc.hidden||reduced()){if(frame)win.cancelAnimationFrame(frame);frame=0;for(const section of running.keys())finish(section);for(const section of sections)if(section.classList.contains('is-entered'))finish(section);if(reduced()){for(const section of sections){enteredSections.add(section.dataset.motionSection);finish(section);}observer?.disconnect();}}};
  const hideTooltip=()=>{for(const tip of page.querySelectorAll('.rl-chart-tooltip'))tip.hidden=true;tooltipPoint=null;};
  const showTooltip=event=>{
    const point=event.target.closest?.('[data-chart-point]');
    if(!point||!page.contains(point)){if(event.type==='pointerover')hideTooltip();return;}
    if(point===tooltipPoint)return;
    hideTooltip();tooltipPoint=point;
    const card=point.closest('.rl-chart-card'),tip=card?.querySelector('.rl-chart-tooltip');if(!tip)return;
    let data;try{data=JSON.parse(point.dataset.chartPoint);}catch{return;}
    tip.replaceChildren();const title=doc.createElement('strong');title.textContent=data.date;tip.append(title);
    for(const [label,value] of data.items){const row=doc.createElement('div'),name=doc.createElement('span'),number=doc.createElement('b');name.textContent=label;number.textContent=value;row.append(name,number);tip.append(row);}
    tip.hidden=false;
    const bounds=card.getBoundingClientRect(),at=point.getBoundingClientRect(),width=tip.offsetWidth||170;
    tip.style.left=Math.max(12,Math.min(bounds.width-width-12,at.left-bounds.left+at.width/2-width/2))+'px';
    tip.style.top=Math.max(58,at.top-bounds.top-10)+'px';
  };
  const focusOut=event=>{if(!event.relatedTarget?.closest?.('[data-chart-point]'))hideTooltip();};
  doc.addEventListener('visibilitychange',settle);query?.addEventListener?.('change',settle);
  page.addEventListener('pointerover',showTooltip);page.addEventListener('pointerleave',hideTooltip);page.addEventListener('focusin',showTooltip);page.addEventListener('focusout',focusOut);
  return ()=>{
    disposed=true;observer?.disconnect();if(frame)win.cancelAnimationFrame(frame);for(const timer of timers)win.clearTimeout(timer);timers.clear();running.clear();
    doc.removeEventListener('visibilitychange',settle);query?.removeEventListener?.('change',settle);
    page.removeEventListener('pointerover',showTooltip);page.removeEventListener('pointerleave',hideTooltip);page.removeEventListener('focusin',showTooltip);page.removeEventListener('focusout',focusOut);hideTooltip();
  };
}
