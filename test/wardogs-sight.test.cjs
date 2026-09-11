const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const weapons=require('../app/data/wardogs/wardogs-data.json').weapons;
const sight=import('../app/wardogs-sight.js'),model=import('../app/wardogs-model.js');
async function settings(distance,delta,arc='low',weapon=weapons[1]){const {interpolate}=await model;return {shot:{range:'in',distance,azimuth:90,solutions:{[arc]:interpolate(weapon.ballistics[arc],distance,weapon.minElevationMil,weapon.maxElevationMil)}},weapon,arc,heights:{available:true,delta},experimental:true};}
test('Height-model payloads match pinned upstream hashes',()=>{
  const hashes={'low-main':'6f2370ee6df320cf539dac00322d70713a81dac917e67adfd112757ec8a0e58e','low-tail-apex':'6d72cf23ccb8d33c4a8dd9434d8bb653012a163b3993962e68e0611be9a88f71','high-v2':'42eb2bb6a5b2f24aeb04ef4f8fcbba65f3aca22ada0f4af9486101f119a39034'};
  for(const [name,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`${__dirname}/../app/data/wardogs/correction/${name}.json`)).digest('hex'),hash);
});
test('Every supported same-height table row preserves original range and MIL, including duplicates',async()=>{
  const {sightSolution}=await sight;
  for(const weapon of weapons)for(const [arc,table] of Object.entries(weapon.ballistics))for(const [distance,mil] of table){if(distance<weapon.minRange||distance>weapon.maxRange||mil<weapon.minElevationMil||mil>weapon.maxElevationMil)continue;
    const input=await settings(distance,0,arc,weapon),result=sightSolution(input);assert.equal(result.distance,distance);assert.deepEqual(result.command,input.shot.solutions[arc]);assert.equal(result.status,'flat');}
});
test('SPH-2 uphill and downhill sight settings follow the candidate, never slant distance',async()=>{
  const {sightSolution,rangeAtCommand}=await sight;
  const up=sightSolution(await settings(2000,20)),down=sightSolution(await settings(2000,-20));
  assert.equal(up.distance,2046);assert.equal(up.command.min,220);assert.equal(down.distance,1979);assert.equal(down.command.min,200);
  assert.ok(up.distance>2000);assert.ok(down.distance<2000);
  assert.notEqual(up.distance,Math.hypot(2000,20));
  const highUp=sightSolution(await settings(2500,40,'high')),highDown=sightSolution(await settings(2500,-20,'high'));
  assert.equal(highUp.distance,2513);assert.equal(highDown.distance,2488);assert.ok(highUp.command.min<highDown.command.min);
  assert.equal(rangeAtCommand([[100,10],[200,20]],15),150);assert.equal(rangeAtCommand([[100,10]],20),null);
});
test('Mortar, opt-out, missing heights, changed tables/maps, ambiguous arcs and invalid targets never get invented corrections',async()=>{
  const {sightSolution}=await sight;const base=await settings(2000,20);
  for(const input of [{...base,experimental:false},{...base,heights:{available:false}},{...base,heights:{available:true,delta:null}},{...base,mapChanged:true},{...base,shot:null},{...base,shot:{...base.shot,range:'coincident',azimuth:null}},{...base,weapon:{...base.weapon,maxElevationMil:2000}},{...base,shot:{...base.shot,solutions:{low:{min:600,max:610}}}},await settings(400,20,'single',weapons[0]),await settings(2000,200),await settings(2629,20,'high')]){assert.equal(sightSolution(input).distance,null);}
  const unreachable=sightSolution(await settings(2625,20));assert.equal(unreachable.status,'unreachable');assert.equal(unreachable.command,null);
});
test('Family boundary disagreements remain blank instead of falling back to a plausible adjusted number',async()=>{
  const {sightSolution}=await sight;
  assert.equal(sightSolution(await settings(2500,40)).distance,null);
});
