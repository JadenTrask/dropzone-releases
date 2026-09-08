const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const {normalizeQwik,decodeQwik,validateOptions,Provider}=require('../core/provider.cjs');
const catalog=require('../app/data/catalog.json');
const base=require('../app/data/builds/Ahri_ranked_default_emerald_plus_all_none.json');
const arena=require('../app/data/builds/Ahri_arena_default_emerald_plus_all_none.json');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/ahri-qwik.json'),'utf8'));
const wrap=f=>'<script type="qwik/json">'+JSON.stringify(f)+'</script>';
const options={champion:'Ahri',championKey:103,mode:'ranked',role:'default',tier:'emerald_plus',region:'all',url:'https://lolalytics.com/lol/ahri/build/'};
const engine=import('../app/engine.js');
test('Recorded source decodes into the measured champion, mode, core and sample',()=>{
 const b=normalizeQwik(wrap(fixture),options,'2026-09-05T00:00:00.000Z');
 assert.equal(b.championKey,103);assert.equal(b.header.queue,420);assert.equal(b.header.n,180767);assert.equal(b.patch,'16.17');assert.deepEqual(b.summaries.pick.items.core.set,[3118,3020,4645]);assert.equal(b.summaries.pick.items.core.n,30678);assert.equal(b.averageWinRate,51.75);
});
test('A different mode, role, champion, rank, region or matchup is rejected',()=>{
 for(const change of [{mode:'aram'},{role:'top'},{championKey:222},{tier:'all'},{region:'na'},{vs:'Zed'}])assert.throws(()=>normalizeQwik(wrap(fixture),{...options,...change}));
});
test('Changed and hostile source HTML is not executable or usable as build data',()=>{
 assert.throws(()=>decodeQwik('<script>process.exit(1)</script>'));assert.throws(()=>decodeQwik('<script type="qwik/json">{}</script>'));
 assert.throws(()=>normalizeQwik('<h1>Verify your browser</h1>',options));
});
test('Source URLs cannot be controlled by untrusted champion or mode input',()=>{
 assert.throws(()=>validateOptions({champion:'../../etc/passwd',mode:'ranked'},catalog));assert.throws(()=>validateOptions({champion:'Ahri',mode:'https://evil.test'},catalog));
 const o=validateOptions({champion:'MonkeyKing',mode:'aram',tier:'all',region:'na'},catalog);assert.equal(o.url,'https://lolalytics.com/lol/wukong/aram/build/?tier=all&region=na');
 const invalid=validateOptions({champion:'Ahri',mode:'ranked',role:'inject',tier:'evil',region:'bad',vs:'NotAChampion'},catalog);assert.equal(invalid.role,'default');assert.equal(invalid.vs,null);
});
test('Observed core order survives; six slots are unique; export counts potions',async()=>{
 const {getPlan,exportSet}=await engine;const p=getPlan(base,catalog);assert.deepEqual(p.core,[3118,3020,4645]);assert.equal(p.full.length,6);assert.equal(new Set(p.full).size,6);assert.ok(!p.full.includes(3041));
 const data=exportSet(catalog.champions.find(c=>c.id==='Ahri'),base,p,'Rift');assert.deepEqual(data.associatedChampions,[103]);assert.deepEqual(data.associatedMaps,[11]);assert.equal(data.blocks[0].items.find(x=>x.id==='2003').count,2);
 const aram={...base,mode:'aram'};assert.deepEqual(exportSet({name:'Ahri',key:103},aram,p,'ARAM').associatedMaps,[12]);assert.throws(()=>exportSet({name:'Ahri',key:103},arena,p,'Arena'));
});
test('A low-sample higher-win core falls back instead of being sold as reliable',async()=>{
 const {getPlan}=await engine;const b=structuredClone(base);b.summaries.win.items.core.n=4;b.summaries.win.items.core.wr=100;const p=getPlan(b,catalog,'performance');assert.deepEqual(p.core,b.summaries.pick.items.core.set);assert.match(p.note,/fewer than/);
});
test('Arena recommendations are legal item foundations without exposed item win rates',async()=>{
 const {getPlan}=await engine;const p=getPlan(arena,catalog);assert.ok(p.core.length===3);assert.equal(new Set(p.full).size,p.full.length);assert.ok(p.full.every(id=>catalog.items[id]));assert.ok(p.full.every(id=>![220000,220004,220007].includes(id)));assert.equal(p.coreRate,null);assert.ok(arena.augments.every(a=>!('wr' in a)&&!('winRate' in a)));assert.ok(Object.values(arena.items).every(rows=>rows.every(r=>r[1]===null)));
});
test('Unobserved item suggestions are filtered from champion-specific alternatives',async()=>{
 const {situationItems}=await engine;const c=catalog.champions.find(c=>c.id==='Ahri');const observed=new Set(base.items.popularItem.map(r=>r[0]));const rows=situationItems(c,base,catalog,['healing','magic','physical','tanks']);assert.ok(rows.length>0);assert.ok(rows.every(x=>observed.has(x.id)));assert.ok(rows.every(x=>catalog.items[x.id]));
});
test('Wilson interval reflects sample uncertainty rather than a fake guarantee',async()=>{
 const {interval}=await engine;const small=interval(60,10),large=interval(60,10000);assert.ok(small[1]-small[0]>large[1]-large[0]);assert.ok(large[0]<60&&large[1]>60);assert.equal(interval(null,100),null);
});
test('Offline cache preserves patch and reports failure; unknown modes stay unavailable',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rift-test-'));const b={...base,fetchedAt:'2020-01-01T00:00:00.000Z',patch:'10.1'};fs.mkdirSync(path.join(dir,'builds'));fs.writeFileSync(path.join(dir,'builds/Ahri_ranked_default_emerald_plus_all_none.json'),JSON.stringify(b));
 const provider=new Provider({cacheDir:dir,bundleDir:dir});provider.catalog={...catalog,updatedAt:new Date().toISOString()};const realFetch=global.fetch;global.fetch=async()=>{throw new Error('network unavailable');};
 try{const got=await provider.build({...options,refresh:true});assert.equal(got.cacheState,'offline');assert.equal(got.patch,'10.1');assert.equal(got.stalePatch,true);assert.match(got.error,/network/);const guide=await provider.build({...options,mode:'classic'});assert.equal(guide.guideOnly,true);assert.equal(guide.unavailable,true);}finally{global.fetch=realFetch;fs.rmSync(dir,{recursive:true,force:true});}
});
test('Mayhem foundation is labeled as ARAM and retains real ARAM provenance',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rift-mayhem-'));fs.mkdirSync(path.join(dir,'builds'));
 const aram={...require('../app/data/builds/Ahri_aram_default_emerald_plus_all_none.json'),fetchedAt:new Date().toISOString()};
 fs.writeFileSync(path.join(dir,'builds/Ahri_aram_default_emerald_plus_all_none.json'),JSON.stringify(aram));
 const provider=new Provider({cacheDir:dir,bundleDir:dir,requestFn:async()=>{throw new Error('Offline fixture');}});provider.catalog={...catalog,updatedAt:new Date().toISOString()};
 try{const got=await provider.build({...options,mode:'mayhem'});assert.equal(got.mode,'mayhem');assert.equal(got.header.queue,450);assert.match(got.proxy,/regular ARAM, not Mayhem/);assert.match(got.sourceUrl,/aram/);assert.match(got.guideUrl,/mayhem-builds/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
