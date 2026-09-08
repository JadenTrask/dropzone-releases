import {clamp,validPoint as pointInBounds,fitCamera,project,unproject,zoomCamera,easeZoom} from './wardogs-model.js';
export {clamp,fitCamera,project,unproject,zoomCamera,easeZoom};
export const FACTIONS=[['mithras','Mithras Security Systems'],['crimson','Crimson Shield International'],['lamang','Lamang Recovery Initiative']];
export const STARTER={mithras:'nam-thaven',crimson:'kiu-vongsa',lamang:'pha-lang'};
export const normal=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
export function missionRegions(task,regions,faction){
  const location=normal(task.location),starter=['kiu vongsa','nam thaven','pha lang'];
  if(location==='starting town'||starter.every(n=>location.includes(n)))return regions.filter(r=>r.id===STARTER[faction]);
  // An island-wide or missing location is not an exact objective.
  return regions.filter(r=>!r.faction&&r.aliases.some(a=>location.includes(normal(a)))||r.faction===faction&&r.aliases.some(a=>location===normal(a)))
    .filter(r=>!(r.id==='pha-lang'&&location.includes('airfield')));
}
export function filterMissions(tasks,filters,profile,regions){
  const query=normal(filters.query);
  return tasks.filter(t=>(!query||normal([t.name,t.vendor,t.location,t.alternate,...t.types].join(' ')).includes(query))&&
    (filters.vendor==='all'||t.vendor===filters.vendor)&&(filters.type==='all'||t.types.includes(filters.type))&&
    (filters.region==='all'||missionRegions(t,regions,filters.faction).some(r=>r.id===filters.region))&&
    (filters.progress==='all'||filters.progress==='completed'&&profile.completed.includes(t.id)||filters.progress==='remaining'&&!profile.completed.includes(t.id)||filters.progress==='tracked'&&profile.tracked.includes(t.id)))
    .sort((a,b)=>filters.sort==='vendor'?a.vendor.localeCompare(b.vendor)||a.name.localeCompare(b.name):a.name.localeCompare(b.name));
}
export function blankProfile(){return {completed:[],tracked:[],foundKeys:[],pins:[],route:[]};}
export function validateProfile(p,map){
  if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('Invalid map progress.');
  const ids=key=>{if(!Array.isArray(p[key])||p[key].length>3000||p[key].some(s=>typeof s!=='string'||!s||s.length>160))throw new Error('Invalid mission or key list.');return [...new Set(p[key])];};
  if(!Array.isArray(p.pins)||p.pins.length>150||!Array.isArray(p.route)||p.route.length>100)throw new Error('Too many pins or route points.');
  const pins=p.pins.map(pin=>{
    if(!pointInBounds(pin,{bounds:map.legacyBounds||map.bounds})||typeof pin.id!=='string'||!pin.id||pin.id.length>80||typeof pin.name!=='string'||!pin.name.trim()||pin.name.length>80||typeof pin.note!=='string'||pin.note.length>500||!['green','amber','red','blue'].includes(pin.color))throw new Error('Invalid saved pin.');
    return {id:pin.id,x:pin.x,y:pin.y,name:pin.name,note:pin.note,color:pin.color};
  });
  if(new Set(pins.map(p=>p.id)).size!==pins.length)throw new Error('Duplicate pin IDs.');
  const route=p.route.map(point=>{if(!pointInBounds(point,{bounds:map.legacyBounds||map.bounds}))throw new Error('Invalid route point.');return {x:point.x,y:point.y};});
  return {completed:ids('completed'),tracked:ids('tracked'),foundKeys:ids('foundKeys'),pins,route};
}
export function validateBackup(raw,map){
  if(!raw||raw.schema!==1||raw.game!=='gzw'||!FACTIONS.some(([id])=>id===raw.faction)||![map.sha256,map.legacyRevision].includes(raw.mapRevision))throw new Error('Choose a Dropzone Gray Zone Warfare backup for this map revision.');
  return {faction:raw.faction,profile:validateProfile(raw.profile,map)};
}
export function routeDistance(points){return points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y)*100,0);}
export function nearestLocations(point,locations,count=3){return locations.map(p=>({...p,distance:Math.hypot(p.x-point.x,p.y-point.y)*100})).sort((a,b)=>a.distance-b.distance).slice(0,count);}
export const gridText=p=>`${p.x.toFixed(2)} / ${p.y.toFixed(2)}`;

export function validPoint(p,map){return pointInBounds(p,map);}

// Keep existing progress IDs while adding missions only supplied by the marker feed.
export function mergeMappedMissions(tasks,objectives){
  const result=tasks.slice(),names=new Set(tasks.map(t=>normal(t.name)));
  for(const p of objectives){if(!p.taskName||names.has(normal(p.taskName)))continue;names.add(normal(p.taskName));result.push({id:'tac-task-'+p.taskId,name:p.taskName,vendor:p.vendor||'Not supplied',location:p.region||'',alternate:'',types:['Mapped mission'],sourceUrl:p.sourceUrl});}
  return result;
}
