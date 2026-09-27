import {e} from './shared.js';
// One app-wide watcher; only incoming, unaccepted relationships trigger a toast.
export function startFriendNotifications(call,openRequests,{interval=15000}={}){
 if(!call)return ()=>{};
 let stopped=false,busy=false,owner='',seen=new Set(),timer,lastRoster='';
 const notices=new Set();
 function dismiss(node){if(!notices.has(node))return;notices.delete(node);node.classList.add('is-leaving');setTimeout(()=>node.remove(),320);}
 function notify(friend){
  if(notices.size>=3){const oldest=notices.values().next().value;notices.delete(oldest);oldest.remove();}
  const node=document.createElement('aside');node.className='dz-friend-notification';node.setAttribute('role','status');node.setAttribute('aria-live','polite');
  node.innerHTML=`<img src="${e(friend.avatar||'./assets/icon.png')}" alt=""><div><span>FRIEND REQUEST</span><strong>${e(friend.display_name||friend.handle)}</strong><p>wants to add you on Dropzone.</p><button data-open>View requests →</button></div><button data-dismiss aria-label="Dismiss notification">×</button>`;
  let stack=document.querySelector('#dz-friend-notifications');if(!stack){stack=document.createElement('div');stack.id='dz-friend-notifications';document.body.append(stack);}stack.append(node);notices.add(node);
  node.querySelector('[data-dismiss]').onclick=()=>dismiss(node);
  node.querySelector('[data-open]').onclick=()=>{dismiss(node);openRequests();};
  setTimeout(()=>dismiss(node),5000);
 }
 async function poll(){if(stopped||busy)return;busy=true;try{
  const state=await call({action:'account-state'});if(stopped)return;
  const next=state.user?.id||'';
  if(next!==owner){owner=next;seen=new Set();lastRoster='';for(const n of [...notices])dismiss(n);try{seen=new Set(JSON.parse(sessionStorage.getItem('dz-friend-notices:'+owner)||'[]'));}catch{}}
  if(!owner)return;
  const friends=await call({action:'account-friends'});if(stopped||!Array.isArray(friends))return;
  const incoming=friends.filter(f=>f.incoming&&!f.accepted);
  // Forget withdrawn/accepted requests so a future new request can notify again.
  seen=new Set([...seen].filter(id=>incoming.some(f=>f.id===id)));
  let changed=false;for(const friend of incoming){if(!seen.has(friend.id)){seen.add(friend.id);notify(friend);changed=true;}}
  try{sessionStorage.setItem('dz-friend-notices:'+owner,JSON.stringify([...seen]));}catch{}
  const roster=JSON.stringify(friends);if(changed||roster!==lastRoster){lastRoster=roster;document.dispatchEvent(new Event('dropzone-friends-updated'));}
 }catch{/* Offline requests are retried on the next poll. */}finally{busy=false;}}
 void poll();timer=setInterval(poll,interval);
 return ()=>{stopped=true;clearInterval(timer);for(const n of [...notices])dismiss(n);};
}
