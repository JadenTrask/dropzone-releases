const test=require('node:test'),assert=require('node:assert/strict');
const data=require('../app/data/wardogs/damage-reference.json');
test('damage references distinguish body coverage, head coverage, unsupported range and unknown fire rate',async()=>{
 const {solveDamage}=await import('../app/wardogs-damage-engine.js'),m4=data.weapons.find(w=>w.id==='m4');
 assert.ok(Math.abs(solveDamage(m4).damage-30.8)<1e-9);
 assert.ok(Math.abs(solveDamage(m4,{body:2}).damage-18.48)<1e-9);
 assert.equal(solveDamage(m4,{body:2}).hits,6);
 assert.equal(solveDamage(m4,{zone:'Neck',helmet:2}).cover.covered,false);
 assert.equal(solveDamage(m4,{zone:'Neck',helmet:3}).cover.covered,true);
 assert.equal(solveDamage(m4,{zone:'Upper arm',body:3}).cover.covered,false);
 assert.equal(solveDamage(m4,{zone:'Upper arm',body:4}).cover.covered,true);
 assert.equal(solveDamage(m4,{range:1201}).valid,false);
 assert.equal(solveDamage(m4,{range:850}).interpolated,true);
 assert.equal(solveDamage(m4,{range:NaN}).valid,false);
 assert.equal(solveDamage(data.weapons.find(w=>w.id==='ggx-17')).ttk,null);
 assert.equal(solveDamage(data.weapons.find(w=>w.id==='rpg-7')).valid,false);
});
test('progression imports preserve unknown values, ignore secrets and reject malformed input',async()=>{
 const {parseProgress,careerLevel}=await import('../app/wardogs-progress-data.js');
 const partial=parseProgress(JSON.stringify({roles:{assault:4},password:'never keep',cash:0}));
 assert.equal(partial.roles.medic.level,null);assert.equal(partial.cash,0);assert.equal(careerLevel(partial),null);assert.equal(partial.password,undefined);
 const full=parseProgress(JSON.stringify({roles:{assault:4,medic:3,recon:2,support:1,driver:0,pilot:0}}));assert.equal(careerLevel(full),10);
 assert.throws(()=>parseProgress('{bad'));
 assert.throws(()=>parseProgress(JSON.stringify({roles:{assault:-1}})));
 assert.throws(()=>parseProgress(JSON.stringify({roles:{assault:2.3}})));
 assert.throws(()=>parseProgress(JSON.stringify({roles:{assault:'4'}})));
 assert.throws(()=>parseProgress(JSON.stringify({roles:{}})));
});
