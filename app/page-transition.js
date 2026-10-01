let revision=0,current;
export async function transitionPage(render){
 const ticket=++revision;current?.skipTransition();current=null;
 document.documentElement.classList.remove('dz-transitioning');
 if(document.visibilityState==='hidden'||document.querySelector('.dz-intro')||!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('cc-reduced-motion')||document.body?.classList.contains('app-reduced-motion'))return render();
 let resolve,reject,started=false;
 const rendered=new Promise((done,fail)=>{resolve=done;reject=fail;});
 // Keep application errors separate from optional snapshot/animation failures.
 // An async route may remain pending while its loading view is already visible.
 rendered.catch(()=>{});
 const update=()=>{
  if(started)return;started=true;
  if(ticket!==revision){resolve();return;}
  try{Promise.resolve(render()).then(resolve,reject);}catch(error){reject(error);}
  // Do not return the provider promise: Chromium suppresses paints until the
  // update callback settles. The original 300ms workspace crossfade starts now.
 };
 try{
  // A persistent named snapshot root suppresses descendant backdrop sampling
  // in Chromium, even when no transition is active. Scope it to the capture.
  document.documentElement.classList.add('dz-transitioning');
  const transition=document.startViewTransition(update);current=transition;
  transition.ready.catch(()=>{});
  transition.updateCallbackDone.catch(reject);
  const clear=()=>{if(current===transition){current=null;document.documentElement.classList.remove('dz-transitioning');}};
  transition.finished.then(clear,clear);
 }catch{document.documentElement.classList.remove('dz-transitioning');update();}
 return rendered;
}
