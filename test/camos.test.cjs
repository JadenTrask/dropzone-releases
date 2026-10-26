const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const catalog=require('../app/data/cod/mw4-camos.json');

test('MW4 catalogue contains all launch weapons and both modes without fabricated requirements',()=>{
 assert.equal(catalog.weapons.length,33);assert.equal(new Set(catalog.weapons.map(w=>w.id)).size,33);
 for(const w of catalog.weapons){
  assert.equal(w.camos.length,14,w.name);assert.equal(new Set(w.camos.map(c=>c.id)).size,14,w.name);
  assert.equal(w.camos.filter(c=>c.tier==='military').length,8);assert.equal(w.camos.filter(c=>c.tier==='special').length,3);
  assert.deepEqual(w.camos.slice(-3).map(c=>c.tier),['gold','platinum','harmonic']);
  for(const c of w.camos){assert.ok(c.requirements.mp,c.name);assert.ok(c.requirements.dmz,c.name);if(c.tier==='military')assert.ok(c.level>0);}
 }
 assert.deepEqual(catalog.weapons.find(w=>w.id==='han-86').camos.slice(0,8).map(c=>c.level),[10,18,25,34,42,50,57,65]);
 assert.deepEqual(catalog.mastery.mp.map(c=>c.target),[250,300,500]);assert.deepEqual(catalog.mastery.dmz.map(c=>c.target),[2500,50,25000]);
 const suspect=catalog.weapons.find(w=>w.name==='KG-7 Vulcan').camos.find(c=>c.name==='Treeline');assert.match(suspect.warning,/CODMunity/);
 for(const item of [...catalog.weapons.flatMap(w=>[w,...w.camos]),...Object.values(catalog.mastery).flat(),catalog.divergence]){
  assert.match(item.image,/^assets\/camos\/mw4\/[a-f0-9]+\.webp$/);assert.ok(fs.statSync(path.join(__dirname,'../app',item.image)).size>0);
 }
});

test('weapon unlocks are shared; recording later milestones checks only implied prior weapon camos',async()=>{
 const m=await import('../app/camos-model.js'),weapon=catalog.weapons[0],empty=m.emptyProgress();
 let progress=m.toggleCamo(empty,weapon,'military-camo-3',true);assert.equal(m.weaponCount(progress,weapon),3);assert.equal(m.weaponCount(empty,weapon),0);
 progress=m.toggleCamo(progress,weapon,weapon.camos[9].id,true);assert.equal(m.weaponCount(progress,weapon),4,'Specials remain independent');
 progress=m.toggleCamo(progress,weapon,'gold',true);assert.equal(m.weaponCount(progress,weapon),12);assert.equal(m.camoTotals(catalog,progress).gold,1);
 assert.equal(m.weaponCount(progress,catalog.weapons[1]),0,'Do not silently alter another weapon');
 progress=m.toggleCamo(progress,weapon,'military-camo-2',false);assert.equal(m.weaponCount(progress,weapon),11);assert.equal(m.earned(progress,weapon,'gold'),true,'Unchecking changes only the selected record');
 assert.throws(()=>m.toggleCamo(progress,weapon,'unknown',true),/Unknown/);
});

test('Divergence requires 33 Harmonic unlocks, not class Gold or 32 weapons',async()=>{
 const m=await import('../app/camos-model.js');let progress=m.emptyProgress();
 for(const w of catalog.weapons.slice(0,32))progress=m.toggleCamo(progress,w,'harmonic-break',true);
 assert.equal(m.camoTotals(catalog,progress).divergence,false);
 progress=m.toggleCamo(progress,catalog.weapons[32],'harmonic-break',true);
 assert.deepEqual(m.camoTotals(catalog,progress),{gold:33,platinum:33,harmonic:33,divergence:true,total:462,possible:462});
 progress=m.toggleCamo(progress,catalog.weapons[0],'harmonic-break',false);assert.equal(m.camoTotals(catalog,progress).divergence,false);
});

test('mastery checkboxes are mode-specific and preserve completed early-preview progress',async()=>{
 const m=await import('../app/camos-model.js');let progress=m.emptyProgress();
 progress=m.toggleMastery(progress,'mp',catalog.mastery.mp[0],true);assert.equal(progress.mastery.mp['mercurial-drift'],true);assert.deepEqual(progress.mastery.dmz,{});
 progress=m.toggleMastery(progress,'dmz',catalog.mastery.dmz[0],true);assert.equal(progress.mastery.dmz.chiral,true);assert.equal(m.camoTotals(catalog,progress).gold,0);
 progress=m.toggleMastery(progress,'mp',catalog.mastery.mp[0],false);assert.equal(progress.mastery.mp['mercurial-drift'],false);assert.equal(progress.mastery.dmz.chiral,true);
 assert.throws(()=>m.toggleMastery(progress,'bad',catalog.mastery.mp[0],true),/Invalid/);assert.throws(()=>m.toggleMastery(progress,'mp',catalog.mastery.mp[0],7),/Invalid/);
 progress.mastery.mp['mercurial-drift']=250;assert.equal(m.masteryEarned(progress,'mp',catalog.mastery.mp[0]),true);progress.mastery.mp['mercurial-drift']=7;assert.equal(m.masteryEarned(progress,'mp',catalog.mastery.mp[0]),false);
});

test('local save survives reload and rejects damaged/future saves without replacing them',async()=>{
 const m=await import('../app/camos-model.js');let raw=null;const storage={getItem:()=>raw};
 assert.deepEqual(m.readProgress(storage),m.emptyProgress());
 const progress=m.toggleCamo(m.emptyProgress(),catalog.weapons[0],'gold',true);raw=JSON.stringify(progress);assert.deepEqual(m.readProgress(storage),progress);
 for(const invalid of ['broken','null','[]',JSON.stringify({...progress,version:2}),JSON.stringify({...progress,mastery:{mp:[],dmz:{}}}),JSON.stringify({...progress,unlocked:{bad:{gold:'true'}}})]){
  raw=invalid;assert.throws(()=>m.readProgress(storage));assert.equal(raw,invalid);
 }
 progress.unlocked['future-weapon']={'future-camo':true};raw=JSON.stringify(progress);assert.equal(m.readProgress(storage).unlocked['future-weapon']['future-camo'],true);
});

test('prerequisites distinguish class-wide Platinum and global Harmonic',async()=>{
 const m=await import('../app/camos-model.js'),w=catalog.weapons[0];let progress=m.emptyProgress();
 assert.match(m.camoGate(catalog,progress,w,w.camos[12]),/all 8 Assault Rifle weapons · 0\/8/);
 progress=m.toggleCamo(progress,w,'gold',true);assert.match(m.camoGate(catalog,progress,w,w.camos[12]),/1\/8/);
 assert.match(m.camoGate(catalog,progress,w,w.camos[13]),/Platinum on 33 weapons · 0\/33/);
});
