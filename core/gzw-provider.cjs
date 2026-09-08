'use strict';
const crypto=require('node:crypto');
const {SourceCache,requestText,text}=require('./source-cache.cjs');
const BASE='https://gzw-data.dev/api/v1/';
const DATASETS=['tasks','main_task','side_task','hidden_task','contract','squad_strike_missions','keys','keycards'];
const TYPES={main_task:'Main mission',side_task:'Side mission',hidden_task:'Hidden mission',contract:'Contract',squad_strike_missions:'Squad mission'};
const clean=(v,max=500)=>text(v).slice(0,max);
const wiki=name=>'https://gray-zone-warfare.fandom.com/wiki/'+encodeURIComponent(name.replaceAll(' ','_'));
function normalizeGzw(input){
  const raw=typeof input==='string'?JSON.parse(input):input;
  const tasks=new Map(),keys=new Map(),versions=[];
  for(const name of DATASETS){
    const feed=raw[name];
    if(!feed||!Array.isArray(feed.data)||!feed.data.length||feed.data.length>6000)throw new Error('Incomplete Gray Zone Warfare dataset: '+name);
    if(!Number.isFinite(Date.parse(feed.dataVersion)))throw new Error('The game data has no valid source date.');
    versions.push(feed.dataVersion);
    for(const item of feed.data){
      if(typeof item.id!=='string'||!item.id.trim()||item.id.length>160||typeof item.name!=='string'||!item.name.trim()||item.name.length>200)throw new Error('The game data contains an invalid record.');
      const id=clean(item.id,160),nameText=clean(item.name,200);
      if(name==='keys'||name==='keycards'){
        keys.set(id,{id,name:nameText,type:name==='keycards'?'Keycard':'Key',usage:clean(item.usage,1000),sourceUrl:wiki(nameText)});
      }else{
        const old=tasks.get(id),types=new Set(old?.types||[]);
        if(TYPES[name])types.add(TYPES[name]);
        if(/^(yes|true)$/i.test(item.hidden_task||''))types.add('Hidden mission');
        tasks.set(id,{id,name:nameText,vendor:clean(item.vendor,100)||old?.vendor||'Not listed',location:clean(item.location,500)||old?.location||'',alternate:clean(item.alternate,200)||old?.alternate||'',types:[...types],sourceUrl:wiki(nameText)});
      }
    }
  }
  if(new Set(versions).size!==1)throw new Error('The source changed during refresh. Keeping the previous complete snapshot.');
  const sorted=[...tasks.values()].map(t=>({...t,types:t.types.length?t.types:['Unclassified']})).sort((a,b)=>a.name.localeCompare(b.name));
  const data={source:'GZW Data API · community wiki index',sourceUrl:'https://gzw-data.dev/',sourceUpdatedAt:new Date(versions[0]).toISOString(),tasks:sorted,keys:[...keys.values()].sort((a,b)=>a.name.localeCompare(b.name)),counts:Object.fromEntries(DATASETS.map(n=>[n,raw[n].data.length]))};
  return {...data,fingerprint:crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')};
}
async function fetchDataset(name,request){
  const data=[];let dataVersion,total;
  for(let page=1;page<=12;page++){
    const result=JSON.parse(await request(BASE+name+'?per_page=500&page='+page));
    if(!Array.isArray(result.data)||!Number.isInteger(result.total)||result.total<1||result.total>6000||!Number.isInteger(result.totalPages)||result.totalPages<1||result.totalPages>12||result.page!==page)throw new Error('Unexpected pagination for '+name+'.');
    if(page>1&&(result.total!==total||result.dataVersion!==dataVersion))throw new Error('The source changed while loading '+name+'.');
    total=result.total;dataVersion=result.dataVersion;data.push(...result.data);
    if(page===result.totalPages){if(data.length!==total||new Set(data.map(x=>x.id)).size!==total)throw new Error('Incomplete or duplicate '+name+' records.');return {data,dataVersion};}
  }
  throw new Error('The game dataset is too large.');
}
class GzwProvider{
  constructor(options){
    const request=options.requestFn||requestText;
    this.feed=new SourceCache({...options,id:'gzw-data',url:'https://gzw-data.dev/',requestFn:async()=>{
      const result={};
      // At most three requests at once; no per-mission scraping.
      for(let i=0;i<DATASETS.length;i+=3)await Promise.all(DATASETS.slice(i,i+3).map(async name=>{result[name]=await fetchDataset(name,request);}));
      return result;
    },normalize:normalizeGzw,validate:d=>Array.isArray(d.tasks)&&d.tasks.length>0&&d.tasks.every(t=>typeof t.id==='string'&&typeof t.name==='string'&&Array.isArray(t.types))&&Array.isArray(d.keys)&&d.keys.length>0&&Number.isFinite(Date.parse(d.sourceUpdatedAt))&&/^[a-f0-9]{64}$/.test(d.fingerprint||'')});
  }
  get(options={}){if(!options||typeof options!=='object'||Array.isArray(options))throw new Error('Invalid map request.');return this.feed.get(options.refresh===true||options.refresh==='true');}
}
module.exports={GzwProvider,normalizeGzw,fetchDataset,DATASETS};
