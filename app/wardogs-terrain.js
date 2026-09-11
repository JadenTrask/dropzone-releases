// Community collision data is height context, never a projectile calibration.
import {validPoint} from './wardogs-model.js';

export const emptyHeights = () => ({mode:'auto',origin:null,target:null,originOffset:0,targetOffset:0});
export function cleanHeights(raw={}) {
  const value=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=10000?v:null;
  return {invalid:raw.invalid===true,mode:['auto','manual','flat'].includes(raw.mode)?raw.mode:'auto',origin:value(raw.origin),target:value(raw.target),originOffset:value(raw.originOffset)??0,targetOffset:value(raw.targetOffset)??0};
}
export function heightContext(settings,samples={}) {
  const h=cleanHeights(settings);
  if(h.invalid)return {mode:h.mode,available:false,reason:'Correct the invalid height input.'};
  if(h.mode==='flat')return {mode:'flat',available:true,origin:null,target:null,delta:0,reference:'Explicit same-height assumption'};
  if(h.mode==='manual') {
    if(h.origin===null||h.target===null)return {mode:'manual',available:false,reason:'Enter both ground heights using the same reference.'};
    return {mode:'manual',available:true,origin:h.origin+h.originOffset,target:h.target+h.targetOffset,delta:h.target+h.targetOffset-h.origin-h.originOffset,reference:'Manual · your shared height reference'};
  }
  if(!Number.isFinite(samples.origin?.height)||!Number.isFinite(samples.target?.height))return {mode:'auto',available:false,reason:[samples.origin,samples.target].find(s=>s?.reason)?.reason||'Place both points to compare ground heights.'};
  // Remove the unresolved absolute datum. Gun ground is the displayed reference.
  const groundDelta=samples.target.height-samples.origin.height;
  return {mode:'auto',available:true,origin:h.originOffset,target:groundDelta+h.targetOffset,delta:groundDelta+h.targetOffset-h.originOffset,reference:'Automatic · community terrain · relative to gun ground'};
}
export function locateTerrain(manifest,point) {
  const m=manifest,c=m.coverage;
  if(!point||![point.x,point.y].every(Number.isFinite)||point.x<c.gameXMin||point.x>c.gameXMax||point.y<c.gameYMin||point.y>c.gameYMax)return null;
  const qx=m.globalQuadOffsetX+point.x*m.gameUnitsToLandscapeQuadsX,qy=m.globalQuadOffsetY+point.y*m.gameUnitsToLandscapeQuadsY;
  const x=Math.min(m.chunkXMax,Math.floor(qx/m.chunkQuads)),y=Math.min(m.chunkYMax,Math.floor(qy/m.chunkQuads));
  const lx=(qx-x*m.chunkQuads)/m.sampleStrideQuads,ly=(qy-y*m.chunkQuads)/m.sampleStrideQuads;
  if(x<m.chunkXMin||y<m.chunkYMin||lx<0||ly<0||lx>m.verticesPerSide-1||ly>m.verticesPerSide-1)return null;
  return {key:`${x},${y}`,x:lx,y:ly};
}
export function sampleChunk(m,entry,buffer,point) {
  const side=m.verticesPerSide,view=new DataView(buffer),x0=Math.floor(point.x),y0=Math.floor(point.y),x1=Math.min(x0+1,side-1),y1=Math.min(y0+1,side-1),fx=point.x-x0,fy=point.y-y0;
  const at=(x,y)=>m.worldZOffsetMeters+(entry.minLocalZ+view.getUint16(2*(y*side+x),true)/65535*(entry.maxLocalZ-entry.minLocalZ))*m.worldZScaleMetersPerLocalUnit;
  const top=at(x0,y0)*(1-fx)+at(x1,y0)*fx,bottom=at(x0,y1)*(1-fx)+at(x1,y1)*fx;
  return top*(1-fy)+bottom*fy;
}
export function validateTerrain(m,id) {
  if(m?.format!=='dropzone-terrain-u16-v1'||m.mapId!==id||m.verticesPerSide!==256||m.chunkQuads!==510||m.sampleStrideQuads!==2||!m.chunks||!m.coverage)throw new Error('Unsupported terrain dataset.');
  if(![m.globalQuadOffsetX,m.globalQuadOffsetY,m.gameUnitsToLandscapeQuadsX,m.gameUnitsToLandscapeQuadsY,m.worldZOffsetMeters,m.worldZScaleMetersPerLocalUnit,...Object.values(m.coverage)].every(Number.isFinite)||!m.gameUnitsToLandscapeQuadsX||!m.gameUnitsToLandscapeQuadsY)throw new Error('Invalid terrain mapping.');
  return m;
}
export class TerrainProvider {
  constructor(fetcher=(...args)=>fetch(...args)){this.fetcher=fetcher;this.manifests=new Map();this.chunks=new Map();this.pending=new Map();}
  async manifest(id){
    if(!this.manifests.has(id)){
      const promise=this.fetcher(`data/wardogs/terrain/${id}/dataset.json`).then(r=>{if(!r.ok)throw new Error('Terrain dataset unavailable.');return r.json();}).then(m=>validateTerrain(m,id));
      this.manifests.set(id,promise);promise.catch(()=>this.manifests.delete(id));
    }
    return this.manifests.get(id);
  }
  async chunk(id,key,entry){
    const cacheKey=id+':'+key;
    if(this.chunks.has(cacheKey)){const b=this.chunks.get(cacheKey);this.chunks.delete(cacheKey);this.chunks.set(cacheKey,b);return b;}
    if(this.pending.has(cacheKey))return this.pending.get(cacheKey);
    const promise=(async()=>{
      if(!/^chunks\/\d+_\d+\.bin$/.test(entry.file)||entry.bytes!==256*256*2||!Number.isFinite(entry.minLocalZ)||!Number.isFinite(entry.maxLocalZ))throw new Error('Invalid terrain chunk.');
      const response=await this.fetcher(`data/wardogs/terrain/${id}/${entry.file}`);
      if(!response.ok)throw new Error('Terrain chunk unavailable.');
      const buffer=await response.arrayBuffer();if(buffer.byteLength!==entry.bytes)throw new Error('Incomplete terrain chunk.');
      const digest=await crypto.subtle.digest('SHA-256',buffer),hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
      if(hash!==entry.sha256)throw new Error('Terrain integrity check failed.');
      this.chunks.set(cacheKey,buffer);while(this.chunks.size>48)this.chunks.delete(this.chunks.keys().next().value);
      return buffer;
    })();this.pending.set(cacheKey,promise);
    try{return await promise;}finally{this.pending.delete(cacheKey);}
  }
  async sample(map,point){
    if(!validPoint(point,map))return {height:null,reason:point?'Outside playable map.':'Place both points to compare ground heights.'};
    try{const m=await this.manifest(map.id),located=locateTerrain(m,point);if(!located)return {height:null,reason:'Outside terrain coverage. Enter manual heights.'};
      const entry=m.chunks[located.key];if(!entry)return {height:null,reason:'Terrain sample missing. Enter manual heights.'};
      const buffer=await this.chunk(map.id,located.key,entry),height=sampleChunk(m,entry,buffer,located);
      return Number.isFinite(height)?{height,source:'community',resolutionMeters:4}:{height:null,reason:'Terrain sample unavailable.'};
    }catch(error){return {height:null,reason:error.message+' Use manual heights.'};}
  }
}
// One owner per mounted calculator; obsolete requests may warm cache, never UI.
export class TerrainRequest {
  constructor(provider){this.provider=provider;this.revision=0;}
  cancel(){++this.revision;}
  async run(map,positions,apply){const revision=++this.revision;const [origin,target]=await Promise.all([this.provider.sample(map,positions.origin),this.provider.sample(map,positions.target)]);if(revision===this.revision)apply({origin,target});}
}
