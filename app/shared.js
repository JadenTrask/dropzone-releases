import {escapeHtml as e} from './engine.js';
export {e};
export const $=s=>document.querySelector(s);
export const date=v=>{const d=new Date(v);return v&&Number.isFinite(d.getTime())?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'Not supplied';};
export const dateTime=v=>{const d=new Date(v);return v&&Number.isFinite(d.getTime())?d.toLocaleString(): 'Not checked this session';};
export const api=window.rift||{
  games:()=>fetch('/api/games').then(r=>r.json()),
  loadouts:options=>fetch('/api/loadouts?'+new URLSearchParams(options)).then(r=>r.json()),
  media:options=>fetch('/api/media?'+new URLSearchParams(options||{})).then(r=>r.json()),
  patches:options=>fetch('/api/patches?'+new URLSearchParams(options||{})).then(r=>r.json()),
  siege:options=>fetch('/api/siege?'+new URLSearchParams(options||{})).then(r=>r.json()),
  wardogs:options=>fetch('/api/wardogs?'+new URLSearchParams(options||{})).then(r=>r.json()),
  updates:refresh=>fetch('/api/updates',{method:refresh?'POST':'GET'}).then(r=>r.json()),
  copy:text=>navigator.clipboard.writeText(text),
  exportFile:async(name,data)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return {saved:true};},
  openSource:url=>window.open(url,'_blank','noopener,noreferrer')
};
export function stored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
export function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{throw new Error('Your device could not save this playbook. Storage may be full.');}}
let timer;
export function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),5000);}
export const opts=(values,selected)=>values.map(([id,label])=>`<option value="${e(id)}" ${id===selected?'selected':''}>${e(label)}</option>`).join('');
