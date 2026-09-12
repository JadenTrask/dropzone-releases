import {cleanState} from './command-model.js';
export const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);};
export const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function cryptKey(raw){return crypto.subtle.importKey('raw',unb64(raw),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function encryptWorkspace(state,key){const iv=crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode(JSON.stringify(cleanState(state)));if(plain.length>500000)throw Error('Workspace sync supports up to 500 KB. Export a full backup for larger libraries.');const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await cryptKey(key),plain)),bytes=new Uint8Array(iv.length+encrypted.length);bytes.set(iv);bytes.set(encrypted,iv.length);return b64(bytes);}
export async function decryptWorkspace(payload,key){if(typeof payload!=='string'||payload.length>740000)throw Error('Encrypted workspace is too large.');const bytes=unb64(payload);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},await cryptKey(key),bytes.slice(12));return cleanState(JSON.parse(new TextDecoder().decode(plain)));}
async function copyId(record){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(record)));return 'conflict-'+Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');}
export async function mergeWorkspaces(local,remote){
 const records=[...local.records],byId=new Map(records.map(r=>[r.id,r]));
 for(const incoming of remote.records){const old=byId.get(incoming.id);if(!old){records.push(incoming);byId.set(incoming.id,incoming);continue;}if(JSON.stringify(old)===JSON.stringify(incoming))continue;
  const newer=Date.parse(incoming.updatedAt)>Date.parse(old.updatedAt),preserved=newer?old:incoming,id=await copyId(preserved);
  if(!byId.has(id)){const copy={...preserved,id,title:(preserved.title+' · conflict copy').slice(0,120)};records.push(copy);byId.set(id,copy);}
  if(newer){records[records.indexOf(old)]=incoming;byId.set(incoming.id,incoming);}
 }
 return cleanState({...local,records});
}
