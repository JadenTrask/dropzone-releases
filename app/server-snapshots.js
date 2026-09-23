import {api} from './shared.js';
const snapshots=new Map(),pending=new Map();
const keyOf=options=>JSON.stringify(Object.fromEntries(Object.entries(options).filter(([k,v])=>k!=='refresh'&&v!=null&&v!==''&&!({type:'all',password:'any',sort:'players',dir:'desc',page:'1'}[k]===v)).sort(([a],[b])=>a.localeCompare(b))));
export function peekServers(options={}){return snapshots.get(keyOf(options))?.data;}
export function getServers(options={}){
 const key=keyOf(options),saved=snapshots.get(key);
 if(!options.refresh&&saved&&Date.now()-saved.time<60000)return Promise.resolve(saved.data);
 if(pending.has(key))return pending.get(key);
 const task=api.serverStatus(options).then(data=>{if(Array.isArray(data.rows)&&!data.error){if(snapshots.size>=24)snapshots.delete(snapshots.keys().next().value);snapshots.set(key,{data,time:Date.now()});}return data;}).finally(()=>pending.delete(key));pending.set(key,task);return task;
}
