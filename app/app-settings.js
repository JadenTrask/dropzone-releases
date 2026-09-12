import {stored,persist,e} from './shared.js';
const key='dropzone-accessibility-v1';
const preferences=()=>stored(key,null)||stored('dropzone-command-v1',{}).preferences||{};
export function applyAccessibility(){const p=preferences();document.body.classList.toggle('app-high-contrast',!!p.contrast);document.body.classList.toggle('app-reduced-motion',!!p.reducedMotion);}
export function mountSettings(games=[]){
 const p=preferences(),startup=stored('dropzone-startup-game','last');
 const choices=[['last','Last workspace'],['home','Game library'],...games.filter(g=>g.status==='active'&&g.kind!=='collection').map(g=>[g.id,g.name])];
 document.querySelector('#hub-app').innerHTML=`<main class="hub-main app-settings"><header><span class="hub-eyebrow">DROPZONE</span><h1>Settings</h1></header><section class="panel"><h2>Startup</h2><label>Open Dropzone to<select id="startup-game">${choices.map(([id,label])=>`<option value="${e(id)}" ${id===startup?'selected':''}>${e(label)}</option>`).join('')}</select></label><p>Your choice applies the next time you open Dropzone.</p></section><section class="panel"><h2>Accessibility</h2><p>Applies throughout Dropzone. Text size is available in the top bar.</p><label><input type="checkbox" data-access="contrast" ${p.contrast?'checked':''}> High contrast</label><label><input type="checkbox" data-access="reducedMotion" ${p.reducedMotion?'checked':''}> Reduce motion</label></section></main>`;
 document.querySelector('#startup-game').onchange=event=>persist('dropzone-startup-game',event.target.value);
 document.querySelectorAll('[data-access]').forEach(input=>input.onchange=()=>{persist(key,{...preferences(),[input.dataset.access]:input.checked});applyAccessibility();});
}
