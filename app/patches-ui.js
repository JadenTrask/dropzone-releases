import {renderNewsPage} from './news-view.js';
import {$,api,toast} from './shared.js';
let active=false,selectedGame=null,request=0,data=null,loading=false,error=null,gameName='',target=null;
export function leavePatches(){active=false;target=null;++request;}
export async function mountPatches(game,container=$('#hub-app')){active=true;target=container;selectedGame=game.id;gameName=game.name;data=null;await load();}
async function load(refresh=false){
  const token=++request;loading=true;error=null;render();
  try {
    const next=await api.patches({game:selectedGame,refresh});
    if(token!==request||!active)return;
    if(next?.game!==selectedGame||!Array.isArray(next.articles))throw new Error(next?.error||'News could not be loaded.');
    data=next;
  }catch(err){if(token!==request||!active)return;error=err.message;}
  if(token!==request||!active)return;loading=false;render();
}
function render(){
  if(!active||!target?.isConnected)return;
  target.innerHTML=renderNewsPage({gameName,selectedGame,data,loading,error,embedded:target.id!=='hub-app'});
}
document.addEventListener('click',event=>{if(active&&target?.contains(event.target)&&event.target.closest('#refresh-patches'))load(true).catch(err=>toast(err.message));});
window.addEventListener('tbb-sources-updated',()=>{if(active&&!loading)load();});
