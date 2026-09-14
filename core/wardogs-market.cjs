'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const SOURCE='https://wardogshub.gg/gold-market/';
function validate(points){
 if(!Array.isArray(points)||!points.length||points.length>10000)throw Error('Price history is missing.');
 let previous='';return points.map(p=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||new Date(p.date).toISOString().slice(0,10)!==p.date||p.date<=previous||!Number.isFinite(p.rate)||p.rate<=0)throw Error('Invalid price history.');previous=p.date;return {date:p.date,rate:p.rate};});
}
function parse(html){const match=html.match(/<script\b[^>]*\bdata-gold-series\b[^>]*>([\s\S]*?)<\/script>/i);if(!match)throw Error('The source changed its price format.');return validate(JSON.parse(match[1]));}
class MarketProvider{
 constructor({cacheDir,bundleDir,fetcher=fetch,now=()=>new Date()}){Object.assign(this,{cacheDir,bundleDir,fetcher,now});this.retryAfter=0;}
 async get(){if(this.pending)return this.pending;this.pending=this.load().finally(()=>this.pending=null);return this.pending;}
 async load(){
 const now=this.now(),today=now.toISOString().slice(0,10);let data=this.data;
 if(!data){for(const file of [path.join(this.cacheDir,'market.json'),path.join(this.bundleDir,'gold-market.json')]){try{const d=JSON.parse(await fs.readFile(file,'utf8'));validate(d.points);if(!Number.isFinite(Date.parse(d.checkedAt)))throw Error();data=d;break;}catch{}}}
 let error=null;
 if((!data||data.checkedAt.slice(0,10)!==today)&&now.getTime()>=this.retryAfter){try{
 const response=await this.fetcher(SOURCE,{signal:AbortSignal.timeout(12000),redirect:'error',headers:{Accept:'text/html'}});if(!response.ok)throw Error('Source returned '+response.status);
 let html='';for await(const chunk of response.body){html+=Buffer.from(chunk).toString('utf8');if(html.length>2000000)throw Error('Source response was too large.');}
 const points=parse(html);if(points.at(-1).date>today)throw Error('Source contains future prices.');
 data={points,checkedAt:now.toISOString()};await fs.mkdir(this.cacheDir,{recursive:true});await fs.writeFile(path.join(this.cacheDir,'market.json'),JSON.stringify(data));
 }catch{error='Could not refresh WARDOGS Hub. Showing the last available daily history.';this.retryAfter=now.getTime()+15*60000;}}
 this.data=data;return {points:data?.points||[],checkedAt:data?.checkedAt||null,source:SOURCE,stale:!data||data.points.at(-1).date!==today,error:error||(!data?'Price history is unavailable.':null)};
 }
}
module.exports={MarketProvider,parse,validate,SOURCE};
