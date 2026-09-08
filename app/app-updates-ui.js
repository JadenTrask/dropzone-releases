import {$,api,e,dateTime,toast} from './shared.js';
import {APP_VERSION} from './version.js';
let state={version:APP_VERSION,status:'disabled',reason:'development',enabled:false},started=false;
const disabled={unconfigured:'App updates are not connected yet.',portable:'Install Dropzone using the setup file to receive app updates.',development:'App updates are available in the installed Windows app.',platform:'App updates are available on Windows.',configuration:'The release destination needs to be corrected in the next build.'};
function description(){
  if(state.status==='disabled')return disabled[state.reason]||'App updates are unavailable.';
  if(state.status==='error')return state.error;
  if(state.status==='downloading')return `Downloading ${state.availableVersion} · ${Math.round(state.percent||0)}%`;
  if(state.status==='ready')return `${state.availableVersion} is ready. Restart when it suits you.`;
  if(state.status==='installing')return 'Restarting to install the update…';
  if(state.status==='checking')return 'Checking for a new app version…';
  if(state.status==='current')return 'You have the latest published release.';
  return 'Checks on launch and every six hours. Downloads happen in the background.';
}
export function appUpdateCard(){return `<section class="app-update-card" id="app-update-card" aria-label="Installed app and update status"><div class="app-update-heading"><div class="installed-build"><img src="assets/brand.svg" width="56" height="56" alt=""><div><span class="installed-label">Installed version</span><h2>${e(state.version)}</h2></div></div><button class="hub-button ${state.status==='ready'?'':'secondary'}" data-app-update-action="${state.status==='ready'?'install':'check'}" ${!state.enabled||['checking','downloading','installing'].includes(state.status)?'disabled':''}>${state.status==='ready'?'Restart & update':state.status==='error'?'Try again':'Check for updates'}</button></div><div class="app-update-status"><p role="status">${e(description())}</p>${state.status==='downloading'?`<progress max="100" value="${Number(state.percent)||0}" aria-label="App update download"></progress>`:''}<p class="app-update-last-check">${state.checkedAt?`Last checked ${e(dateTime(state.checkedAt))}`:'No completed check this session.'}</p></div></section>`;}

function receive(next){if(!next||typeof next.status!=='string')return;state=next;const card=$('#app-update-card');if(card)card.outerHTML=appUpdateCard();const button=$('#app-update-ready');if(button){button.hidden=!['ready','downloading','error'].includes(state.status);button.textContent=state.status==='ready'?'Update ready':state.status==='error'?'App update failed':`Updating ${Math.round(state.percent||0)}%`;}}
export function startAppUpdates(){
  if(started)return;started=true;
  document.querySelectorAll('[data-app-version]').forEach(el=>el.textContent=APP_VERSION);
  api.onAppUpdate?.(receive);
  api.appUpdates?.().then(receive).catch(()=>{});
  document.addEventListener('click',async event=>{
    const action=event.target.closest('[data-app-update-action]')?.dataset.appUpdateAction;if(!action)return;
    try{if(action==='install'){if(!await api.installAppUpdate())toast('The update is not ready to install.');}else receive(await api.checkAppUpdates());}catch{toast('Could not complete the app update. Try again later.');}
  });
}

export function mountAppUpdates(){$('#hub-app').innerHTML=`<main class="hub-main app-updates-page"><div class="app-updates-layout"><header class="app-updates-intro"><h1>App updates</h1><p>Manage your installed version of Dropzone.</p></header>${appUpdateCard()}</div></main>`;}
