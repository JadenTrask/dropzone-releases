const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {normalize,CodProvider}=require('../core/cod-provider.cjs');const {GameService}=require('../core/game-service.cjs');
const {CHANNELS,MediaProvider}=require('../core/media-provider.cjs');
const {normalizePlaylists,normalizeStreams,normalizePlaylistVideos}=require('../core/video-archives.cjs');
const read=f=>fs.readFile(path.join(__dirname,'fixtures',f),'utf8');
const ranked=require('./fixtures/cod-ranked.json'),wz=require('./fixtures/warzone-ranked.json');
test('BO7 ranked retains only M15/MPC variants while rejecting a completely ineligible feed',()=>{
 const data=normalize(ranked,'bo7-ranked');assert.deepEqual(data.builds.map(b=>b.weapon),['M15 Mod 0','MPC-25','M15 Mod 0']);
 const p=structuredClone(ranked);for(const s of p.sections)s.cards=s.cards.filter(c=>!['M15 Mod 0','MPC-25'].includes(c.WeaponName));assert.throws(()=>normalize(p,'bo7-ranked'),/No complete/);
});
test('Old disk caches and old saved BO7 snapshots cannot restore disallowed ranked weapons',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dropzone-ranked-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const data=normalize(ranked,'bo7-ranked');data.builds.push({...data.builds[0],id:'old-dravec',weapon:'Dravec 45'});
 await fs.writeFile(path.join(root,'bo7-ranked.json'),JSON.stringify(data));
 const provider=new CodProvider({cacheDir:root,bundleDir:root,requestFn:async()=>{throw new Error('offline');}});
 for(const refresh of [false,true]){const d=await provider.getBuilds({feed:'bo7-ranked',refresh});assert.equal(d.builds.length,3);assert.ok(d.builds.every(b=>['M15 Mod 0','MPC-25'].includes(b.weapon)));}
 const {eligibleSavedBuild}=await import('../app/ranked-policy.js');assert.equal(eligibleSavedBuild({game:'bo7',mode:'ranked',build:{weapon:'Dravec 45'}}),false);assert.equal(eligibleSavedBuild({game:'bo7',mode:'public',build:{weapon:'Dravec 45'}}),true);assert.equal(eligibleSavedBuild({game:'warzone',mode:'ranked',build:{weapon:'Dravec 45'}}),true);
});
test('Warzone ranked uses its actual ranked collection and never substitutes the battle royale feed',async()=>{
 const d=normalize(wz,'warzone-ranked');assert.equal(d.builds.length,13);assert.equal(d.builds[0].weapon,'AN-94');assert.ok(d.builds.every(b=>b.attachments.length===5));
 assert.throws(()=>normalize(wz,'warzone'),/different game mode/);
 const changed=structuredClone(wz);changed.sections[0].cards[0].collec='wz';assert.throws(()=>normalize(changed,'warzone-ranked'),/different game mode/);
 let call;const game=new GameService({providers:{codmunity:{getBuilds:async args=>{call=args;return d;}}}});const got=await game.builds({game:'warzone',mode:'ranked',refresh:true});assert.equal(call.feed,'warzone-ranked');assert.equal(got.mode,'ranked');assert.equal(got.game,'warzone');
});
test('Official archives include older season playlists and matches with checked ownership',async()=>{
 const catalog=normalizePlaylists(await read('archive-catalog.html'),CHANNELS[1]);assert.deepEqual(catalog.playlists.map(p=>p.title),['2026 Match VODs','2025 Match VODs']);
 const html=await read('archive-matches.html'),d=normalizePlaylistVideos(html,CHANNELS[1],catalog.playlists[0]);assert.equal(d.videos.length,3);assert.equal(d.partial,true);assert.match(d.videos[0].title,/Championship/);assert.match(d.videos[2].title,/Major II/);assert.equal(d.sourceUpdatedAt,null);assert.equal(d.videos[0].publishedAt,null);
 assert.throws(()=>normalizePlaylists(awaitHtmlWrongChannel(),CHANNELS[1]));
 function awaitHtmlWrongChannel(){return '<script>var ytInitialData = {"metadata":{"channelMetadataRenderer":{"externalId":"other"}}};</script>';}
 assert.throws(()=>normalizePlaylistVideos(html,CHANNELS[0],catalog.playlists[0]),/ownership/);
 const changed=html.replaceAll(CHANNELS[1].channelId,'other');assert.throws(()=>normalizePlaylistVideos(changed,CHANNELS[1],catalog.playlists[0]),/ownership/);
 const streams=normalizeStreams(await read('archive-streams.html'),CHANNELS[3]);assert.equal(streams.videos.length,1);assert.ok(streams.videos.every(v=>/TGM26/.test(v.title)));
});
test('Videos require a game and reject a playlist that does not belong to its channel',async()=>{
 const provider=new MediaProvider({cacheDir:'unused',bundleDir:path.join(__dirname,'../app/data/media'),requestFn:async()=>{throw new Error('No network in test');}});
 await assert.rejects(provider.list({game:'all'}),/Choose a game/);await assert.rejects(provider.list({}),/Choose a game/);
 await assert.rejects(provider.list({game:'bo7',playlist:'PL5RMsoXv4Z8bKMU75Gyh9Cz2qNShZgv7u'}),/not in the game/);
 const d=await provider.list({game:'bo7'});assert.equal(d.game,'bo7');assert.deepEqual(d.channels.map(c=>c.id),['cod-league']);
 const w=await provider.list({game:'warzone'});assert.deepEqual(w.channels.map(c=>c.id),['warzone-esports']);
});
