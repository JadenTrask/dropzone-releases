// Only small local workspace code is warmed. No mounts, service calls, images,
// account data, map datasets, canvas instances or recurring timers are started.
const safeModules=new Set(['finals-ui','siege-ui','apex-ui']);
export function scheduleFeatureWarmup({load,preferred=[],host=window,document:doc=document}){
 const queue=[...new Set([...preferred,'finals-ui','siege-ui'])].filter(m=>safeModules.has(m)).slice(0,2);
 let stopped=false,running=false,id=null,timer=null;
 const schedule=()=>{if(stopped||running||!queue.length||doc.hidden)return;id=host.requestIdleCallback(async deadline=>{
  id=null;
  if(stopped||doc.hidden)return;
  if(deadline.timeRemaining()<8){schedule();return;}
  running=true;
  try{await load(queue.shift());}catch{/* Navigation can retry a failed local read. */}
  running=false;
  schedule();
 });};
 const visible=()=>{if(!doc.hidden&&id===null&&timer===null)schedule();};
 if(typeof host.requestIdleCallback!=='function')return ()=>{};
 // First destination and intro take precedence over optional warmup.
 timer=host.setTimeout(()=>{timer=null;schedule();},1500);
 doc.addEventListener('visibilitychange',visible);
 return ()=>{stopped=true;host.clearTimeout(timer);if(id!==null)host.cancelIdleCallback?.(id);doc.removeEventListener('visibilitychange',visible);};
}
