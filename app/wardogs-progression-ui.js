import {$,api} from './shared.js';
const pages={progression:'https://metaforge.app/wardogs/progression',profile:'https://metaforge.app/wardogs/player-stats',career:'https://metaforge.app/wardogs/progression/tables/career'};
let active=false,generation=0,resize=null,observer=null,unsubscribe=null,frame=0,page='progression';
function send(action,extra={}){return api.metaforgePanel?.({action,token:generation,...extra});}
function layout(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!active)return;const slot=$('#mf-slot');if(!slot)return;const r=slot.getBoundingClientRect(),covered=document.querySelector('dialog[open],.font-menu[open]');send('layout',{bounds:covered?null:{x:r.x,y:r.y,width:r.width,height:r.height}})?.catch(()=>{});});}
export function leaveWardogsProgression(){if(!active)return;active=false;send('hide')?.catch(()=>{});cancelAnimationFrame(frame);resize?.disconnect();observer?.disconnect();unsubscribe?.();removeEventListener('resize',layout);document.removeEventListener('scroll',layout,true);}
export function mountWardogsProgression(){
 leaveWardogsProgression();active=true;generation++;page='progression';
 const native=!!api.metaforgePanel;
 $('#hub-app').innerHTML=`<main class="hub-main mf-page"><header class="mf-heading"><div><span class="hub-eyebrow">WARDOGS / METAFORGE</span><h1>Progression</h1></div><div class="mf-actions"><button class="hub-button secondary" id="mf-reload" ${native?'':'disabled'}>Reload</button><button class="hub-button" id="mf-external">Open in browser ↗</button></div></header><nav class="mf-tabs" aria-label="MetaForge progression pages"><button data-mf-page="progression" aria-pressed="true">Progression & unlocks</button><button data-mf-page="profile" aria-pressed="false">Player profile</button><button data-mf-page="career" aria-pressed="false">Career table</button></nav><div class="mf-notice"><strong>metaforge.app</strong><span id="mf-status" role="status">${native?'Loading MetaForge…':'The embedded website is available in the Windows app. Use Open in browser here.'}</span></div><div id="mf-slot" class="mf-slot"><div class="mf-placeholder"><h2>${native?'Connecting to MetaForge':'Continue on MetaForge'}</h2><p>${native?'If the page stays blank or sign-in is blocked, use Open in browser above.':'Open the selected page using the button above.'}</p></div></div><p class="mf-footer">Live third-party website. Dropzone does not import your progression or account tokens. Browser sign-in and the in-app session are separate.</p></main>`;
 $('#mf-external').onclick=()=>api.openSource(pages[page]);
 $('#mf-reload').onclick=()=>send('reload')?.catch(showError);
 document.querySelectorAll('[data-mf-page]').forEach(button=>button.onclick=()=>{page=button.dataset.mfPage;document.querySelectorAll('[data-mf-page]').forEach(b=>b.setAttribute('aria-pressed',b===button));send('page',{page})?.catch(showError);});
 if(!native)return;
 const mine=generation;
 unsubscribe=api.onMetaForgeStatus(value=>{if(active&&value.token===mine){const el=$('#mf-status');if(el){el.textContent=value.message;el.dataset.state=value.status;}}});
 const slot=$('#mf-slot'),r=slot.getBoundingClientRect();
 send('show',{page,bounds:{x:r.x,y:r.y,width:r.width,height:r.height}}).catch(showError);
 resize=new ResizeObserver(layout);resize.observe(slot);observer=new MutationObserver(layout);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 addEventListener('resize',layout);document.addEventListener('scroll',layout,true);
}
function showError(){if(active&&$('#mf-status'))$('#mf-status').textContent='The panel could not open. Use Open in browser.';}
