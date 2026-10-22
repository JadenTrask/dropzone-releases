let revision=0,current;
export async function transitionPage(render,{target}={}){
 const ticket=++revision;
 current?.cancel();current=null;
 const result=await render();
 if(ticket!==revision)return result;
 const content=target&&document.querySelector(target);
 if(!content?.isConnected||document.visibilityState==='hidden'||document.querySelector('.dz-intro')||matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('cc-reduced-motion')||document.body?.classList.contains('app-reduced-motion'))return result;
 // Animate the live content only: snapshots resize views and interrupt glass sampling.
 try{
  current=content.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'});
  current.finished.catch(()=>{});
 }catch{} // Optional motion must not prevent a screen from rendering.
 return result;
}
