'use strict';
const crypto=require('node:crypto');
const {SourceCache,requestText,text}=require('./source-cache.cjs');
const HOME='https://gzwtacmap.com/maps/lamang';
const ENDPOINT='https://gzwtacmap.com/_app/remote/1g4p39w/fetchMapMarkers';
const PAYLOAD=Buffer.from('[{"mapUrl":1,"mapId":2},"lamang",1]').toString('base64url');
// Decode only JSON-compatible devalue records. Never evaluate remote JavaScript.
function unpack(input){const outer=typeof input==='string'?JSON.parse(input):input;if(outer.type!=='result'||typeof outer.result!=='string')throw new Error('Map source did not return marker data.');const values=JSON.parse(outer.result);if(!Array.isArray(values)||values.length>300000)throw new Error('Invalid map response.');const memo=new Map(),visiting=new Set();function ref(i,depth=0){if(i===-1)return null;if(!Number.isInteger(i)||i<0||i>=values.length||depth>40||visiting.has(i))throw new Error('Invalid map references.');if(memo.has(i))return memo.get(i);const v=values[i];if(v===null||typeof v!=='object')return v;visiting.add(i);let out;if(Array.isArray(v)){if(v.length&&typeof v[0]==='string')throw new Error('Unsupported map data type.');out=v.map(n=>ref(n,depth+1));}else{out=Object.create(null);for(const[k,n]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw new Error('Invalid map field.');out[k]=ref(n,depth+1);}}visiting.delete(i);memo.set(i,out);return out;}return ref(0);}
function categoriesFromHtml(html){const out=new Map();for(const m of html.matchAll(/\{id:(\d+),name:("(?:[^"\\]|\\.)*"),type:[^}]*?category:"([^"]+)"/g))out.set(Number(m[1]),{id:Number(m[1]),name:text(JSON.parse(m[2])),section:text(m[3])});if(out.size<10)throw new Error('Map layer index changed format.');return [...out.values()];}
function normalizeMarkers({raw,categories,version}){
 if(!/^\d+\.\d+(?:\.\d+)?$/.test(version))throw new Error('Map revision is missing.');
 const decoded=typeof raw==='string'?unpack(raw):raw,points=new Map(),objectives=[];
 if(!decoded?.markers||!decoded.taskMarkers)throw new Error('Map layers are incomplete.');
 const normalize=(p,category)=>{
  if(!Number.isInteger(p.id)||typeof p.name!=='string'||!p.name.trim()||!Number.isFinite(p.lng)||!Number.isFinite(p.lat)||p.lng<0||p.lng>14000||p.lat<0||p.lat>8000)throw new Error('A map marker has invalid coordinates or identity.');
  return {id:'tac-'+p.id,sourceId:p.id,type:category===1?'lz':'poi',category,name:text(category===1?p.tooltip||p.name.replace(/^Landing Zone - /,''):p.name).slice(0,200),x:100+p.lng/100,y:100+p.lat/100,region:text(p.poi?.name||p._poi?.name).slice(0,100),faction:({mss:'mithras',csi:'crimson',lri:'lamang'})[p.faction]||null,level:p.floor??p.level??null,tier:p.wiki?.tier??null,locked:p.is_locked===true,keyIds:(p.key||[]).map(k=>k.key_id).filter(Number.isInteger),sourceUrl:HOME+'/place/'+p.id};
 };
 for(const [group,layer]of Object.entries(decoded.markers)){if(!Array.isArray(layer.markersArray))throw new Error('Map layer is missing records.');for(const p of layer.markersArray){if(p.is_published===false||p.is_approved===false)continue;const n=normalize(p,Number(group));if(points.has(n.id))throw new Error('Duplicate map marker.');points.set(n.id,n);}}
 for(const [group,layer]of Object.entries(decoded.taskMarkers)){if(!/^task-\d+$/.test(group)||!Array.isArray(layer.markersArray))throw new Error('Invalid objective layer.');for(const p of layer.markersArray){const n=normalize(p,36);if(!p.taskData?.name)throw new Error('Objective is missing its mission.');objectives.push({...n,id:group+'-'+p.id,sourceId:p.id,taskId:Number(group.slice(5)),taskName:text(p.taskData.name),vendor:text(p.taskData.vendor),step:p.step??null});}}
 const markers=[...points.values()];if(markers.length<100||!markers.some(p=>p.type==='lz')||!objectives.length)throw new Error('Map source returned an incomplete snapshot.');
 const cats=new Map(categories.map(c=>[c.id,{id:c.id,name:text(c.name),section:text(c.section)}]));for(const p of markers)if(!cats.has(p.category))cats.set(p.category,{id:p.category,name:'Other locations · '+p.category,section:'other'});cats.set(36,{id:36,name:'Mission objectives',section:'missions'});
 const result={source:'GZW Tac Map',sourceUrl:HOME,sourceUpdatedAt:null,mapVersion:version,categories:[...cats.values()],markers,objectives,counts:{markers:markers.length,lz:markers.filter(p=>p.type==='lz').length,objectives:objectives.length,missions:new Set(objectives.map(p=>p.taskId)).size}};
 return {...result,fingerprint:crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex')};
}
async function fetchMarkers(request=requestText){
 const page=await request(HOME);const entry=page.match(/import\("\.\.\/(_app\/immutable\/entry\/app\.[\w-]+\.js)"\)/)?.[1];if(!entry)throw new Error('Map application index changed format.');
 const app=await request('https://gzwtacmap.com/'+entry);const node=app.match(/\.\.\/nodes\/12\.[\w-]+\.js/)?.[0];if(!node)throw new Error('Map revision entry was not found.');
 const js=await request(new URL(node,'https://gzwtacmap.com/'+entry).href);const version=js.match(/mapVersion:"(\d+\.\d+(?:\.\d+)?)"/)?.[1];if(!version)throw new Error('Map revision could not be checked.');
 const raw=await request(ENDPOINT+'?payload='+PAYLOAD);return {raw,categories:categoriesFromHtml(page),version};
}
class GzwMarkersProvider{constructor(options){this.feed=new SourceCache({...options,id:'gzw-markers',url:HOME,requestFn:()=>fetchMarkers(options.requestFn||requestText),normalize:normalizeMarkers,validate:d=>Array.isArray(d.markers)&&d.markers.length>100&&Array.isArray(d.objectives)&&Array.isArray(d.categories)&&/^\d+\.\d+/.test(d.mapVersion)&&/^[a-f0-9]{64}$/.test(d.fingerprint||'')});}get(o={}){return this.feed.get(o?.refresh===true||o?.refresh==='true');}}
module.exports={GzwMarkersProvider,unpack,normalizeMarkers,fetchMarkers,categoriesFromHtml};
