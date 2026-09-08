const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {normalizeLeague,normalizeCod,normalizeWardogsNews,PatchProvider}=require('../core/patch-provider.cjs');
const card=(game,title,url)=>`<div class="card-inner"><li class="game-tile ${game}"></li><div data-date="September 02, 2026" class="news-published"></div><div class="title"><a href="${url}">${title}</a></div><div class="post-grid-accordion"></div>`;
test('COD official patch routing uses game tags, not the ambiguous BO7 in Warzone URLs',()=>{
  const html=card('warzone','Warzone Patch Notes','/patchnotes/2026/08/call-of-duty-bo7-warzone-patch-notes')+card('bo7','Black Ops Patch Notes','/patchnotes/2026/07/call-of-duty-black-ops-7-patch-notes')+card('mw4','Modern Warfare 4 Beta Patch Notes','/patchnotes/2026/08/mw4-beta-patch-notes');
  assert.equal(normalizeCod(html,'bo7').articles[0].title,'Black Ops Patch Notes');assert.equal(normalizeCod(html,'warzone').articles[0].title,'Warzone Patch Notes');assert.equal(normalizeCod(html,'mw4').articles[0].kind,'Beta patch notes');
  assert.throws(()=>normalizeCod(card('warzone','Warzone Patch Notes','/patchnotes/wz'),'bo7'));
  assert.throws(()=>normalizeCod(card('bo7','BO7 Patch Notes','https://example.org/patchnotes/bad'),'bo7'));
});
test('League official feed excludes TFT and validates article URLs and dates',()=>{
  const entry={title:'League of Legends Patch 26.17 Notes',publishedAt:'2026-08-25T18:00:00.000Z',description:{body:'<b>Champion updates.</b>'},action:{payload:{url:'/en-us/news/game-updates/league-of-legends-patch-26-17-notes'}}};
  const html=entries=>'<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({entries})+'</script>';
  const d=normalizeLeague(html([entry,{...entry,title:'Teamfight Tactics patch notes',action:{payload:{url:'https://teamfighttactics.leagueoflegends.com/patch-notes'}}}]));assert.equal(d.articles.length,1);assert.equal(d.articles[0].excerpt,'Champion updates.');
  assert.throws(()=>normalizeLeague(html([{...entry,action:{payload:{url:'javascript:alert(1)'}}}])));
  assert.throws(()=>normalizeLeague(html([{...entry,publishedAt:'unknown'}])));
});
test('WARDOGS uses only developer Steam announcements and retains a patch behind newer news',()=>{
  const items=Array.from({length:10},(_,i)=>({appid:1867240,feedname:'steam_community_announcements',title:i===9?'Patch 0.1 Notes':'Developer announcement '+i,contents:'[p]News[/p]',date:1788642531-i*86400,url:'https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/'+i}));
  const d=normalizeWardogsNews(JSON.stringify({appnews:{appid:1867240,newsitems:[...items,{...items[0],feedname:'third_party_news',title:'Unverified patch'}]}}));assert.equal(d.articles.length,8);assert.equal(d.articles[0].kind,'Announcement');assert.ok(d.articles.some(a=>a.title==='Patch 0.1 Notes'));assert.ok(!d.articles.some(a=>a.title==='Unverified patch'));assert.equal(d.sourceUpdatedAt,'2026-09-05T21:08:51.000Z');
});
test('Patch refresh failures preserve timestamps and the chosen game rather than substitute another feed',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dropzone-patches-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const provider=new PatchProvider({cacheDir:dir,bundleDir:path.join(__dirname,'../app/data/patches'),requestFn:async()=>{throw new Error('Offline');}});
  for(const game of ['lol','bo7','warzone','mw4','finals','wardogs']){const before=await provider.list({game});const after=await provider.list({game,refresh:true});assert.equal(after.game,game);assert.equal(after.cacheState,'offline');assert.equal(after.fetchedAt,before.fetchedAt);assert.equal(after.sourceUpdatedAt,before.sourceUpdatedAt);assert.deepEqual(after.articles,before.articles);}
  await assert.rejects(provider.list({game:'all'}),/Choose a game/);
});
