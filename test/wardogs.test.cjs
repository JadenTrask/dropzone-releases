const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {normalizeWardogs,WardogsProvider}=require('../core/wardogs-provider.cjs');
const maps=require('../app/data/wardogs/maps.json');
const raw={weapons:require('../app/data/wardogs/weapons-reference.json'),maps:['bakurani','ozeti'].map(m=>require('../app/data/wardogs/'+m+'-reference.json'))};
const weapons=normalizeWardogs(raw,maps).weapons;
const model=import('../app/wardogs-model.js');

test('Both game maps use calibrated coordinates, north-up bearings and metre distances',async()=>{
  const {geometry,validPoint}=await model;
  for(const m of maps.maps){
    const o={x:90,y:60};
    for(const [t,bearing] of [[{x:90,y:61},0],[{x:91,y:60},90],[{x:90,y:59},180],[{x:89,y:60},270]]){const g=geometry(o,t,m);assert.equal(g.distance,100);assert.equal(g.azimuth,bearing);}
    const diagonal=geometry(o,{x:93,y:64},m);assert.equal(diagonal.distance,500);assert.ok(Math.abs(diagonal.azimuth-36.86989765)<.000001);
    assert.ok(Math.abs(geometry(o,{x:90.01,y:60},m).distance-1)<1e-8);
    assert.equal(geometry(o,o,m).azimuth,null);assert.equal(geometry(o,{x:9999,y:1},m),null);assert.equal(validPoint({x:NaN,y:60},m),false);
  }
});
test('Mortar never uses out-of-range rows; edges, interpolation and elevation limits are preserved',async()=>{
  const {firingSolution}=await model,m=maps.maps[0],o={x:80,y:60},w=weapons[0];
  const at=d=>firingSolution(o,{x:80+d/100,y:60},m,w);
  assert.equal(at(100).range,'short');assert.deepEqual(at(100).solutions,{});
  assert.equal(at(132).solutions.single.min,850);assert.equal(at(684).solutions.single.min,150);
  assert.equal(at(685).range,'long');assert.deepEqual(at(685).solutions,{});
  assert.ok(Math.abs(at(145.5).solutions.single.min-835)<1e-8);assert.equal(at(145.5).solutions.single.interpolated,true);
});
test('SPH-2 exposes only supported arcs and preserves the duplicate-distance high-arc interval',async()=>{
  const {firingSolution,milText}=await model,m=maps.maps[1],o={x:80,y:60},w=weapons[1];
  const at=d=>firingSolution(o,{x:80+d/100,y:60},m,w);
  assert.equal(at(780).solutions.low,null);assert.equal(at(780).solutions.high.min,1390);
  assert.equal(at(1181).solutions.low.min,20);assert.equal(at(2629).solutions.low.min,600);
  assert.equal(milText(at(2629).solutions.high),'610–620');assert.equal(milText(at(2628.5).solutions.high),'625');
  assert.equal(at(2630).range,'long');assert.equal(at(779).range,'short');assert.ok(Number.isFinite(at(2000).solutions.low.min));assert.ok(Number.isFinite(at(2000).solutions.high.min));
});
test('Projection and zoom preserve the coordinate under the pointer independently of aspect ratio',async()=>{
  const {fitCamera,project,unproject,zoomCamera}=await model;
  for(const [width,height] of [[540,480],[1200,780],[2200,1000]])for(const map of maps.maps){
    const camera=fitCamera(map.bounds,width,height),point={x:93.14,y:63.27};
    const pixel=project(point,camera,width,height),world=unproject(pixel,camera,width,height);
    assert.ok(Math.abs(world.x-point.x)<1e-9);assert.ok(Math.abs(world.y-point.y)<1e-9);
    const zoomed=zoomCamera(camera,3,pixel,width,height,.001,10000),after=unproject(pixel,zoomed,width,height);
    assert.ok(Math.abs(after.x-point.x)<1e-9);assert.ok(Math.abs(after.y-point.y)<1e-9);
    assert.ok(project({x:point.x,y:point.y+1},camera,width,height).y<pixel.y);
  }
});
test('Coordinate paste and target imports reject bad data without silently clamping',async()=>{
  const {parseCoordinates,validateBackup}=await model;
  assert.deepEqual(parseCoordinates('X100.05 Y80.14'),{x:100.05,y:80.14});assert.deepEqual(parseCoordinates('100.05, 80.14'),{x:100.05,y:80.14});assert.equal(parseCoordinates('100 80 44'),null);
  const good={name:'Bridge',map:'bakurani',target:{x:90,y:60},origin:{x:90,y:59},weapon:'mortar',arc:'single'};
  const backup={schema:1,game:'wardogs',targets:[good]};const rows=validateBackup(backup,maps.maps);assert.equal(rows.length,1);assert.ok(rows[0].id);assert.equal(rows[0].name,'Bridge');
  assert.throws(()=>validateBackup({...backup,targets:[good,{...good,target:{x:Infinity,y:60}}]},maps.maps));
  assert.throws(()=>validateBackup({...backup,targets:[{...good,map:'missing'}]},maps.maps));assert.throws(()=>validateBackup({...backup,targets:Array(201).fill(good)},maps.maps));
});
test('Changed map calibration requires review; key order and normal table updates do not',()=>{
  const normal=normalizeWardogs(raw,maps);assert.deepEqual(normal.mapsChanged,[]);assert.equal(normal.sourceUpdatedAt,null);assert.equal(normal.releaseValidated,false);
  const rekeyed=structuredClone(raw);rekeyed.maps[0].bounds=Object.fromEntries(Object.entries(rekeyed.maps[0].bounds).reverse());assert.deepEqual(normalizeWardogs(rekeyed,maps).mapsChanged,[]);
  const changed=structuredClone(raw);changed.maps[1].tileBounds.maxX+=.01;assert.deepEqual(normalizeWardogs(changed,maps).mapsChanged,['ozeti']);
  const table=structuredClone(raw);table.weapons.weapons[0].ballistics.single[10][1]-=1;assert.notEqual(normalizeWardogs(table,maps).fingerprint,normal.fingerprint);
  const invalid=structuredClone(raw);invalid.weapons.weapons[0].ballistics.single[0][0]='bad';assert.throws(()=>normalizeWardogs(invalid,maps));
});
test('Firing feed failures keep the last valid tables, map revision and successful fetch time',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dropzone-wardogs-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const provider=new WardogsProvider({cacheDir:dir,bundleDir:path.join(__dirname,'../app/data/wardogs'),requestFn:async()=>{throw new Error('Network unavailable');}});
  const before=await provider.get(),offline=await provider.get({refresh:true});assert.equal(offline.cacheState,'offline');assert.equal(offline.fetchedAt,before.fetchedAt);assert.equal(offline.fingerprint,before.fingerprint);assert.equal(offline.mapRevision,maps.revision);assert.match(offline.error,/Network/);
});
test('Smooth zoom keeps its cursor anchor at every step and behaves the same at 60/144 Hz',async()=>{
  const {easeZoom,unproject}=await model;
  const initial={x:80,y:60,scale:8},anchor={x:950,y:210},width=1400,height=780;
  const point=unproject(anchor,initial,width,height);
  const advance=hz=>{let camera={...initial};for(let frame=0;frame<hz/2;frame++){
    const next=easeZoom(camera,40,anchor,width,height,1000/hz,1,100);
    assert.ok(next.scale>=camera.scale&&next.scale<=40);
    const world=unproject(anchor,next,width,height);assert.ok(Math.abs(world.x-point.x)<1e-8);assert.ok(Math.abs(world.y-point.y)<1e-8);camera=next;
  }return camera;};
  const a=advance(60),b=advance(144);assert.ok(Math.abs(a.scale-b.scale)<1e-8);assert.ok(a.scale>39.9);
});
test('Smooth zoom reverses without overshoot, settles at bounds and ignores zero elapsed time',async()=>{
  const {easeZoom}=await model;const anchor={x:400,y:250};let camera={x:80,y:60,scale:8};
  assert.deepEqual(easeZoom(camera,30,anchor,800,500,0,2,50),camera);
  camera=easeZoom(camera,30,anchor,800,500,16,2,50);const before=camera.scale;
  camera=easeZoom(camera,4,anchor,800,500,16,2,50);assert.ok(camera.scale<before&&camera.scale>4);
  for(let i=0;i<150;i++)camera=easeZoom(camera,.001,anchor,800,500,16,2,50);assert.equal(camera.scale,2);
  for(let i=0;i<150;i++)camera=easeZoom(camera,100000,anchor,800,500,16,2,50);assert.equal(camera.scale,50);
});
