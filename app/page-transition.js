let current;
export async function transitionPage(render){
 current?.skipTransition();
 if(!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('cc-reduced-motion'))return render();
 // Browser snapshots preserve canvas pixels, scrolling, and the existing layout.
 // Await the destination's initial render before starting a single crossfade.
 const transition=document.startViewTransition(async()=>{await render();});current=transition;
 try{await transition.updateCallbackDone;await transition.finished;}finally{if(current===transition)current=null;}
}
