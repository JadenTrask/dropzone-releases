import {RELEASE_NOTES,shouldShowRelease} from './release-notes.js';
import {APP_VERSION} from './version.js';
import {e,stored,persist} from './shared.js';
const key='dropzone-whats-new-seen';
export function releaseNotesSection(){return `<section class="release-notes"><span class="hub-eyebrow">WHAT'S NEW / ${e(RELEASE_NOTES.version)}</span><h2>${e(RELEASE_NOTES.title)}</h2><div class="release-highlights">${RELEASE_NOTES.items.map(item=>`<article><h3>${e(item.title)}</h3><p>${e(item.body)}</p></article>`).join('')}</div></section>`;}
export function startWhatsNew(navigate){
 if(RELEASE_NOTES.version!==APP_VERSION||!shouldShowRelease(stored(key,null),APP_VERSION))return;
 const show=()=>{
  if(document.hidden||document.querySelector('.dz-intro,dialog[open],.wd-tutorial-overlay')){setTimeout(show,500);return;}
  const dialog=document.createElement('dialog');dialog.className='whats-new-dialog';dialog.setAttribute('aria-labelledby','whats-new-title');dialog.innerHTML=`<div class="whats-new-top"><img src="assets/brand.svg" width="36" height="36" alt=""><span>DROPZONE ${e(APP_VERSION)}</span><button class="hub-button secondary" data-close aria-label="Close what's new">×</button></div><h1 id="whats-new-title">Your next round starts here.</h1><p class="whats-new-lead">Here's what's new in this update.</p>${releaseNotesSection()}<footer><button class="hub-button secondary" data-notes>App updates</button><button class="hub-button" data-close autofocus>Let's go</button></footer>`;
  document.body.append(dialog);dialog.addEventListener('close',()=>{try{persist(key,APP_VERSION);}catch{}dialog.remove();},{once:true});dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());dialog.querySelector('[data-notes]').onclick=()=>{dialog.close();navigate('updates');};dialog.showModal();
 };
 setTimeout(show,900);
}
