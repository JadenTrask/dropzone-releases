// The same final Blender frame bridges the splash and the ready application.
const native=window.rift?.desktop,preview=new URLSearchParams(location.search).has('intro');
if(native||preview){
  const overlay=document.createElement('div');overlay.className='dz-intro';overlay.setAttribute('aria-hidden','true');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  overlay.innerHTML=`<div class="dz-intro-content"><img class="dz-intro-image" src="assets/intro/${preview&&!reduced?'dropzone-intro':'dropzone-still'}.webp" alt=""><h1>DROPZONE</h1><p>YOUR GAMES. YOUR SPACE.</p></div>`;
  document.body.append(overlay);
  let finished=false;const reveal=()=>{if(finished)return;finished=true;overlay.classList.add('dz-intro-leave');setTimeout(()=>overlay.remove(),450);};
  if(native)window.rift.onStartupReveal(reveal);else setTimeout(reveal,reduced?0:2000);
  // Renderer recovery must never strand someone behind an intro.
  setTimeout(reveal,10500);
}
