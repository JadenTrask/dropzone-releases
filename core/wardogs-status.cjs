'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const SOURCE='https://wardogshub.gg/status/';
function parse(html){
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 const number=pattern=>{const m=text.match(pattern);return m?Number(m[1].replaceAll(',','')):null;};
 const reports15=number(/([\d,]+) players? (?:has|have) reported a problem in the last 15 minutes/),reports24=number(/([\d,]+) players? (?:has|have) reported a problem in the last 24 hours/),players=number(/Players in game ([\d,]+) Concurrent players on Steam/),sourceTime=text.match(/Checked (\d{2}:\d{2}) UTC/)?.[1]||null;
 if(reports15===null&&reports24===null&&players===null)throw Error('Status source format changed.');
 return {reports15,reports24,players,sourceTime};
}
class StatusProvider{
 constructor({cacheDir,fetcher=fetch,now=()=>Date.now()}){Object.assign(this,{cacheDir,fetcher,now});this.retryAfter=0;}
 async get(){if(this.pending)return this.pending;this.pending=this.load().finally(()=>this.pending=null);return this.pending;}
 async load(){let data=this.data;const now=this.now();if(!data){try{const d=JSON.parse(await fs.readFile(path.join(this.cacheDir,'status.json'),'utf8'));if(Number.isFinite(Date.parse(d.checkedAt))&&['reports15','reports24','players'].every(k=>d[k]===null||Number.isFinite(d[k])&&d[k]>=0))data=d;}catch{}}
 let error=null;if((!data||now-Date.parse(data.checkedAt)>=300000)&&now>=this.retryAfter){try{const r=await this.fetcher(SOURCE,{signal:AbortSignal.timeout(12000),redirect:'error'});if(!r.ok)throw Error();let html='';for await(const chunk of r.body){html+=Buffer.from(chunk).toString('utf8');if(html.length>2000000)throw Error();}data={...parse(html),checkedAt:new Date(now).toISOString()};await fs.mkdir(this.cacheDir,{recursive:true});await fs.writeFile(path.join(this.cacheDir,'status.json'),JSON.stringify(data));}catch{error='Could not refresh the status source.';this.retryAfter=now+60000;}}
 this.data=data;return {...data,source:SOURCE,stale:!data||now-Date.parse(data.checkedAt)>=300000,error};
 }
}
module.exports={StatusProvider,parse};
