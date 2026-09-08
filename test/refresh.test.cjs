const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {SourceCache}=require('../core/source-cache.cjs');
const {CodProvider}=require('../core/cod-provider.cjs');
const {Provider}=require('../core/provider.cjs');
const {normalizeFinals}=require('../core/patch-provider.cjs');
async function temporary(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dropzone-refresh-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}

test('A recent disk snapshot never skips the first download, and a new process gets source changes',async t=>{
  const dir=await temporary(t);let calls=0,now=Date.now();
  const options={id:'session',url:'https://example.test/feed',cacheDir:dir,bundleDir:dir,now:()=>now,normalize:version=>({version,sourceUpdatedAt:'2026-09-01T00:00:00Z'}),validate:d=>Number.isInteger(d.version),requestFn:async()=>++calls};
  const first=new SourceCache(options);
  const results=await Promise.all([first.get(),first.get(true),first.get()]);assert.equal(calls,1);assert.ok(results.every(d=>d.version===1));
  assert.equal((await first.get()).version,1);assert.equal(calls,1);
  const second=new SourceCache(options);const reopened=await second.get();assert.equal(reopened.version,2);assert.equal(calls,2);
  now+=15*60_000;assert.equal((await second.get()).version,3);assert.equal(calls,3);
  assert.equal((await second.get(true)).version,4);assert.equal(calls,4);
});

test('Failed refresh stays failed when navigating, preserves dates, retries after a minute, and recovers',async t=>{
  const dir=await temporary(t);let now=Date.now(),fail=false,calls=0;
  const feed=new SourceCache({id:'failure',url:'https://example.test/feed',cacheDir:dir,bundleDir:dir,now:()=>now,normalize:version=>({version,sourceUpdatedAt:'2026-09-01T00:00:00Z'}),validate:d=>Number.isInteger(d.version),requestFn:async()=>{calls++;if(fail)throw new Error('Connection failed');return calls;}});
  const valid=await feed.get();now+=1000;fail=true;
  const failed=await feed.get(true),navigated=await feed.get();assert.equal(calls,2);assert.equal(navigated.cacheState,'offline');assert.equal(navigated.error,failed.error);assert.equal(navigated.fetchedAt,valid.fetchedAt);assert.equal(navigated.sourceUpdatedAt,valid.sourceUpdatedAt);
  const disk=JSON.parse(await fs.readFile(path.join(dir,'failure.json'),'utf8'));assert.equal(disk.error,undefined);assert.equal(disk.version,1);
  fail=false;now+=60_000;const recovered=await feed.get();assert.equal(calls,3);assert.equal(recovered.cacheState,'live');assert.equal(recovered.error,undefined);assert.notEqual(recovered.fetchedAt,valid.fetchedAt);assert.equal(recovered.sourceUpdatedAt,valid.sourceUpdatedAt);
});

test('BO7 and Warzone ranked download changed attachment sets after reopening without rebuilding',async t=>{
  const dir=await temporary(t);let calls=0,revised=false;
  const requestFn=async url=>{
    calls++;const file=url.endsWith('/warzoneranked')?'warzone-ranked.json':'cod-ranked.json';
    const raw=JSON.parse(await fs.readFile(path.join(__dirname,'fixtures',file),'utf8'));
    if(revised)for(const s of raw.sections)for(const c of s.cards||[])if(c.Optic)c.Optic='Changed source optic';
    return raw;
  };
  const options={cacheDir:dir,bundleDir:dir,requestFn};
  const first=new CodProvider(options);
  for(const feed of ['bo7-ranked','warzone-ranked'])assert.equal((await first.getBuilds({feed})).cacheState,'live');
  revised=true;const second=new CodProvider(options);
  for(const feed of ['bo7-ranked','warzone-ranked']){
    const current=await second.getBuilds({feed});assert.equal(current.cacheState,'live');assert.ok(current.builds.some(b=>b.attachments.some(a=>a.name==='Changed source optic')));
    if(feed==='bo7-ranked')assert.ok(current.builds.every(b=>['M15 Mod 0','MPC-25'].includes(b.weapon)));
  }
  assert.equal(calls,4);
});

test('League catalog gets a new patch at every process start even when the disk copy was just downloaded',async t=>{
  const dir=await temporary(t);let version='16.17.1',calls=0;
  const requestFn=async url=>{
    calls++;
    if(url.endsWith('/versions.json'))return [version];
    if(url.endsWith('/champion.json'))return {data:{Ahri:{id:'Ahri',key:'103',name:'Ahri',tags:['Mage']}}};
    if(url.endsWith('/item.json'))return {data:{1001:{name:'Boots'}}};
    if(url.endsWith('/runesReforged.json'))return [];
    if(url.endsWith('/summoner.json'))return {data:{Flash:{id:'SummonerFlash',key:'4',name:'Flash',image:{full:'SummonerFlash.png'}}}};
    throw new Error('Unexpected URL');
  };
  const options={cacheDir:dir,bundleDir:dir,requestFn},first=new Provider(options);
  assert.equal((await first.getCatalog()).version,'16.17.1');await first.getCatalog();assert.equal(calls,5);
  version='16.18.1';const reopened=new Provider(options);assert.equal((await reopened.getCatalog()).version,version);assert.equal(calls,10);
});

test('League retains the failed selection result instead of silently returning a clean cached build',async()=>{
  const provider=new Provider({cacheDir:'unused',bundleDir:'unused'});let calls=0;
  provider.getCatalog=async()=>({champions:[{id:'Ahri',key:103}]});
  provider.loadBuild=async()=>{calls++;return calls===1?{error:'Source offline',cacheState:'offline',fetchedAt:'2026-09-01T00:00:00Z'}:{cacheState:'live'};};
  const selection={champion:'Ahri',mode:'ranked'};const first=await provider.build(selection),again=await provider.build(selection);
  assert.deepEqual(again,first);assert.equal(calls,1);assert.equal((await provider.build({...selection,refresh:true})).cacheState,'live');assert.equal(calls,2);
});

test('THE FINALS feature card puts 11.8 above 11.7 while retaining its store label',async()=>{
  const {patchPresentation}=await import('../app/patch-model.js');
  const xml=await fs.readFile(path.join(__dirname,'fixtures/finals-patches.xml'),'utf8');
  const d=normalizeFinals(xml),view=patchPresentation([...d.articles].reverse());
  assert.equal(view.featured.title,'Store Update 11.8.0');assert.equal(view.featured.kind,'Store update');assert.equal(view.heading,'LATEST UPDATE');assert.equal(view.action,'Read update');assert.equal(view.rest[0].title,'Update 11.7.0');
});
