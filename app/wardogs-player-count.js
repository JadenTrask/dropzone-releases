import {getServers} from './server-snapshots.js';
import {api} from './shared.js';
let timer,active=false,busy=false,generation=0;
export function showPlayerCount(enabled){
 const node=document.querySelector('#wardogs-player-count');if(!node)return;node.hidden=!enabled;
 if(active===enabled)return;active=enabled;generation++;clearInterval(timer);
 if(enabled){refresh();timer=setInterval(refresh,60000);}
}
async function refresh(){
 if(!active||busy||document.hidden)return;busy=true;const ticket=generation,node=document.querySelector('#wardogs-player-count');
 try{const d=await getServers({});if(ticket!==generation)return;const n=d.all?.players,valid=Number.isFinite(n)&&n>=0,fresh=valid&&!d.stale&&!d.error;
 node.dataset.fresh=String(fresh);node.querySelector('span').textContent=valid?`${n.toLocaleString()} players${fresh?'':' · older data'}`:'Players unavailable';
 node.title=`Players across all servers listed by wardogservers.com; coverage may not include every server. ${d.checkedAt?'Checked '+new Date(d.checkedAt).toLocaleTimeString():''}`;
 }catch{if(ticket===generation){node.dataset.fresh='false';node.querySelector('span').textContent='Players unavailable';}}finally{busy=false;}
}
