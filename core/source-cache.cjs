'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const text=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
function decode(v){return String(v??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,k)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[k.toLowerCase()]??(k[0]==='#'?String.fromCodePoint(Math.min(0x10ffff,parseInt(k.slice(k[1]?.toLowerCase()==='x'?2:1),k[1]?.toLowerCase()==='x'?16:10)||32)):_)));}
function tag(xml,name){return decode(xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+name+'>','i'))?.[1]||'');}
function iso(v){const n=Date.parse(v);if(!Number.isFinite(n)||n<=0||n>Date.now()+86400000)throw new Error('The source did not supply a valid date.');return new Date(n).toISOString();}
async function requestText(url){
  const r=await fetch(url,{cache:'no-store',headers:{'User-Agent':'Dropzone/2.3 (independent desktop companion)','Accept':'text/html, application/xml, application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(18000),redirect:'error'});
  if(!r.ok)throw new Error(`Source unavailable (HTTP ${r.status}).`);
  const limit=12*1024*1024;if(Number(r.headers.get('content-length'))>limit)throw new Error('Source response too large.');
  const chunks=[];let size=0;const reader=r.body.getReader();
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Source response too large.');}chunks.push(Buffer.from(value));}
  return Buffer.concat(chunks).toString('utf8');
}
// Every cache keeps publication time and successful fetch time distinct.
// A failed request never makes an old snapshot appear newly checked.
class SourceCache{
  constructor({id,url,cacheDir,bundleDir,normalize,validate,requestFn=requestText,now=Date.now}){Object.assign(this,{id,url,cacheDir,bundleDir,normalize,validate,requestFn,now});this.pending=null;this.result=null;this.attemptedAt=null;}
  async read(dir){try{const d=JSON.parse(await fs.readFile(path.join(dir,this.id+'.json'),'utf8'));return d.schema===1&&d.feed===this.id&&this.validate(d)?d:null;}catch{return null;}}
  async get(refresh=false){
    if(this.pending)return this.pending;
    // Disk age never skips the first network request in a new app process.
    // Keep the last attempt in memory, including errors, when views reopen.
    const ttl=this.result?.error?60_000:15*60_000;
    if(!refresh&&this.result&&this.now()-Date.parse(this.attemptedAt)<ttl)return structuredClone({...this.result,cacheState:this.result.error?'offline':'cached'});
    this.attemptedAt=new Date(this.now()).toISOString();
    this.pending=(async()=>{
      const [disk,bundle]=await Promise.all([this.read(this.cacheDir),this.read(this.bundleDir)]),cached=disk||bundle;
      try{
      const d={...this.normalize(await this.requestFn(this.url)),schema:1,feed:this.id,fetchedAt:new Date(this.now()).toISOString()};
      if(!this.validate(d))throw new Error('The source returned incomplete data.');
      await fs.mkdir(this.cacheDir,{recursive:true});const file=path.join(this.cacheDir,this.id+'.json');await fs.writeFile(file+'.tmp',JSON.stringify(d));await fs.rename(file+'.tmp',file);
      return {...d,cacheState:'live',attemptedAt:this.attemptedAt};
    }catch(error){if(cached)return {...cached,cacheState:'offline',error:text(error.message),attemptedAt:this.attemptedAt};throw error;}})();
    try{this.result=await this.pending;return structuredClone(this.result);}finally{this.pending=null;}
  }
}
module.exports={SourceCache,requestText,text,decode,tag,iso};
