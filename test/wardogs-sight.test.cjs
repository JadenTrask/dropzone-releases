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

test('SPH-2 sight places 1679 m proportionally between 120 and 130 mil stadia',async()=>{
 const {sightScale}=await import('../app/wardogs-gunner.js');
 const input=await settings(1679,0),command=input.shot.solutions.low;
 assert.ok(Math.abs(command.min-(120+13/43*10))<1e-8);
 const rows=sightScale(weapons[1],command),a=rows.find(r=>r.mil===120),b=rows.find(r=>r.mil===130);
 assert.equal(a.range,1666);assert.equal(b.range,1709);
 assert.ok(a.y<230&&b.y>230);assert.ok(Math.abs((230-a.y)/(b.y-a.y)-13/43)<1e-8);
});
test('SPH-2 scale preserves the triple peak and decreasing high-arc ranges',async()=>{
 const {sightScale}=await import('../app/wardogs-gunner.js');
 const peak=sightScale(weapons[1],{min:610,max:620});
 assert.deepEqual(peak.filter(r=>r.range===2629).map(r=>r.mil),[600,610,620]);
 const end=sightScale(weapons[1],{min:1390,max:1390});
 assert.equal(end.find(r=>r.mil===1390).range,780);assert.equal(end.find(r=>r.mil===1400).range,735);
 assert.ok(end.find(r=>r.mil===1400).y>end.find(r=>r.mil===1390).y);
});
test('Gunner sight does not render a calibrated scale for invalid shots',async()=>{
 const {gunnerSight}=await import('../app/wardogs-gunner.js');
 assert.doesNotMatch(gunnerSight(null,'low',false,weapons[1]),/data-stadia-mil/);
 const input=await settings(1679,0);assert.doesNotMatch(gunnerSight(input.shot,'low',true,weapons[1]),/data-stadia-mil/);
});

test('Observed stabilized SPH-2 marks calibrate both firing solution and optic without mutating feed',async()=>{
 const {firingSolution}=await model,{sightScale}=await import('../app/wardogs-gunner.js');
 const map={bounds:{minX:0,minY:0,maxX:100,maxY:100},coordinateMetersPerUnit:100};
 for(const [distance,mil] of [[2402,360],[2420,370],[2437,380]]){
  const shot=firingSolution({x:0,y:0},{x:distance/100,y:0},map,weapons[1]);
  assert.ok(Math.abs(shot.solutions.low.min-mil)<1e-8);
  assert.equal(sightScale(weapons[1],shot.solutions.low).find(r=>r.mil===mil).range,distance);
 }
 assert.equal(weapons[1].ballistics.low.find(r=>r[1]===370)[0],2422);
 const between=firingSolution({x:0,y:0},{x:24.285,y:0},map,weapons[1]);
 assert.ok(Math.abs(between.solutions.low.min-375)<1e-8);
});
test('Compass major labels stay at multiples of 15 through north and fractional bearings',async()=>{
 const {gunnerSight}=await import('../app/wardogs-gunner.js');
 for(const bearing of [0,1,14.5,90,216.9,359.9]){
  const input=await settings(1679,0);input.shot.azimuth=bearing;
  const svg=gunnerSight(input.shot,'low',false,weapons[1]);
  const labels=[...svg.matchAll(/y="30" stroke="none">(\d+)°/g)].map(m=>Number(m[1]));
  assert.ok(labels.length>=5);assert.ok(labels.every(n=>n%15===0&&n>=0&&n<360));
  if(bearing===0||bearing===359.9)assert.ok(labels.includes(0));
 }
});

test('Video transcription covers every SPH-2 optic mark and both solutions share it',async()=>{
 const {SPH2_OPTIC_MARKS}=await import('../app/wardogs-optic-data.js');
 const {calibratedBallistics,interpolate}=await model;
 const {sightScale}=await import('../app/wardogs-gunner.js');
 assert.equal(SPH2_OPTIC_MARKS.length,139);
 assert.deepEqual(SPH2_OPTIC_MARKS.map(r=>r[0]),Array.from({length:139},(_,i)=>20+i*10));
 const tables=calibratedBallistics(weapons[1]);
 for(const [mil,range] of SPH2_OPTIC_MARKS){
  const command=interpolate(tables[mil<=600?'low':'high'],range);
  assert.ok(command.min<=mil&&command.max>=mil);
  assert.equal(sightScale(weapons[1],{min:mil,max:mil}).find(r=>r.mil===mil).range,range);
 }
 assert.deepEqual(SPH2_OPTIC_MARKS.filter(r=>r[1]===2629).map(r=>r[0]),[600,610,620]);
 assert.equal(tables.high.find(r=>r[1]===1160)[0],1685);
});
