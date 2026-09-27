// Route changes collapse the rail until the pointer leaves its previous footprint.
let release=null;
export function lockRailHover(rail=document.querySelector('.app-rail')){
 if(!rail||!rail.matches(':hover'))return;
 release?.();
 const bounds=rail.getBoundingClientRect();
 rail.classList.add('rail-hover-locked');
 const move=e=>{if(e.clientX<bounds.left||e.clientX>=bounds.right||e.clientY<bounds.top||e.clientY>=bounds.bottom)release();};
 release=()=>{rail.classList.remove('rail-hover-locked');document.removeEventListener('pointermove',move);release=null;};
 document.addEventListener('pointermove',move,{passive:true});
}
