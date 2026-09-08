const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {normalizeLoadouts,normalizePatches,freshness}=require('../core/finals-provider.cjs');
const {normalizeVideos,CHANNELS}=require('../core/media-provider.cjs');
const {SourceCache}=require('../core/source-cache.cjs');
const {UpdateService}=require('../core/update-service.cjs');
const {Provider}=require('../core/provider.cjs');
const {normalizeRelease}=require('../core/release-provider.cjs');
const fixture=n=>fs.readFile(path.join(__dirname,'fixtures',n),'utf8');
test('Recorded Season 11 loadouts retain each class, source patch, exact active gear, and alternative weapons',async()=>{
  const d=normalizeLoadouts(await fixture('finals-loadouts.html'));
  assert.equal(d.builds.length,15);assert.equal(d.season,11);assert.equal(d.patch,'11.7.0');assert.equal(d.sourceUpdatedAt,'2026-09-01T00:00:00.000Z');
  const b=d.builds.find(x=>x.id==='cloak-recon');assert.equal(b.className,'Light');assert.deepEqual(b.weapons,['XP-54','LH1']);assert.deepEqual(b.gadgets,['Gateway','Glitch Grenade','H+ Infuser']);assert.equal(b.specialization,'Cloaking Device');
  for(const c of ['Light','Medium','Heavy'])assert.ok(d.builds.filter(b=>b.className===c).length>=2);
  assert.ok(d.builds.every(b=>b.gadgets.length===3&&!Object.hasOwn(b,'winRate')));
});
test('Missing classes, inconsistent seasons, incomplete gadgets, and partially parsed pages are rejected',async()=>{
  const html=await fixture('finals-loadouts.html');
  assert.throws(()=>normalizeLoadouts(html.replace('Season<strong>11','Season<strong>12')),/season and patch/);
  assert.throws(()=>normalizeLoadouts(html.replace('Gateway, Glitch Grenade, H+ Infuser','Gateway, Glitch Grenade')),/incomplete/);
  assert.throws(()=>normalizeLoadouts(html.replace('"numberOfItems":15','"numberOfItems":16')),/partially/);
  assert.throws(()=>normalizeLoadouts(html.replaceAll('Medium Loadouts','Alien Loadouts')),/Unrecognized/);
});
test('Official RSS ignores news, distinguishes store updates, and never imports another publisher',async()=>{
  const xml=await fixture('finals-patches.xml'),d=normalizePatches(xml);
  assert.equal(d.latest.patch,'11.8.0');assert.equal(d.latest.storeOnly,true);assert.equal(d.gameplay.patch,'11.7.0');assert.equal(d.patches.length,3);
  assert.throws(()=>normalizePatches(xml.replace('https://www.reachthefinals.com/patchnotes/11-80','https://example.com/patchnotes/11-80')),/Unexpected/);
  const revised=normalizePatches(xml.replace('<description>STORE</description></item><item><title>Update 11.7.0','<description>GAME UPDATE | BALANCE CHANGES</description></item><item><title>Update 11.7.0'));
  assert.equal(revised.gameplay.patch,'11.8.0');
});
test('Build freshness flags later balance patches, season changes, offline checks, and old snapshots',async()=>{
  const d={...normalizeLoadouts(await fixture('finals-loadouts.html')),fetchedAt:new Date().toISOString(),cacheState:'live'};
  const p={...normalizePatches(await fixture('finals-patches.xml')),fetchedAt:new Date().toISOString(),cacheState:'live'};
  assert.equal(freshness(d,p).level,'ok');
  assert.equal(freshness(d,{...p,gameplay:{patch:'11.9.0'}}).level,'warning');
  assert.match(freshness(d,{...p,season:12}).message,/Season 12/);
  assert.equal(freshness(d,{...p,cacheState:'offline'}).level,'warning');
  assert.equal(freshness({...d,fetchedAt:'2026-07-01T00:00:00Z'},p).level,'warning');
});
test('Team presets resolve exactly three matching classes and fail closed when a build disappears',async()=>{
  const {resolveTeam,teamReview}=await import('../app/team-model.js');const d=normalizeLoadouts(await fixture('finals-loadouts.html'));const presets=require('../app/data/finals/teams.json');
  for(const t of presets.teams){const team=resolveTeam(t,d.builds);assert.equal(team.valid,true,t.id);assert.equal(team.players.length,3);assert.ok(team.players.every(p=>p.className===p.build.className&&p.build.weapons.includes(p.weapon)));}
  const hhm=presets.teams.find(t=>t.id==='hhm');assert.deepEqual(resolveTeam(hhm,d.builds).players.map(p=>p.className),['Heavy','Heavy','Medium']);
  assert.equal(resolveTeam(hhm,d.builds.filter(b=>b.id!=='mesh-fortress')).valid,false);
  const changed=d.builds.map(b=>b.id==='winch-aggro'?{...b,weapons:['ShAK-50']}:b);
  assert.equal(resolveTeam(hhm,changed).valid,false,'The fixed SA1216 pick must not silently become another weapon');
  assert.deepEqual(resolveTeam(hhm,d.builds).players.map(p=>p.weapon),['Lewis Gun','SA1216','FCAR']);
  assert.equal(teamReview({teamPresets:presets,official:{season:12,gameplay:{patch:'12.0.0'}}}).warning,true);
  assert.equal(teamReview({teamPresets:presets,official:{season:11,gameplay:{patch:'11.10.0'},fetchedAt:new Date().toISOString()}}).warning,true);
});
test('Official YouTube feed verifies the header and every video channel, preserving publication dates',async()=>{
  const xml=await fixture('media-lol.xml'),d=normalizeVideos(xml,CHANNELS[0]);assert.equal(d.videos.length,2);assert.equal(d.videos[0].id,'d2TFD2Wo-tE');assert.equal(d.videos[0].short,true);assert.equal(d.videos[0].publishedAt,'2026-09-06T03:00:03.000Z');
  assert.throws(()=>normalizeVideos(xml,CHANNELS[1]),/different channel/);
  assert.throws(()=>normalizeVideos(xml.replace('<yt:channelId>UCvqRdlKsE5Q8mf8YXbdIJLw</yt:channelId>','<yt:channelId>bad-channel</yt:channelId>'),CHANNELS[0]),/Invalid official/);
});
test('A failed source refresh preserves timestamps and never overwrites the last valid snapshot',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'truck-source-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const bundle=path.join(dir,'bundle'),cache=path.join(dir,'cache');await fs.mkdir(bundle);
  const saved={schema:1,feed:'test',sourceUpdatedAt:'2026-09-01T00:00:00Z',fetchedAt:'2026-09-02T00:00:00Z',builds:[1]};await fs.writeFile(path.join(bundle,'test.json'),JSON.stringify(saved));
  const provider=new SourceCache({id:'test',url:'https://example.com/',cacheDir:cache,bundleDir:bundle,normalize:()=>{throw new Error('Invalid source');},validate:d=>d.builds?.length>0,requestFn:async()=>'<changed-format>'});
  const d=await provider.get(true);assert.equal(d.cacheState,'offline');assert.equal(d.fetchedAt,saved.fetchedAt);assert.equal(d.sourceUpdatedAt,saved.sourceUpdatedAt);assert.match(d.error,/Invalid source/);await assert.rejects(fs.readFile(path.join(cache,'test.json')));
});
test('Startup refreshes coalesce, finish independently, and distinguish old data from failed checks',async()=>{
  let release,calls=0;const ready=new Promise(r=>{release=r;});const old='2026-06-15T00:00:00Z';
  const service=new UpdateService([{id:'a',name:'Valid',scope:'Builds',run:async()=>{calls++;await ready;return {fetchedAt:'2026-09-06T00:00:00Z',sourceUpdatedAt:old};}},{id:'b',name:'Offline',scope:'Builds',run:async()=>({error:'Offline',fetchedAt:old,sourceUpdatedAt:old})},{id:'c',name:'No snapshot',scope:'Videos',run:async()=>{throw new Error('No feed');}}]);
  service.check();service.check();const pending=service.running;release();await pending;
  assert.equal(calls,1);const d=service.status();assert.equal(d.running,false);assert.deepEqual(d.rows.map(r=>r.state),['checked','offline','offline']);assert.equal(d.rows[0].sourceUpdatedAt,old);assert.equal(d.rows[1].checkedAt,old);assert.equal(d.rows[2].checkedAt,null);
});
test('League checks each new selection once per session despite a recent disk cache, with explicit refresh support',async()=>{
  const provider=new Provider({cacheDir:'unused',bundleDir:'unused'}),calls=[];
  provider.getCatalog=async()=>({champions:[{id:'Ahri',key:103},{id:'Garen',key:86}]});provider.loadBuild=async(o,k,refresh)=>{calls.push({k,refresh});return {champion:o.champion};};
  const options={champion:'Ahri',mode:'ranked'};
  await provider.build(options);await provider.build(options);await provider.build({...options,champion:'Garen'});await provider.build({...options,refresh:'false'});await provider.build({...options,refresh:true});
  assert.deepEqual(calls.map(c=>c.refresh),[true,false,true,false,true]);
});
test('MW4 release checks read the official announcement heading, including changed future dates',()=>{
  assert.equal(normalizeRelease('<h1>Call of Duty: Modern Warfare 4 Releases on October 23, 2026</h1>').releaseDate,'2026-10-23');
  assert.equal(normalizeRelease('<h1>Call of Duty: Modern Warfare 4 Releases on November 6, 2026</h1>').releaseDate,'2026-11-06');
  assert.throws(()=>normalizeRelease('<h1>Modern Warfare 4 release is postponed</h1>'),/recognized release date/);
  assert.throws(()=>normalizeRelease('<h1>Some Other Game Releases on October 23, 2026</h1>'),/recognized release date/);
});
