const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {CodProvider,normalize,fromHtml}=require('../core/cod-provider.cjs');
const {GameService}=require('../core/game-service.cjs');
const recorded=require('./fixtures/cod-ranked.json');
const feed='bo7-ranked';
const oldDate='2020-01-01T00:00:00.000Z';
const fixture=()=>structuredClone(recorded);
async function dirs(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'truck-cod-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const cacheDir=path.join(root,'cache'),bundleDir=path.join(root,'bundle');await fs.mkdir(bundleDir);return {root,cacheDir,bundleDir};}

test('Recorded ranked feed preserves exact attachments, source date, and game-specific code',()=>{
  const data=normalize(fixture(),feed,oldDate);
  assert.equal(data.builds.length,3);assert.equal(data.sourceUpdatedAt,'2026-06-15T03:16:08.804Z');assert.equal(data.fetchedAt,oldDate);
  const b=data.builds[0];assert.equal(b.weapon,'M15 Mod 0');assert.equal(b.code,'A01-AUY8U-ETU65-1');
  assert.deepEqual(b.attachments.map(a=>[a.slot,a.name]),[['Optic','Lethal Tools ELO'],['Barrel','20" Delta-F2 Barrel'],['Rear Grip','Hexcut Grip'],['Stock','Wander-3V Stock'],['Fire Mods','Buffer Spring']]);
  assert.equal(b.weaponGame,'bo7');assert.equal(b.sourceUrl,'https://codmunity.gg/weapon/bo7/m15-mod-0');
  assert.equal(b.attachments[0].unlockWeapon,'Peacekeeper Mk1');
});

test('Legacy ranked collection labels never permit BO6 or public-game mixing',()=>{
  for(const field of ['Game','appGame','collec','meta']){const p=fixture();p.sections[0].cards[0][field]='bo6';assert.throws(()=>normalize(p,feed),/different game mode/);}
  assert.throws(()=>normalize(fixture(),'bo7-public'),/different game or mode/);
  assert.throws(()=>normalize(fixture(),'warzone'),/different game or mode/);
  const p=fixture();p.metas[0].game='bo6';assert.throws(()=>normalize(p,feed),/different game or mode/);
});

test('Incomplete attachment sets are omitted without inventing missing slots',()=>{
  const p=fixture();delete p.sections[0].cards[0].Barrel;
  const data=normalize(p,feed);assert.equal(data.builds.length,2);assert.equal(data.rejected,1);
  assert.ok(!data.builds.some(b=>b.id===recorded.sections[0].cards[0]._id));
});

test('Changed source formats fail and untrusted URLs cannot reach the renderer',()=>{
  assert.throws(()=>normalize({},feed));assert.throws(()=>normalize(fixture(),'../warzone'));
  const p=fixture();p.sections[0].cards[0].image='https://assets.codmunity.gg.evil.test/a.webp';p.sections[0].cards[0].weaponSlug='../../other';
  const b=normalize(p,feed).builds[0];assert.equal(b.image,null);assert.equal(b.sourceUrl,'https://codmunity.gg/mpranked');
  assert.throws(()=>fromHtml('<script>throw new Error("never executed")</script>',feed));
  const html='<script id="serverApp-state" type="application/json">'+JSON.stringify({record:{u:'https://api.codmunity.gg/website/pages/meta-loadouts-ranking/mpranked',s:200,b:fixture()}})+'</script>';
  assert.deepEqual(fromHtml(html,feed),recorded);assert.throws(()=>fromHtml(html,'bo7-public'));
});

test('Offline fallback retains original source and fetch dates and the matching mode',async t=>{
  const d=await dirs(t),snapshot=normalize(fixture(),feed,oldDate);
  await fs.writeFile(path.join(d.bundleDir,feed+'.json'),JSON.stringify(snapshot));
  const provider=new CodProvider({...d,requestFn:async()=>{throw new Error('Network unavailable');}});
  const got=await new GameService({providers:{codmunity:provider}}).builds({game:'bo7',mode:'ranked',refresh:true});
  assert.equal(got.cacheState,'offline');assert.equal(got.fetchedAt,oldDate);assert.equal(got.sourceUpdatedAt,snapshot.sourceUpdatedAt);assert.equal(got.builds.length,3);assert.equal(got.game,'bo7');assert.equal(got.mode,'ranked');assert.match(got.error,/Network/);
});

test('Wrong-game refresh cannot overwrite the last valid cache',async t=>{
  const d=await dirs(t),snapshot=normalize(fixture(),feed,oldDate);await fs.mkdir(d.cacheDir);
  const file=path.join(d.cacheDir,feed+'.json');await fs.writeFile(file,JSON.stringify(snapshot));
  const bad=fixture();bad.sections[0].cards[0].Game='bo6';
  const provider=new CodProvider({...d,requestFn:async()=>bad});const got=await provider.getBuilds({feed,refresh:true});
  assert.equal(got.cacheState,'offline');assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),snapshot);
});

test('Successful refresh is reused within the session; a new launch checks again despite a corrupt disk cache',async t=>{
  const d=await dirs(t);let calls=0;
  const provider=new CodProvider({...d,requestFn:async url=>{calls++;assert.equal(url,'https://api.codmunity.gg/website/pages/meta-loadouts-ranking/mpranked');return fixture();}});
  assert.equal((await provider.getBuilds({feed})).cacheState,'live');assert.equal((await provider.getBuilds({feed})).cacheState,'cached');assert.equal(calls,1);
  await fs.writeFile(path.join(d.bundleDir,feed+'.json'),JSON.stringify(normalize(fixture(),feed)));
  await fs.writeFile(path.join(d.cacheDir,feed+'.json'),'{');assert.equal((await provider.getBuilds({feed})).cacheState,'cached');assert.equal(calls,1);
  const reopened=new CodProvider({...d,requestFn:async()=>{calls++;throw new Error('Offline after restart');}});
  const fallback=await reopened.getBuilds({feed});assert.equal(fallback.cacheState,'offline');assert.equal(fallback.builds.length,3);assert.match(fallback.error,/Offline after restart/);assert.equal(calls,2);
});

test('Coming-soon and invalid modes do not request or substitute another feed',async()=>{
  let calls=0;const service=new GameService({providers:{codmunity:{getBuilds:async()=>{calls++;return {};}}}});
  const mw4=await service.builds({game:'mw4',mode:'public'});assert.equal(mw4.comingSoon,true);assert.equal(mw4.releaseDate,'2026-10-23');assert.deepEqual(mw4.builds,[]);
  await assert.rejects(service.builds({game:'bo7',mode:'battle-royale'}));await assert.rejects(service.builds({game:'missing',mode:'public'}));assert.equal(calls,0);
});

test('A future registered game dispatches through its own provider without COD changes',async()=>{
  const entry={id:'future-game',kind:'loadouts',status:'active',parent:null,provider:'future',name:'Future Game',modes:[{id:'duos',name:'Duos',feed:'future-duos'}]};
  let received;const service=new GameService({games:[entry],providers:{future:{getBuilds:async options=>{received=options;return {builds:[{id:'verified-build'}]};}}}});
  const result=await service.builds({game:'future-game',mode:'duos',refresh:true});assert.deepEqual(received,{feed:'future-duos',refresh:true});assert.equal(result.game,'future-game');assert.equal(result.mode,'duos');assert.equal(result.builds[0].id,'verified-build');assert.equal(service.list()[0].provider,undefined);
  assert.throws(()=>new GameService({games:[{...entry,parent:'future-game'}]}),/Cyclic/);
});
