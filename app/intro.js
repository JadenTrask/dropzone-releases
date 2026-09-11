// Animate over the actual destination; never swap to a second splash window.
const native=window.rift?.desktop,preview=new URLSearchParams(location.search).has('intro');
if(native||preview){
  const overlay=document.createElement('div');overlay.className='dz-intro';overlay.setAttribute('aria-hidden','true');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  overlay.innerHTML='<div class="dz-intro-content"><img class="dz-intro-image" src="assets/intro/dropzone-still.webp" alt=""></div>';
  document.body.append(overlay);
  let started=false,elapsed=false,ready=false,finished=false;
  const reveal=()=>{
    if(finished||!ready||!elapsed)return;
    finished=true;overlay.classList.add('dz-intro-leave');
    setTimeout(()=>overlay.remove(),reduced?0:650);
  };
  const start=()=>{
    if(started)return;started=true;
    if(!reduced)overlay.querySelector('img').src='assets/intro/dropzone-intro.webp';
    overlay.classList.add('dz-intro-playing');
    setTimeout(()=>{elapsed=true;reveal();},reduced?0:2050);
  };
  window.addEventListener('dropzone-page-ready',()=>{ready=true;overlay.classList.add('dz-intro-ready');reveal();},{once:true});
  if(native)window.rift.onStartupReveal(start);else start();
  // A stalled renderer or lost IPC must not trap the user behind the overlay.
  setTimeout(()=>{ready=true;elapsed=true;reveal();},10000);
}
