const {test} = require('node:test'), assert = require('node:assert/strict');
const data = require('../app/data/wardogs/damage-reference.json');
const get = id => data.weapons.find(w => w.id === id);
test('multi-weapon TTK compares identical target settings against the chosen baseline', async () => {
  const {compareDamage} = await import('../app/damage-comparison.js');
  const guns = [get('m4'),get('fal'),get('ak74')];
  const rows = compareDamage(guns,{range:0,health:100},'m4');
  assert.ok(Math.abs(rows[0].result.ttk - .225)<1e-9);
  assert.equal(rows[0].result.hits,4);
  assert.ok(rows[1].delta<0);
  assert.ok(rows[2].delta>0);
  assert.equal(rows[1].fastest,true);
  const armor = compareDamage(guns,{body:4,helmet:4,health:200,range:500},'fal');
  assert.equal(armor[1].delta,0);
  assert.ok(armor[0].result.hits>rows[0].result.hits);
  assert.ok(armor[0].result.ttk>rows[0].result.ttk);
});
test('missing profiles, RPM, unsupported ammo and pellets never become a fastest zero-second result', async () => {
  const {compareDamage} = await import('../app/damage-comparison.js');
  const m4=get('m4'),guns=[m4,{...m4,id:'no-rpm',rpm:null},{...m4,id:'pellets',unit:'pellet'},{id:'unknown'}];
  const rows=compareDamage(guns,{range:0},'m4');
  for(const row of rows.slice(1)) {assert.equal(row.delta,null);assert.equal(row.fastest,false);assert.equal(row.bar,0);}
  assert.equal(compareDamage([m4,get('fal')],{ammo:'AP'},'fal')[0].delta,null);
  assert.equal(compareDamage([m4],{range:99999},'m4')[0].result.valid,false);
  const head=compareDamage([m4,{...m4,id:'tied'}],{health:1},'m4');
  assert.ok(head.every(row=>row.result.ttk===0 && row.delta===0 && row.fastest && row.bar===0));
});
test('saved comparisons deduplicate known weapons, cap six and preserve an intentionally empty list', async () => {
  const {comparisonIds}=await import('../app/damage-comparison.js');
  const ids=data.weapons.slice(0,8).map(w=>w.id);
  assert.deepEqual(comparisonIds([ids[0],ids[0],'not-a-weapon',...ids.slice(1)],data.weapons),ids.slice(0,6));
  assert.deepEqual(comparisonIds([],data.weapons),[]);
  assert.deepEqual(comparisonIds(null,data.weapons),[]);
});

test('per-weapon ammunition changes baseline deltas independently and safely migrates saved rounds', async()=>{
 const {compareDamage,comparisonAmmo}=await import('../app/damage-comparison.js');
 const guns=[get('m4'),get('fal')];
 assert.deepEqual(comparisonAmmo(guns,null,'AP'),{m4:'AP',fal:'FMJ'});
 assert.deepEqual(comparisonAmmo(guns,{m4:'invalid',fal:'HP',unknown:'AP'}),{m4:'FMJ',fal:'FMJ'});
 const target={body:4,helmet:4,zone:'Upper torso',range:100,health:100};
 const fmj=compareDamage(guns,{...target,compareAmmo:{m4:'FMJ',fal:'FMJ'}},'m4');
 const mixed=compareDamage(guns,{...target,ammo:'HP',compareAmmo:{m4:'AP',fal:'FMJ'}},'m4');
 assert.equal(mixed[0].result.ammo,'AP');assert.equal(mixed[1].result.ammo,'FMJ');
 assert.deepEqual(mixed[1].result,fmj[1].result);assert.notEqual(mixed[0].result.damage,fmj[0].result.damage);
 assert.equal(mixed[1].delta,mixed[1].result.ttk-mixed[0].result.ttk);
});
