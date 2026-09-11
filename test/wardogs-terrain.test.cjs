const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const maps=require('../app/data/wardogs/maps.json').maps;
const terrain=import('../app/wardogs-terrain.js');
const root=path.join(__dirname,'../app');
const bytes=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const fetcher=async resource=>{try{const b=await fs.readFile(path.join(root,resource));return {ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>bytes(b)};}catch{return {ok:false}}};
test('Manual shared datum, signs, structure offsets, reset, flat assumption and unavailable values',async()=>{
  const {heightContext:h,emptyHeights,cleanHeights}=await terrain;
  assert.equal(h(emptyHeights()).available,false);
  assert.equal(h({mode:'manual',origin:null,target:12}).available,false);
  assert.equal(h({mode:'manual',origin:100,target:120,originOffset:5,targetOffset:2}).delta,17);
  assert.equal(h({mode:'manual',origin:120,target:100}).delta,-20);
  assert.equal(h({mode:'manual',origin:120,target:120}).delta,0);
  assert.equal(h({mode:'manual',origin:0,target:20,invalid:true}).available,false);
  assert.equal(h({mode:'flat'}).delta,0);assert.equal(h({mode:'flat'}).origin,null);
  assert.equal(h(cleanHeights({mode:'manual',origin:'',target:0})).available,false);
  const a=h(emptyHeights(),{origin:{height:1023},target:{height:1063}});
  assert.equal(a.origin,0);assert.equal(a.target,40);assert.equal(a.delta,40);
  assert.equal(h(emptyHeights(),{origin:{height:null},target:{height:20}}).available,false);
  assert.equal(h(emptyHeights(),{origin:{height:NaN},target:{height:20}}).available,false);
});
test('Terrain samples are independent of camera pan, zoom, viewport and inverted image Y',async()=>{
  const {TerrainProvider,locateTerrain}=await terrain,{project,unproject,zoomCamera}=await import('../app/wardogs-model.js');
  const provider=new TerrainProvider(fetcher);
  for(const map of maps){const point={x:91.5,y:72.5},manifest=await provider.manifest(map.id),sample=await provider.sample(map,point);assert.equal(sample.source,'community');
    for(const [width,height] of [[1000,700],[1800,1000]])for(const scale of [4,40,200]){
      const camera={x:point.x+1,y:point.y-2,scale},pixel=project(point,camera,width,height),roundtrip=unproject(pixel,camera,width,height);
      assert.ok(Math.abs((await provider.sample(map,roundtrip)).height-sample.height)<1e-8);
      const next=zoomCamera(camera,2,pixel,width,height,.1,2000),zoomed=unproject(pixel,next,width,height);
      assert.ok(Math.abs((await provider.sample(map,zoomed)).height-sample.height)<1e-8);
    }
    const loc=locateTerrain(manifest,point),north=locateTerrain(manifest,{...point,y:point.y+.01});assert.equal(loc.key,north.key);assert.ok(north.y<loc.y);
    assert.equal(locateTerrain(manifest,{x:manifest.coverage.gameXMin-1,y:point.y}),null);
    assert.equal((await provider.sample(map,{x:999,y:999})).height,null);
    assert.equal((await provider.sample(map,null)).height,null);
  }
});
test('Bilinear sampling uses metres and source vertical transform',async()=>{
  const {sampleChunk}=await terrain,buffer=new ArrayBuffer(8),v=new DataView(buffer);
  [0,65535,0,65535].forEach((x,i)=>v.setUint16(2*i,x,true));
  const m={verticesPerSide:2,worldZOffsetMeters:100,worldZScaleMetersPerLocalUnit:2},e={minLocalZ:0,maxLocalZ:10};
  assert.equal(sampleChunk(m,e,buffer,{x:.5,y:.5}),110);
  assert.equal(sampleChunk(m,e,buffer,{x:1,y:1}),120);
});
test('Every bundled terrain chunk and Zestafona tile matches its recorded checksum',async()=>{
  for(const map of maps){const dir=path.join(root,'data/wardogs/terrain',map.id),m=JSON.parse(await fs.readFile(path.join(dir,'dataset.json')));assert.equal(Object.keys(m.chunks).length,256);
    for(const entry of Object.values(m.chunks)){const b=await fs.readFile(path.join(dir,entry.file));assert.equal(b.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),entry.sha256);}
  }
  const manifest=require('../app/data/wardogs/zestafona-assets.json');assert.equal(manifest.files.length,590);
  for(const file of manifest.files){const b=await fs.readFile(path.join(root,file.path));assert.equal(b.length,file.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),file.sha256);assert.equal(b.subarray(8,12).toString(),'WEBP');}
});
test('Missing/corrupt terrain stays unavailable and repeated requests deduplicate',async()=>{
  const {TerrainProvider}=await terrain,map=maps[0],point={x:90,y:70};
  assert.equal((await new TerrainProvider(async()=>({ok:false})).sample(map,point)).height,null);
  const corrupt=new TerrainProvider(async r=>r.endsWith('.bin')?{ok:true,arrayBuffer:async()=>new ArrayBuffer(131072)}:fetcher(r));
  assert.match((await corrupt.sample(map,point)).reason,/integrity/);
  let reads=0;const provider=new TerrainProvider(async r=>{if(r.endsWith('.bin'))reads++;return fetcher(r)});
  await Promise.all([provider.sample(map,point),provider.sample(map,point)]);assert.equal(reads,1);
  await provider.sample(map,point);assert.equal(reads,1);
  await provider.sample(maps[1],point);assert.equal(reads,2);
});
test('Obsolete marker/map requests and cancelled lookups never update UI',async()=>{
  const {TerrainRequest}=await terrain,pending=[];const provider={sample:(map,p)=>new Promise(resolve=>pending.push(()=>resolve({height:p.x,map:map.id})))};
  const request=new TerrainRequest(provider),updates=[];
  const first=request.run(maps[0],{origin:{x:1},target:{x:2}},s=>updates.push(s));
  const second=request.run(maps[1],{origin:{x:10},target:{x:20}},s=>updates.push(s));
  pending[2]();pending[3]();await second;pending[0]();pending[1]();await first;
  assert.equal(updates.length,1);assert.equal(updates[0].target.height,20);
  const third=request.run(maps[2],{origin:{x:30},target:{x:40}},s=>updates.push(s));request.cancel();pending[4]();pending[5]();await third;assert.equal(updates.length,1);
});
test('Desktop terrain bridge reads packaged files and rejects unrelated paths',async()=>{
  const {readTerrainFile}=require('../core/wardogs-terrain-files.cjs');
  for(const map of maps)assert.equal(JSON.parse(new TextDecoder().decode(await readTerrainFile(`data/wardogs/terrain/${map.id}/dataset.json`))).mapId,map.id);
  for(const value of ['../package.json','data/wardogs/terrain/zestafona/../../package.json','C:/Windows/win.ini','data/wardogs/terrain/fake/dataset.json',null])await assert.rejects(readTerrainFile(value));
});
