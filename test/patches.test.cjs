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

test('Steam previews remove media payloads and truncate with readable punctuation',()=>{
  const contents='[img]{STEAM_CLAN_IMAGE}/8328525/banner.jpg[/img] [previewyoutube=abc123;full][/previewyoutube] '+Array.from({length:24},(_,i)=>'word'+i).join(' ');
  const item={appid:359550,feedname:'steam_community_announcements',title:'Update notes',contents,date:1788642531,url:'https://store.steampowered.com/news/app/359550/view/123'};
  const d=normalizeWardogsNews(JSON.stringify({appnews:{appid:359550,newsitems:[item]}}),'siege',359550);
  assert.equal(d.articles[0].excerpt,Array.from({length:20},(_,i)=>'word'+i).join(' ')+'\u2026');
});

test('Previously saved news previews are repaired without changing source metadata',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dropzone-news-preview-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const original={schema:1,feed:'patches-siege',game:'siege',source:'Ubisoft',fetchedAt:'2026-09-01T00:00:00.000Z',sourceUpdatedAt:'2026-09-01T00:00:00.000Z',articles:[{title:'Update notes',url:'https://store.steampowered.com/news/app/359550/view/123',publishedAt:'2026-09-01T00:00:00.000Z',excerpt:'{STEAM_CLAN_IMAGE}/8328525/banner.jpg New changes \u00e2\u20ac\u00a6'}]};
  await fs.writeFile(path.join(dir,'patches-siege.json'),JSON.stringify(original));
  const provider=new PatchProvider({cacheDir:dir,bundleDir:dir,requestFn:async()=>{throw new Error('Offline');}});
  const result=await provider.list({game:'siege'});
  assert.equal(result.articles[0].excerpt,'New changes \u2026');
  assert.equal(result.fetchedAt,original.fetchedAt);assert.equal(result.sourceUpdatedAt,original.sourceUpdatedAt);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir,'patches-siege.json'),'utf8')),original);
});
test('Patch refresh failures preserve timestamps and the chosen game rather than substitute another feed',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dropzone-patches-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const provider=new PatchProvider({cacheDir:dir,bundleDir:path.join(__dirname,'../app/data/patches'),requestFn:async()=>{throw new Error('Offline');}});
  for(const game of ['lol','bo7','warzone','mw4','finals','wardogs','rocket-league']){const before=await provider.list({game});const after=await provider.list({game,refresh:true});assert.equal(after.game,game);assert.equal(after.cacheState,'offline');assert.equal(after.fetchedAt,before.fetchedAt);assert.equal(after.sourceUpdatedAt,before.sourceUpdatedAt);assert.deepEqual(after.articles,before.articles);}
  await assert.rejects(provider.list({game:'all'}),/Choose a game/);
});

test('Rocket League accepts only its own official developer feed',()=>{
 const item={appid:252950,feedname:'steam_community_announcements',title:'Rocket League S24 Patch Notes v2.76',contents:'[p]Latest official patch.[/p]',date:1790118903,url:'https://store.steampowered.com/news/app/252950/view/123'};
 const data=normalizeWardogsNews(JSON.stringify({appnews:{appid:252950,newsitems:[item,{...item,feedname:'third_party_news',title:'Ignore this post'}]}}),'rocket-league',252950);
 assert.equal(data.game,'rocket-league');assert.equal(data.articles.length,1);assert.equal(data.articles[0].kind,'Patch notes');
 assert.throws(()=>normalizeWardogsNews(JSON.stringify({appnews:{appid:359550,newsitems:[item]}}),'rocket-league',252950));
});
