// WARDOGS game coordinates and community game firing tables only.
// Table interpolation follows Apollyon's MIT-licensed calculator; see third-party notices.
export const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
export function validPoint(point,map) {
  const b=map.bounds;
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x>=b.minX && point.x<=b.maxX && point.y>=b.minY && point.y<=b.maxY;
}
export function clampPoint(p,map) {
  const b=map.bounds;
  return {x:clamp(p.x,b.minX,b.maxX),y:clamp(p.y,b.minY,b.maxY)};
}
export function geometry(origin,target,map) {
  if (!validPoint(origin,map)||!validPoint(target,map)) return null;
  const dx=(target.x-origin.x)*map.coordinateMetersPerUnit,dy=(target.y-origin.y)*map.coordinateMetersPerUnit;
  const distance=Math.hypot(dx,dy);
  return {dx,dy,distance,azimuth:distance<1e-6?null:(Math.atan2(dx,dy)*180/Math.PI+360)%360};
}
export function interpolate(table,distance,minElevation=-Infinity,maxElevation=Infinity) {
  if (!Array.isArray(table)||!Number.isFinite(distance)) return null;
  const groups=[];
  for (const [d,mil] of [...table].sort((a,b)=>a[0]-b[0]||a[1]-b[1])) {
    if(mil<minElevation || mil>maxElevation) continue;
    const last=groups.at(-1);
    if(last?.distance===d) last.mils.push(mil); else groups.push({distance:d,mils:[mil]});
  }
  const exact=groups.find(g=>Math.abs(g.distance-distance)<1e-6);
  if(exact) return {min:Math.min(...exact.mils),max:Math.max(...exact.mils),interpolated:false};
  const i=groups.findIndex(g=>g.distance>distance);
  if(i<=0) return null;
  const left=groups[i-1],right=groups[i];
  const nearest=(values,target)=>values.reduce((best,v)=>Math.abs(v-target)<Math.abs(best-target)?v:best);
  const lm=nearest(left.mils,right.mils.reduce((a,b)=>a+b,0)/right.mils.length),rm=nearest(right.mils,lm);
  const mil=lm+(distance-left.distance)/(right.distance-left.distance)*(rm-lm);
  return {min:mil,max:mil,interpolated:true};
}
export function firingSolution(origin,target,map,weapon) {
  const g=geometry(origin,target,map);
  if(!g||!weapon) return null;
  const range=g.distance<1e-6?'coincident':g.distance+1e-6<weapon.minRange?'short':g.distance>weapon.maxRange+1e-6?'long':'in';
  const solutions={};
  if(range==='in') for(const [arc,table] of Object.entries(weapon.ballistics)) solutions[arc]=interpolate(table,g.distance,weapon.minElevationMil,weapon.maxElevationMil);
  return {...g,range,solutions};
}
export function milText(value) {
  if(!value) return '—';
  const lo=Math.round(value.min),hi=Math.round(value.max);
  return lo===hi?String(lo):`${lo}–${hi}`;
}
export function bearingText(value) {
  return value==null?'—':((Math.round(value*10)/10)%360).toFixed(1)+'°';
}
export function parseCoordinates(value) {
  const s=String(value||'').trim();
  const x=s.match(/(?:^|\s|,)x\s*[:=]?\s*([+-]?\d+(?:[.,]\d+)?)/i),y=s.match(/(?:^|\s|,)y\s*[:=]?\s*([+-]?\d+(?:[.,]\d+)?)/i);
  if(x&&y) return {x:Number(x[1].replace(',','.')),y:Number(y[1].replace(',','.'))};
  const plain=s.match(/^([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)$/);
  return plain?{x:Number(plain[1]),y:Number(plain[2])}:null;
}
export const coordinateText=p=>p?`X${p.x.toFixed(2)} Y${p.y.toFixed(2)}`:'Not placed';
export function project(point,camera,width,height) {
  return {x:width/2+(point.x-camera.x)*camera.scale,y:height/2-(point.y-camera.y)*camera.scale};
}
export function unproject(point,camera,width,height) {
  return {x:camera.x+(point.x-width/2)/camera.scale,y:camera.y-(point.y-height/2)/camera.scale};
}
export function fitCamera(bounds,width,height,padding=36) {
  return {x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2,scale:Math.max(.001,Math.min(Math.max(1,width-padding*2)/(bounds.maxX-bounds.minX),Math.max(1,height-padding*2)/(bounds.maxY-bounds.minY)))};
}
export function zoomCamera(camera,factor,anchor,width,height,minScale,maxScale) {
  const before=unproject(anchor,camera,width,height),scale=clamp(camera.scale*factor,minScale,maxScale);
  return {x:before.x-(anchor.x-width/2)/scale,y:before.y+(anchor.y-height/2)/scale,scale};
}
export function validateBackup(raw,maps) {
  if(!raw||raw.schema!==1||raw.game!=='wardogs'||!Array.isArray(raw.targets)||raw.targets.length>200) throw new Error('Choose a Dropzone WARDOGS targets file (up to 200 targets).');
  return raw.targets.map(t=>{
    const map=maps.find(m=>m.id===t.map);
    if(!map||!validPoint(t.target,map)||(t.origin!=null&&!validPoint(t.origin,map))||!['mortar','spg'].includes(t.weapon)||typeof t.name!=='string'||!t.name.trim()||t.name.length>80||!['single','low','high'].includes(t.arc)) throw new Error('The file contains an invalid target. Nothing was imported.');
    return {id:crypto.randomUUID(),name:t.name.trim(),map:t.map,target:{x:t.target.x,y:t.target.y},origin:t.origin?{x:t.origin.x,y:t.origin.y}:null,weapon:t.weapon,arc:t.arc,savedAt:typeof t.savedAt==='string'?t.savedAt:null};
  });
}

// Frame-rate independent zoom easing, with a fixed point under the cursor.
export function easeZoom(camera,targetScale,anchor,width,height,elapsedMs,minScale,maxScale) {
  const target=clamp(targetScale,minScale,maxScale);
  const gap=Math.log(target/camera.scale);
  const scale=Math.abs(gap)<.0003?target:camera.scale*Math.exp(gap*(1-Math.exp(-Math.max(0,elapsedMs)/65)));
  return zoomCamera(camera,scale/camera.scale,anchor,width,height,minScale,maxScale);
}
