const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const data=require('../app/data/sotf/map.json');
const model=import('../app/sotf-model.js');
test('Sons of the Forest includes all source markers, complete tiles and referenced assets',async()=>{
  const {validateMap}=await model;assert.equal(validateMap(data).locations.length,1023);assert.equal(data.layers.length,21);
  for(let z=0;z<=4;z++)for(let x=0;x<2**z;x++)for(let y=0;y<2**z;y++)assert.ok(fs.existsSync(path.join(__dirname,`../app/assets/sotf/map/${z}-${x}-${y}.webp`)));
  for(const p of data.locations)if(p.screenshot)assert.ok(fs.existsSync(path.join(__dirname,'../app',p.screenshot)),p.screenshot);
  for(const name of ['Shovel','Rebreather','Rope Gun','Katana','Maintenance Card','VIP Card','Guest Card','Artifact A','Artifact G'])assert.ok(data.locations.some(p=>p.title===name),name);
  const bad=structuredClone(data);bad.locations.push(bad.locations[0]);assert.throws(()=>validateMap(bad));
});
test('Map layers hide all, restore all, search and distinguish underground items',async()=>{
  const {filterLocations}=await model;
  assert.equal(filterLocations(data,{layers:[]}).length,0);
  assert.equal(filterLocations(data,{layers:data.layers.map(l=>l.id)}).length,1023);
  const defaults=filterLocations(data);assert.ok(defaults.length>0&&defaults.length<150);
  const underground=filterLocations(data,{layers:['tools'],query:'shovel',region:'underground'});assert.equal(underground.length,1);assert.equal(underground[0].title,'Shovel');
  assert.equal(filterLocations(data,{layers:['tools'],query:'shovel',region:'surface'}).length,0);
  assert.equal(filterLocations(data,{layers:['tools'],query:'shovel',hideFound:true,found:[underground[0].id]}).length,0);
});
test('Map progress validates stored input and preserves explicit hide-all selection',async()=>{
  const {normalizePreferences}=await model;assert.deepEqual(normalizePreferences({layers:[],found:[data.locations[0].id,'bad',-100],hideFound:true},data),{layers:[],found:[data.locations[0].id],hideFound:true});assert.ok(normalizePreferences(null,data).layers.length>0);
});
test('North-up projection maps known corners and preserves coordinates across sizes and zoom',async()=>{
 const {projectPoint,unprojectPoint}=await model;const c={x:0,y:0,scale:1};assert.deepEqual(projectPoint({x:-2000,y:2000},c,4000,4000),{x:0,y:0});assert.deepEqual(projectPoint({x:2000,y:-2000},c,4000,4000),{x:4000,y:4000});
 for(const width of [800,1440])for(const height of [600,900])for(const scale of [.1,.7,4]){const cam={x:-32,y:27,scale},p={x:191.2,y:-435.9};const r=unprojectPoint(projectPoint(p,cam,width,height),cam,width,height);assert.ok(Math.abs(p.x-r.x)<1e-9&&Math.abs(p.y-r.y)<1e-9);}
});
