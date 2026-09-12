const {test}=require('node:test'),assert=require('node:assert/strict');
const weapons=require('../app/data/wardogs/wardogs-data.json').weapons;
const sight=import('../app/wardogs-sight.js'),model=import('../app/wardogs-model.js');
async function settings(distance,delta,arc='low',weapon=weapons[1]){const {interpolate}=await model;return {shot:{range:'in',distance,azimuth:90,solutions:{[arc]:interpolate(weapon.ballistics[arc],distance,weapon.minElevationMil,weapon.maxElevationMil)}},weapon,arc,heights:{available:true,delta},experimental:true};}
test('Every supported table row retains horizontal range and original MIL at any height',async()=>{
  const {sightSolution}=await sight;
  for(const weapon of weapons)for(const [arc,table] of Object.entries(weapon.ballistics))for(const [distance,mil] of table){if(distance<weapon.minRange||distance>weapon.maxRange||mil<weapon.minElevationMil||mil>weapon.maxElevationMil)continue;
    for(const delta of [0,20,-20,200,-200]){const input=await settings(distance,delta,arc,weapon),result=sightSolution(input);assert.equal(result.distance,distance);assert.deepEqual(result.command,input.shot.solutions[arc]);assert.equal(result.status,'flat');}}
});
test('Missing heights and previously enabled experimental preference cannot suppress or adjust flat settings',async()=>{
  const {sightSolution}=await sight,base=await settings(2000,20);
  for(const heights of [undefined,{available:false},{available:true,delta:null}])for(const experimental of [false,true]){
    const result=sightSolution({...base,heights,experimental});assert.equal(result.distance,2000);assert.deepEqual(result.command,base.shot.solutions.low);
  }
});
test('Changed maps, missing arcs, coincident markers and out-of-range shots have no sight setting',async()=>{
  const {sightSolution}=await sight,base=await settings(2000,20);
  for(const input of [{...base,mapChanged:true},{...base,shot:null},{...base,arc:'missing'},...['coincident','below','above'].map(range=>({...base,shot:{...base.shot,range}})),{...base,shot:{...base.shot,azimuth:null}},{...base,shot:{...base.shot,distance:NaN}}]){
    const result=sightSolution(input);assert.equal(result.distance,null);assert.equal(result.command,null);
  }
});
