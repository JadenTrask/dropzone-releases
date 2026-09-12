import maps from './data/wardogs/maps.json' with {type:'json'};
import {api,stored,persist} from './shared.js';
import {validPoint} from './wardogs-model.js';
let connection=null,room=null,generation=0,timer=null,busy=false,message='Not connected',follow=null,share=false,queued=null;
const call=input=>api.squad?api.squad(input):fetch('/api/squad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}).then(r=>r.json());
export const squadState=()=>({connected:!!connection,room,message,follow,share,saved:!!stored('dropzone-squad-connection',null),owner:!!connection?.owner});
function emit(){window.dispatchEvent(new CustomEvent('dropzone-squad-state',{detail:squadState()}));}
function accept(value){
 const map=maps.maps.find(m=>m.id===value?.map);if(!map||value.revision!==maps.revision||!Array.isArray(value.markers)||value.markers.length>60||!Number.isInteger(value.version)||!value.markers.every(m=>validPoint(m,map)&&typeof m.label==='string'&&m.label.length<=60&&typeof m.id==='string'&&['target','rally','gun','note'].includes(m.type)))throw Error('Received an invalid or mismatched squad map.');
 if(room&&room.version>value.version)return;
 const old=room?.markers.find(m=>m.id===follow);room=value;message='Connected · checked '+new Date().toLocaleTimeString();
 const next=room.markers.find(m=>m.id===follow);if(follow&&!next)follow=null;
 if(next&&(!old||old.x!==next.x||old.y!==next.y))window.dispatchEvent(new CustomEvent('dropzone-squad-target',{detail:{...next,map:room.map}}));emit();
}
async function poll(){if(!connection||busy)return;const g=generation;try{const r=await call({action:'get',code:connection.code,revision:maps.revision});if(g!==generation)return;if(r.error)throw Error(r.error);accept(r.room);}catch(err){if(g===generation){message='Offline / stale · '+err.message;emit();}}}
export async function connectSquad({code,map,restore=false}={}){
 const g=++generation;clearInterval(timer);connection=null;room=null;follow=null;share=false;queued=null;busy=false;message='Connecting…';emit();
 const saved=restore?stored('dropzone-squad-connection',null):null;if(restore&&!saved){message='No saved room. Create one or paste an invite code.';emit();throw Error(message);}if(saved)code=saved.code;
 try{const result=await call(code?{action:'get',code,revision:maps.revision}:{action:'create',map,revision:maps.revision});if(g!==generation)return;if(result.error)throw Error(result.error);
 accept(result.room);connection={code:result.code||code,owner:result.owner||saved?.owner||null};persist('dropzone-squad-connection',connection);emit();timer=setInterval(poll,2000);
 }catch(err){if(g===generation){message=err.message;emit();}throw err;}
}
export function leaveSquad(){generation++;connection=null;room=null;follow=null;share=false;queued=null;busy=false;clearInterval(timer);message='Disconnected. Local markers are unchanged.';emit();}
export const inviteCode=()=>connection?.code;
export async function editSquad(action,values={}){
 if(!connection||!room)throw Error('Connect to a squad room first.');if(busy)throw Error('A marker is still sending. Try again in a moment.');
 const g=generation;busy=true;try{const r=await call({action,code:connection.code,owner:action==='close'?connection.owner:undefined,revision:maps.revision,version:room.version,...values});if(g!==generation)return;if(r.error){if(r.status===409){busy=false;await poll();}throw Error(r.error);}if(r.closed){persist('dropzone-squad-connection',null);leaveSquad();return;}accept(r.room);
 }finally{if(g===generation){busy=false;if(queued){const p=queued;queued=null;publishTarget(p);}}}
}
export function followTarget(id){follow=id||null;const target=room?.markers.find(m=>m.id===id);if(target)window.dispatchEvent(new CustomEvent('dropzone-squad-target',{detail:{...target,map:room.map}}));emit();}
export function setSharing(value){share=!!value;if(!share)queued=null;emit();}
export function publishTarget(value){
 if(!share||!connection||!room||room.map!==value.map||!value.target)return;
 if(busy){queued=value;return;}const id=stored('dropzone-spotter-id',null)||crypto.randomUUID();persist('dropzone-spotter-id',id);
 editSquad('put',{marker:{...value.target,id:'spot-'+id,type:'target',label:'Spotter target'}}).catch(err=>{message='Target not sent · '+err.message;emit();});
}
window.addEventListener('dropzone-local-target',ev=>publishTarget(ev.detail));
