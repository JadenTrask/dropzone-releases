'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

const MODES = [
  {id:'ranked',name:"Summoner’s Rift",short:'Rift',icon:'swords',subtitle:'Ranked solo / duo',path:'',queue:420,roles:true,source:'LoLalytics'},
  {id:'flex',name:'Ranked Flex',short:'Flex',icon:'users',subtitle:'Your five-stack',path:'',queue:440,query:'queue=ranked_flex',roles:true,source:'LoLalytics'},
  {id:'aram',name:'ARAM',short:'ARAM',icon:'snowflake',subtitle:'One lane. All action.',path:'aram/',queue:450,source:'LoLalytics'},
  {id:'arena',name:'Arena',short:'Arena',icon:'flame',subtitle:'Duos & augments',path:'arena/',queue:1700,source:'LoLalytics'},
  {id:'mayhem',name:'ARAM: Mayhem',short:'Mayhem',icon:'sparkles',subtitle:'ARAM foundation · augment guide',source:'Mobalytics',moba:'mayhem-builds'},
  {id:'arurf',name:'AR URF',short:'AR URF',icon:'zap',subtitle:'Rotating · latest available data',path:'arurf/',queue:900,source:'LoLalytics',rotating:true},
  {id:'urf',name:'URF',short:'URF',icon:'zap',subtitle:'Rotating · archived guides',meta:'urf',rotating:true},
  {id:'ofa',name:'One for All',short:'OFA',icon:'copy',subtitle:'Rotating · archived guides',meta:'ofa',rotating:true},
  {id:'ultbook',name:'Ultimate Spellbook',short:'Spellbook',icon:'book',subtitle:'Rotating · archived guides',meta:'ultbook',rotating:true},
  {id:'blitz',name:'Nexus Blitz',short:'Blitz',icon:'crosshair',subtitle:'Rotating · archived guides',meta:'blitz',rotating:true},
  {id:'classic',name:'League Classic',short:'Classic',icon:'shield',subtitle:'Separate classic rules & roster',moba:'classic-builds',source:'Mobalytics'},
  {id:'doombots',name:'Doom Bots',short:'Doom Bots',icon:'skull',subtitle:'Rotating · mode guides',meta:'doombots',rotating:true},
  {id:'mayhem-classic',name:'Mayhem Classic-ish',short:'Classic-ish',icon:'sparkles',subtitle:'Mode-specific guides',meta:'mayhem-classic',rotating:true},
  {id:'normal',name:'Normal / Quickplay',short:'Normal',icon:'compass',subtitle:'Uses ranked Rift build foundations',path:'',queue:420,roles:true,source:'LoLalytics',proxy:'Ranked solo / duo foundation. Normal and Quickplay outcomes are not measured here.'}
];
const TIERS = ['emerald_plus','all','diamond_plus','platinum_plus','gold','silver','bronze','iron','master_plus'];
const ROLES = ['default','top','jungle','middle','bottom','support'];
const REGIONS = ['all','na','euw','eune','kr','br','lan','las','oce','tr','ru','jp','vn','tw','sg','ph','th'];
const clean = s => String(s ?? '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const slug = id => id === 'MonkeyKing' ? 'wukong' : id.toLowerCase();
const patchKey = p => String(p||'').split('.').slice(0,2).join('.');

// Decode only JSON data references. Never execute a source page or its scripts.
function decodeQwik(html) {
  const match = html.match(/<script\b[^>]*type=["']qwik\/json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('The source changed its page format. Open the source or try again later.');
  const objects = JSON.parse(match[1]).objs;
  if (!Array.isArray(objects) || objects.length > 200000) throw new Error('Invalid source data.');
  const memo = new Map();
  function ref(key, depth=0) {
    if (depth > 45 || typeof key !== 'string' || !/^[0-9a-z]+!?$/.test(key)) return null;
    const n = parseInt(key,36);
    if (n >= objects.length) return null;
    if (memo.has(n)) return memo.get(n);
    const value = objects[n];
    if (value && typeof value === 'object') {
      const out = Array.isArray(value) ? [] : Object.create(null);
      memo.set(n,out);
      for (const [k,v] of Object.entries(value)) if (!['__proto__','constructor','prototype'].includes(k)) out[k]=ref(v,depth+1);
      return out;
    }
    return value;
  }
  const root = objects.findIndex(o => o && typeof o==='object' && o.header && (o.summary || o.prismatic));
  const meta = objects.findIndex(o => o && typeof o==='object' && o.patch && o.champions && o.items);
  const page = objects.findIndex(o => o && typeof o==='object' && o.currentPatch && o.modeName);
  if(root<0) throw new Error('No usable build data was returned for this champion and mode.');
  return {data:ref(root.toString(36)),meta:meta>=0?ref(meta.toString(36)):{},page:page>=0?ref(page.toString(36)):{}};
}

function normalizeQwik(html, options, fetchedAt = new Date().toISOString()) {
  const {data:d,meta,page} = decodeQwik(html);
  if (Number(d.header?.cid)!==Number(options.championKey)) throw new Error('The source returned a different champion.');
  if (d.response?.valid === false || !Number.isFinite(d.header?.n) || d.header.n <= 0) throw new Error('No games are available for these filters. Try All ranks or Global.');
  const mode = MODES.find(m=>m.id===options.mode);
  const arena = options.mode==='arena';
  if (!arena && mode?.queue && Number(d.header.queue)!==mode.queue) throw new Error('The source did not return the requested game mode.');
  if(arena && page.mode!=='arena')throw new Error('The source did not return Arena data.');
  if(mode?.roles && options.role && options.role!=='default' && d.header.lane!==options.role)throw new Error('The source did not return the requested role.');
  if(page.tier && page.tier!==options.tier)throw new Error('The source did not return the requested rank bracket.');
  if(page.region && page.region!==options.region)throw new Error('The source did not return the requested region.');
  if(options.vs && page.vs!==slug(options.vs))throw new Error('The source did not return the requested matchup.');
  const result = {
    source:'LoLalytics',sourceUrl:options.url,champion:options.champion,championKey:Number(options.championKey),mode:options.mode,
    patch:d.header.patch || meta.patch || page.patch, fetchedAt,tier:page.tier || options.tier,region:page.region || options.region,
    role:d.header.lane || 'default', header:d.header, averageWinRate:d.avgWr, proxy:mode?.proxy||null,
    summaries:d.summary||{},items:{},augments:[],prismatics:[],sourceItems:meta.items||{},sourceRunes:meta.runes||{},
    matchups:d.header.counters||null, versus:options.vs||null,
  };
  for (const key of ['boots','startItem','item1','item2','item3','item4','item5','item6','popularItem','winningItem','builtBootSet3','builtItemSet3','skill10','skill15']) {
    if (Array.isArray(d[key])) result.items[key] = d[key];
  }
  if (arena) {
    // Arena item and augment win rates are intentionally excluded from the app.
    result.items = Object.fromEntries(Object.entries(result.items).map(([k,rows])=>[k,rows.map(r=>[r[0],null,r[2],r[3],r[4]])]));
    result.prismatics=(d.prismatic||[]).filter(r=>r[0]>0).slice(0,12).map(r=>({id:r[0],pickRate:r[2],games:r[3]}));
    result.augments=(d.augment?.augment0||[]).filter(r=>r[0]>0 && meta.augments?.[r[0]]).map(r=>({id:r[0],name:meta.augments[r[0]][0],rarity:['Silver','Gold','Prismatic'][meta.augments[r[0]][1]],pickRate:r[2],games:r[3]}));
  }
  return result;
}

function validateOptions(input,catalog) {
  if (!input || typeof input!=='object') throw new Error('Choose a champion first.');
  const champion=catalog.champions.find(c=>c.id===input.champion);
  const mode=MODES.find(m=>m.id===input.mode);
  if (!champion||!mode) throw new Error('Invalid champion or mode.');
  const role=ROLES.includes(input.role)?input.role:'default';
  const tier=TIERS.includes(input.tier)?input.tier:'emerald_plus';
  const region=REGIONS.includes(input.region)?input.region:'all';
  const vs=mode.roles && catalog.champions.some(c=>c.id===input.vs) && input.vs!==input.champion ? input.vs:null;
  const s=slug(champion.id);
  let url;
  if(mode.source==='LoLalytics') {
    url=`https://lolalytics.com/lol/${s}/${mode.path}${vs?`vs/${slug(vs)}/`:''}build/`;
    const q=new URLSearchParams();
    if(mode.query) {const pair=mode.query.split('=');q.set(pair[0],pair[1]);}
    if(mode.roles && role!=='default')q.set('lane',role);
    if(tier!=='emerald_plus')q.set('tier',tier);
    if(region!=='all')q.set('region',region);
    if(q.size)url+='?'+q;
  } else if(mode.moba) url=`https://mobalytics.gg/lol/champions/${s}/${mode.moba}`;
  else url=`https://www.metasrc.com/lol/${mode.meta}/champions/${s}/build`;
  return {champion:champion.id,championKey:champion.key,mode:mode.id,role,tier,region,vs,url};
}

async function request(url, asJson=false) {
  const allowed=['ddragon.leagueoflegends.com','lolalytics.com','mobalytics.gg','www.metasrc.com'];
  if(!allowed.includes(new URL(url).hostname) || !url.startsWith('https://'))throw new Error('Invalid data source.');
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(22000),headers:{'User-Agent':'Dropzone/2.3 (personal build companion)','Accept':asJson?'application/json':'text/html','Cache-Control':'no-cache'},redirect:'follow'});
  if(!response.ok)throw new Error(`The data source is unavailable (HTTP ${response.status}). Cached builds are still available.`);
  if(!allowed.includes(new URL(response.url).hostname))throw new Error('Unexpected data source redirect.');
  const body=await response.text();
  if(body.length>15_000_000)throw new Error('Data source response is too large.');
  return asJson?JSON.parse(body):body;
}

function normalizeCatalog(champions,items,runes,spells,version) {
  const runeMap={};
  for(const tree of runes)for(const slot of tree.slots)for(const rune of slot.runes)runeMap[rune.id]={...rune,tree:tree.name,treeId:tree.id,description:clean(rune.longDesc)};
  const shardNames={5001:'Health scaling',5005:'Attack speed',5007:'Ability haste',5008:'Adaptive force',5010:'Move speed',5011:'Health',5013:'Tenacity & slow resist'};
  for(const [id,name] of Object.entries(shardNames))runeMap[id]={id:Number(id),name,description:name,shard:true};
  return {version,updatedAt:new Date().toISOString(),champions:Object.values(champions.data).map(c=>({id:c.id,key:Number(c.key),name:c.name,title:c.title,tags:c.tags,blurb:clean(c.blurb),stats:c.stats,info:c.info})).sort((a,b)=>a.name.localeCompare(b.name)),items:items.data,runes:runeMap,spells:Object.fromEntries(Object.values(spells.data).map(s=>[s.key,{id:s.id,key:Number(s.key),name:s.name,description:clean(s.description),image:s.image.full}]))};
}

class Provider {
  constructor({cacheDir,bundleDir,requestFn=request}) {this.cacheDir=cacheDir;this.bundleDir=bundleDir;this.request=requestFn;this.catalog=null;this.pending=new Map();this.sessionChecked=new Map();this.buildFailures=new Map();this.catalogPending=null;this.catalogAttemptedAt=0;this.lastFetch=0;this.queue=Promise.resolve();}
  async json(file) {try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return null;}}
  async write(file,data) {await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(data));await fs.rename(temp,file);}
  async getCatalog(refresh=false) {
    if(this.catalogPending)return this.catalogPending;
    this.catalogPending=this.loadCatalog(refresh);
    try{return await this.catalogPending;}finally{this.catalogPending=null;}
  }
  async loadCatalog(refresh=false) {
    if(this.catalog&&!refresh&&Date.now()-this.catalogAttemptedAt<(this.catalog.refreshError?60_000:15*60_000))return this.catalog;
    const cached=this.catalog || await this.json(path.join(this.cacheDir,'catalog.json')) || await this.json(path.join(this.bundleDir,'catalog.json'));
    this.catalogAttemptedAt=Date.now();
    try {
      const versions=await this.request('https://ddragon.leagueoflegends.com/api/versions.json',true);
      const version=versions[0];
      if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid catalog version.');
      const base=`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/`;
      const [champions,items,runes,spells]=await Promise.all(['champion.json','item.json','runesReforged.json','summoner.json'].map(f=>this.request(base+f,true)));
      const catalog=normalizeCatalog(champions,items,runes,spells,version);
      if(!catalog.champions.length||catalog.champions.some(c=>!c.id||!Number.isInteger(c.key))||!Object.keys(catalog.items).length||!Object.keys(catalog.spells).length)throw new Error('Riot returned an incomplete catalog.');
      await this.write(path.join(this.cacheDir,'catalog.json'),catalog);this.catalog=catalog;return catalog;
    }catch(e){if(cached){this.catalog={...cached,refreshError:e.message};return this.catalog;}throw e;}
  }
  async build(input) {
    const catalog=await this.getCatalog();
    const options=validateOptions(input,catalog);
    if(options.mode==='mayhem') {
      const base=await this.build({...input,mode:'aram',role:'default',vs:null});
      return {...base,mode:'mayhem',guideUrl:options.url,proxy:'ARAM foundation only. These match statistics measure regular ARAM, not Mayhem. Check the augment guide and adapt to your rolls.'};
    }
    const mode=MODES.find(m=>m.id===options.mode);
    if(mode.source!=='LoLalytics')return {unavailable:true,guideOnly:true,champion:options.champion,mode:options.mode,source:mode.source||'METAsrc',sourceUrl:options.url,error:'A verified in-app data feed is not available for this mode. Open the dedicated champion guide and check its patch before playing.'};
    const key=[options.champion,options.mode,options.role,options.tier,options.region,options.vs||'none'].join('_');
    if(this.pending.has(key))return this.pending.get(key);
    const forced=input.refresh===true||input.refresh==='true',failure=this.buildFailures.get(key);
    const elapsed=Date.now()-(this.sessionChecked.get(key)||0);
    if(!forced&&failure&&elapsed<60_000)return structuredClone(failure);
    const refresh=forced||elapsed>(failure?60_000:15*60_000);
    const job=this.loadBuild(options,key,refresh).then(result=>{this.sessionChecked.set(key,Date.now());if(result.error)this.buildFailures.set(key,structuredClone(result));else this.buildFailures.delete(key);return result;});
    this.pending.set(key,job);
    try{return await job;}finally{this.pending.delete(key);}
  }
  async loadBuild(options,key,refresh) {
    const file=path.join(this.cacheDir,'builds',key+'.json');
    const cached=await this.json(file) || await this.json(path.join(this.bundleDir,'builds',key+'.json'));
    const decorate=(data,state,error)=>({...data,cacheState:state,error:error||null,stalePatch:patchKey(data.patch)!==patchKey(this.catalog.version)});
    if(cached&&!refresh&&Date.now()-Date.parse(cached.fetchedAt)<6*3600_000&&patchKey(cached.patch)===patchKey(this.catalog.version))return decorate(cached,'cached');
    const mode=MODES.find(m=>m.id===options.mode);
    try {
      // Rate-limit requests and coalesce identical concurrent selections.
      const run=this.queue.then(async()=>{const gap=Math.max(0,900-(Date.now()-this.lastFetch));if(gap)await new Promise(r=>setTimeout(r,gap));this.lastFetch=Date.now();return this.request(options.url);});
      this.queue=run.catch(()=>{});
      const html=await run;
      let data;
      if(mode.source==='LoLalytics') data=normalizeQwik(html,options);
      else if(mode.moba) data=require('./secondary.cjs').normalizeMobalytics(html,options,this.catalog);
      else data=require('./secondary.cjs').normalizeMetasrc(html,options,this.catalog);
      await this.write(file,data);
      return decorate(data,'live');
    }catch(e){
      if(cached)return decorate(cached,'offline',e.message);
      return {unavailable:true,champion:options.champion,mode:options.mode,sourceUrl:options.url,error:e.message,source:mode.source||'METAsrc',proxy:mode.proxy||null};
    }
  }
  async status() {const c=await this.getCatalog();let n=0;try{n=(await fs.readdir(path.join(this.cacheDir,'builds'))).filter(x=>x.endsWith('.json')).length;}catch{}return {version:c.version,champions:c.champions.length,cachedBuilds:n,updatedAt:c.updatedAt};}
  async clearCache(){await fs.rm(path.join(this.cacheDir,'builds'),{recursive:true,force:true});this.sessionChecked.clear();this.buildFailures.clear();return true;}
}
module.exports={Provider,MODES,TIERS,ROLES,REGIONS,decodeQwik,normalizeQwik,normalizeCatalog,validateOptions,patchKey,clean,slug,request};
