'use strict';
const {SourceCache,text,decode,tag,iso}=require('./source-cache.cjs');
const SOURCE='https://thefinalsloadout.com/loadouts';
const PATCHES='https://www.reachthefinals.com/patchnotes?format=rss';
const CLASSES=['Light','Medium','Heavy'];
const TIER=['S','A','B','C','D'];
const version=v=>String(v).split('.').map(Number);
function compare(a,b){const x=version(a),y=version(b);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)-(y[i]||0);}return 0;}
function normalizeLoadouts(html){
  const season=Number(html.match(/Season\s*<strong[^>]*>(\d+)<\/strong>/i)?.[1]);
  const patch=text(html.match(/<strong[^>]*data-gen="patch"[^>]*>([^<]+)<\/strong>/i)?.[1]);
  const day=text(html.match(/<strong[^>]*data-gen="refreshed"[^>]*>([^<]+)<\/strong>/i)?.[1]);
  if(!/^[A-Za-z]{3,9} \d{1,2}, \d{4}$/.test(day))throw new Error('The loadout source did not supply a review date.');
  // The publisher supplies a calendar date, not a timezone or time of day.
  const sourceUpdatedAt=iso(day+' 00:00:00 GMT');
  if(!Number.isInteger(season)||!/^\d+\.\d+\.\d+$/.test(patch)||Number(patch.split('.')[0])!==season)throw new Error('The loadout source did not identify its season and patch.');
  const builds=[],seen=new Set();
  for(const section of html.matchAll(/<section\b[^>]*class="lo-class-block"[^>]*>([\s\S]*?)<\/section>/g)){
    const className=section[1].match(/<h2\b[^>]*>\s*(Light|Medium|Heavy) Loadouts/i)?.[1];
    if(!className)throw new Error('Unrecognized contestant class.');
    for(const match of section[1].matchAll(/<article\b[^>]*id="loadout-([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/article>/g)){
      const [,id,card]=match;
      const field=name=>text(decode(card.match(new RegExp('<dt>\\s*'+name+'\\s*</dt>\\s*<dd>([\\s\\S]*?)</dd>','i'))?.[1]));
      const name=text(decode(card.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]));
      const tier=text(card.match(/<span\b[^>]*class="lo-tier"[^>]*>([\s\S]*?)<\/span>/i)?.[1]);
      const weapons=field('Weapon').split(/\s*\/\s*/).filter(Boolean),specialization=field('Specialization');
      const gadgets=field('Gadgets').split(/,\s*/).filter(Boolean),alternatives=field('Reserves').split(/,\s*/).filter(Boolean);
      if(seen.has(id)||!name||!TIER.includes(tier)||!weapons.length||weapons.length>6||!specialization||gadgets.length!==3||new Set(gadgets).size!==3)throw new Error('An incomplete or duplicate class loadout was returned.');
      if([name,specialization,...weapons,...gadgets,...alternatives].some(v=>v.length>100))throw new Error('Invalid loadout text.');
      seen.add(id);builds.push({id,name,className,tier,tierRank:TIER.indexOf(tier),weapons,specialization,gadgets,alternatives,sourceUrl:SOURCE+'#loadout-'+id});
    }
  }
  if(builds.length>100||CLASSES.some(c=>builds.filter(b=>b.className===c).length<2))throw new Error('The source is missing class loadouts or changed its page format.');
  const expected=Number(html.match(/"numberOfItems"\s*:\s*(\d+)/)?.[1]);
  if(expected&&expected!==builds.length)throw new Error('The loadout page was only partially read.');
  builds.sort((a,b)=>a.tierRank-b.tierRank||a.name.localeCompare(b.name));
  return {source:'TheFinalsLoadout.com',sourceUrl:SOURCE,season,patch,sourceUpdatedAt,builds,methodology:'Community tier recommendations. These loadouts are not official Embark rankings or measured ranked win rates. Weapon choices are alternatives; equip one. The reserve suggestions are an alternative pool.'};
}
function normalizePatches(xml){
  const patches=[];
  for(const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)){
    const item=m[1],title=text(tag(item,'title')),match=title.match(/\b(\d{1,2}\.\d{1,2}\.\d{1,2})\b/);if(!match)continue;
    const url=tag(item,'link');let u;try{u=new URL(url);}catch{throw new Error('Invalid official patch link.');}
    if(u.origin!=='https://www.reachthefinals.com'||!u.pathname.startsWith('/patchnotes/'))throw new Error('Unexpected official patch source.');
    const body=text(tag(item,'description'));
    // Only explicit store-only posts are excluded from the conservative review check.
    const storeOnly=/^Store Update/i.test(title)&&!/BALANCE CHANGES|GAME UPDATE|BUG FIXES/i.test(body);
    patches.push({title,patch:match[1],season:Number(match[1].split('.')[0]),sourceUrl:u.href,publishedAt:iso(tag(item,'pubDate')),storeOnly});
  }
  patches.sort((a,b)=>compare(b.patch,a.patch));
  const latest=patches[0],gameplay=patches.find(p=>!p.storeOnly);
  if(!latest||!gameplay)throw new Error('Official patch information is incomplete.');
  return {source:'Embark Studios',sourceUrl:'https://www.reachthefinals.com/patchnotes',sourceUpdatedAt:latest.publishedAt,season:latest.season,latest,gameplay,patches:patches.slice(0,8)};
}
function freshness(builds,patches){
  if(!patches?.latest)return {level:'warning',message:'The current official patch could not be checked. Treat these as saved recommendations.'};
  if(builds.season!==patches.season)return {level:'warning',message:`These are Season ${builds.season} builds. The official feed is on Season ${patches.season}; a new-season review is needed.`};
  if(compare(patches.gameplay.patch,builds.patch)>0)return {level:'warning',message:`Official update ${patches.gameplay.patch} is newer than the build review (${builds.patch}). The source has not caught up yet.`};
  if(patches.cacheState==='offline'||builds.cacheState==='offline')return {level:'warning',message:'A live source check failed. Saved build and patch information is shown below.'};
  if(Date.now()-Date.parse(patches.fetchedAt)>86400000||Date.now()-Date.parse(builds.fetchedAt)>86400000)return {level:'warning',message:'Saved source checks are over a day old. Refresh before relying on the patch comparison.'};
  return {level:'ok',message:`Builds reviewed for ${builds.patch} · Latest gameplay update ${patches.gameplay.patch} · Latest release ${patches.latest.patch}${patches.latest.storeOnly?' (store update)':''}.`};
}
class FinalsProvider{
  constructor(options){this.loadouts=new SourceCache({...options,id:'finals-ranked',url:SOURCE,normalize:normalizeLoadouts,validate:d=>d.builds?.length>0&&CLASSES.every(c=>d.builds.some(b=>b.className===c&&b.gadgets?.length===3))});this.patches=new SourceCache({...options,id:'finals-patches',url:PATCHES,normalize:normalizePatches,validate:d=>!!d.latest?.patch&&!!d.gameplay?.patch});}
  async getBuilds({feed='finals-ranked',refresh=false}={}){if(feed!=='finals-ranked')throw new Error('Unsupported THE FINALS mode.');const [builds,patches]=await Promise.all([this.loadouts.get(refresh),this.patches.get(refresh).catch(error=>({error:error.message}))]);return {...builds,official:patches,freshness:freshness(builds,patches),teamPresets:require('../app/data/finals/teams.json')};}
}
module.exports={FinalsProvider,normalizeLoadouts,normalizePatches,freshness,compare,CLASSES};
