let revision=0,animation;
export async function transitionPage(render){
 const ticket=++revision;animation?.cancel();animation=null;
 // Full-page snapshots can suspend canvas frames and wait on provider work.
 // Render the destination immediately so its loading state stays interactive.
 const result=await render();
 if(ticket!==revision||document.visibilityState==='hidden'||document.querySelector('.dz-intro')||matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('cc-reduced-motion')||document.body?.classList.contains('app-reduced-motion'))return result;
 const content=document.querySelector('#hub-app>.hub-main,#league-app:not([hidden])');
 // A compositor fade neither captures the outgoing map nor blocks navigation.
 animation=content?.animate?.([{opacity:.96},{opacity:1}],{duration:120,easing:'ease-out'});
 return result;
}
