'use strict';
const {SourceCache}=require('./source-cache.cjs');
const crypto=require('node:crypto');
const FEEDS=Object.freeze({
  'bo7-public':{path:'bo7',url:'https://codmunity.gg/bo7',game:'bo7',meta:'bo7-mp',collection:'bo7-mp'},
  // CODMunity retains its legacy ranked collection name. Require the BO7 game
  // on every row as well as the exact ranked collection; never infer the mode.
  'bo7-ranked':{path:'mpranked',url:'https://codmunity.gg/mpranked',game:'bo7',meta:'bo6-ranked',collection:'bo6-rankedplay'},
  warzone:{path:'null',url:'https://codmunity.gg/',game:'warzone-2',meta:'wz',collection:'wz'},
  'warzone-ranked':{path:'warzoneranked',url:'https://codmunity.gg/warzoneranked',game:'warzone-2',meta:'Warzone Ranked',collection:'wz-br-ranked'}
});
const rankedPolicy=require('../app/data/cod/ranked-policy.json');
function allowedBuild(build,feed){return feed!=='bo7-ranked'||rankedPolicy.weapons.includes(build.weapon);}
function applyEligibility(data){
  const builds=data.builds.filter(b=>allowedBuild(b,data.feed)).map((b,i)=>({...b,sourceRank:i+1}));
  return {...data,builds,...(data.feed==='bo7-ranked'?{eligibility:rankedPolicy}:{})};
}
const SLOTS=['Optic','Muzzle','Barrel','Underbarrel','Magazine','Rear Grip','Stock','Laser','Fire Mods','Conversion Kit','Ammunition','Comb','Rail','Bolt','TriggerAction','Guard','Lever','Sling','Stock Pad','Shard'];
const TIERS=['absolute-meta','meta','contender','very-good','viable','other'];
const TIER_NAMES=['Absolute meta','Meta','Contender','Good','Viable','Other'];
const clean=v=>typeof v==='string'?v.replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,250):'';
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
function iso(value){const n=typeof value==='number'?value:Date.parse(value);return Number.isFinite(n)&&n>0&&n<Date.now()+86400000?new Date(n).toISOString():null;}
function imageUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='assets.codmunity.gg'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function assetKey(url){return url?crypto.createHash('sha256').update(url).digest('hex').slice(0,20):null;}
function fromHtml(html,feed){
  const config=FEEDS[feed];if(!config)throw new Error('Unknown feed.');
  const match=html.match(/<script\b[^>]*id=["']serverApp-state["'][^>]*>([\s\S]*?)<\/script>/i);
  if(!match)throw new Error('CODMunity changed its page format.');
  const state=JSON.parse(match[1]);
  const url='https://api.codmunity.gg/website/pages/meta-loadouts-ranking/'+config.path;
  const entry=Object.values(state).find(v=>v?.u===url&&v.s===200);
  if(!entry?.b)throw new Error('The page did not include the selected game’s build data.');
  return entry.b;
}
function normalize(payload,feed,fetchedAt=new Date().toISOString()) {
  const config=FEEDS[feed];if(!config)throw new Error('Unknown COD feed.');
  if(!payload||!Array.isArray(payload.sections)||!Array.isArray(payload.metas))throw new Error('Invalid CODMunity response.');
  if(!payload.metas.some(m=>m.name===config.meta&&m.game===config.game&&m.collection===config.collection))throw new Error('The source returned a different game or mode.');
  const builds=[];const seen=new Set();let rejected=0;
  for(const section of payload.sections){
    const tierRank=TIERS.indexOf(section.name);if(tierRank<0||!Array.isArray(section.cards))continue;
    if(section.cards.length>1000)throw new Error('Oversized source response.');
    for(const card of section.cards){
      if(card.appGame!==config.game || card.meta!==config.meta || card.collec!==config.collection || (config.game==='bo7'&&card.Game!=='bo7'))throw new Error('The source returned builds for a different game mode.');
      if(card.active===false)continue;
      const id=clean(card._id),weapon=clean(card.WeaponName);
      if(!/^[a-zA-Z0-9_-]+$/.test(id)||!weapon||seen.has(id)){rejected++;continue;}
      const attachments=SLOTS.filter(slot=>clean(card[slot])).map(slot=>({slot:slot==='TriggerAction'?'Trigger':slot,name:clean(card[slot]),unlock:clean(card.attachments?.[slot]?.levelText),unlockWeapon:clean(card.attachments?.[slot]?.weapon)}));
      if(attachments.length<1||attachments.length>10||(finite(card.countAttachments)!==null&&attachments.length!==card.countAttachments)){rejected++;continue;}
      const image=imageUrl(card.image);const stats=card.stats||{};
      const slug=clean(card.weaponSlug),weaponGame=clean(card.weaponGame);
      const sourceUrl=/^[a-z0-9-]+$/.test(slug)&&/^[a-z0-9-]+$/.test(weaponGame)?`https://codmunity.gg/weapon/${weaponGame}/${slug}`:config.url;
      builds.push({id,weapon,category:clean(card.Category),playstyle:clean(card.Playstyle2)||clean(card.Playstyle),tier:TIER_NAMES[tierRank],tierRank,sourceRank:builds.length+1,attachments,attachmentCount:attachments.length,code:/^[A-Z0-9-]{5,100}$/.test(card.LoadoutCode||'')?card.LoadoutCode:null,image,asset:assetKey(image),sourceUrl,updatedAt:iso(card.updated),weaponGame,proFavorite:card.proFavorite===true,stats:{ads:finite(stats.ads),sprintToFire:finite(stats.stf),velocity:finite(stats.bv),magazine:finite(stats.mag_size)}});
      seen.add(id);
    }
  }
  const eligible=builds.filter(b=>allowedBuild(b,feed));
  if(!eligible.length)throw new Error('No complete loadouts were returned for this game mode.');
  return applyEligibility({schema:1,feed,source:'CODMunity',sourceUrl:config.url,sourceUpdatedAt:iso(payload.lastUpdated),fetchedAt,builds,rejected,methodology:'CODMunity’s editorial tier order, with the original attachment sets. These are source recommendations, not measured win probabilities.'});
}
async function request(url){
  const response=await fetch(url,{cache:'no-store',headers:{'User-Agent':'Dropzone/2.1 (desktop build companion)','Accept':'application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(14000),redirect:'error'});
  if(!response.ok)throw new Error(`CODMunity is unavailable (HTTP ${response.status}).`);
  const max=10*1024*1024;if(Number(response.headers.get('content-length'))>max)throw new Error('Source response is too large.');
  const reader=response.body.getReader();const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('Source response is too large.');}chunks.push(Buffer.from(value));}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
class CodProvider {
  constructor({cacheDir,bundleDir,requestFn=request,now=Date.now}){
    this.feeds=new Map(Object.entries(FEEDS).map(([feed,config])=>[feed,new SourceCache({
      id:feed,cacheDir,bundleDir,now,requestFn,
      url:'https://api.codmunity.gg/website/pages/meta-loadouts-ranking/'+config.path,
      normalize:payload=>normalize(payload,feed),
      validate:d=>Array.isArray(d.builds)&&d.builds.length>0&&applyEligibility(d).builds.length>0
    })]));
  }
  async getBuilds({feed,refresh=false}){
    if(!this.feeds.has(feed))throw new Error('Unsupported Call of Duty selection.');
    return applyEligibility(await this.feeds.get(feed).get(refresh));
  }
}
module.exports={CodProvider,normalize,fromHtml,FEEDS,assetKey,applyEligibility};
