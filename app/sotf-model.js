export const DEFAULT_LAYERS=['weapons','tools','cave','bunker-hatch','artifact'];
export function validateMap(data){
  if(data?.schema!==1||!Array.isArray(data.locations)||!Array.isArray(data.types)||!Array.isArray(data.layers))throw Error('The bundled map could not be read.');
  const types=new Set(data.types.map(t=>t.id)),layers=new Set(data.layers.map(l=>l.id)),ids=new Set();
  for(const type of data.types)if(!type.layers.length||type.layers.some(l=>!layers.has(l)))throw Error('Invalid map layer.');
  for(const p of data.locations){if(ids.has(p.id)||!Number.isFinite(p.id)||!types.has(p.type)||!p.title||![p.x,p.y].every(Number.isFinite)||p.x < -2000||p.x > 2000||p.y < -2000||p.y > 2000)throw Error('Invalid map location.');ids.add(p.id);}
  return data;
}
export function matchesLocation(p,query=''){return `${p.title} ${p.type} ${p.description}`.toLowerCase().includes(query.trim().toLowerCase());}
export function filterLocations(data,{layers=DEFAULT_LAYERS,query='',region='all',found=[],hideFound=false}={}){
  const active=new Set(layers),done=new Set(found),types=new Map(data.types.map(t=>[t.id,t]));
  return data.locations.filter(p=>{const tags=types.get(p.type)?.layers||[];const underground=tags.includes('cave-loot')||tags.includes('bunker-loot')||/-(cave|bunker)$/.test(p.type);return tags.some(t=>active.has(t))&&matchesLocation(p,query)&&(!hideFound||!done.has(p.id))&&(region==='all'||(region==='underground'?underground:!underground));});
}
export function projectPoint(p,camera,width,height){return{x:width/2+(p.x-camera.x)*camera.scale,y:height/2-(p.y-camera.y)*camera.scale};}
export function unprojectPoint(p,camera,width,height){return{x:camera.x+(p.x-width/2)/camera.scale,y:camera.y-(p.y-height/2)/camera.scale};}
export function normalizePreferences(raw,data){const ids=new Set(data.locations.map(p=>p.id));return{layers:Array.isArray(raw?.layers)?raw.layers.filter(id=>data.layers.some(l=>l.id===id)):[...DEFAULT_LAYERS],found:Array.isArray(raw?.found)?raw.found.filter(id=>ids.has(id)):[],hideFound:raw?.hideFound===true};}
