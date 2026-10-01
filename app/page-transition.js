let current;
export async function transitionPage(render){
 current?.skipTransition();
 // View-transition snapshots paint above the splash, even with its high z-index.
 // Render behind it until its exit finishes; later navigation keeps the crossfade.
 if(document.visibilityState==='hidden'||document.querySelector('.dz-intro')||!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('cc-reduced-motion'))return render();
 // Browser snapshots preserve canvas pixels, scrolling, and the existing layout.
 // Await the destination's initial render before starting a single crossfade.
 const transition=document.startViewTransition(async()=>{await render();});current=transition;
 // A page hidden during navigation can abort its visual snapshot. The render
 // still completes; consume only that optional animation readiness rejection.
 transition.ready?.catch(()=>{});
 try{await transition.updateCallbackDone;await transition.finished;}finally{if(current===transition)current=null;}
}
