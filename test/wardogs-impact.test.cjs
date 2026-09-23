const test=require('node:test');const assert=require('node:assert/strict');
const model=import('../app/wardogs-model.js');
const map={bounds:{minX:0,maxX:100,minY:0,maxY:100},coordinateMetersPerUnit:100};
const weapon={minRange:100,maxRange:1000,ballistics:{}};
test('impact correction keeps target fixed and supports repeated shots',async()=>{
 const {impactCorrection}=await model;const gun={x:50,y:50},target={x:50,y:55};
 const first=impactCorrection(gun,target,target,{x:51,y:54},map,weapon);
 assert.equal(first.valid,true);assert.deepEqual(first.aim,{x:49,y:56});assert.ok(first.bearingDelta<0);assert.ok(first.distanceDelta>0);
 const second=impactCorrection(gun,target,first.aim,{x:50,y:54.5},map,weapon);
 assert.deepEqual(second.aim,{x:49,y:56.5});assert.deepEqual(target,{x:50,y:55});
 const hit=impactCorrection(gun,target,second.aim,target,map,weapon);assert.deepEqual(hit.aim,second.aim);assert.equal(hit.miss,0);
});
test('impact correction refuses unsupported and invalid points',async()=>{
 const {impactCorrection}=await model;const gun={x:50,y:50},target={x:50,y:55};
 assert.equal(impactCorrection(gun,target,target,{x:50,y:40},map,weapon).valid,false);
 assert.equal(impactCorrection(gun,target,target,{x:NaN,y:40},map,weapon),null);
});
