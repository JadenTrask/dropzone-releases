const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');

test('THE FINALS media redesign preserves sources, filtering, playback and other-game views',async t=>{
 const dom=new JSDOM('<main id="hub-app"></main><div id="toast"></div>',{url:'http://localhost'}),api={};
 Object.assign(global,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,Event:dom.window.Event});window.rift=api;dom.window.HTMLElement.prototype.scrollIntoView=function(){};t.after(()=>dom.window.close());
 const news=await import('../app/patches-ui.js'),watch=await import('../app/watch-ui.js');
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 const articles=[{title:'Update 11.7.0',kind:'Patch notes',publishedAt:'2026-08-27T10:00:00Z',url:'https://www.reachthefinals.com/patchnotes/11-70',excerpt:''},{title:'Store Update 11.8.0',kind:'Store update',publishedAt:'2026-09-03T10:00:00Z',url:'https://www.reachthefinals.com/patchnotes/11-80',excerpt:''}];
 const feed={game:'finals',source:'Embark Studios',sourceUrl:'https://www.reachthefinals.com/patchnotes',fetchedAt:'2026-09-04T10:00:00Z',articles};
 const clips=[{id:'abcdefghij1',title:'EMEA cycle finale',url:'https://www.youtube.com/watch?v=abcdefghij1',thumbnail:'https://i.ytimg.com/vi/abcdefghij1/hqdefault.jpg',duration:'1:20:00',archive:true},{id:'abcdefghij2',title:'AMER cycle finale',url:'https://www.youtube.com/watch?v=abcdefghij2',archive:true},{id:'abcdefghij3',title:'APAC cycle finale',url:'https://www.youtube.com/watch?v=abcdefghij3',thumbnail:'https://i.ytimg.com/vi/abcdefghij3/hqdefault.jpg',archive:true}];
 const channel={games:['finals'],name:'THE FINALS',url:'https://www.youtube.com/@reachthefinals',officialUrl:'https://www.reachthefinals.com/tgm',fetchedAt:'2026-09-05T10:00:00Z',videos:[{...clips[0],title:'Latest upload',archive:false,publishedAt:'2026-09-04T10:00:00Z'},{...clips[1],short:true}],broadcasts:{videos:clips},catalog:{playlists:[{id:'event-archive',title:'Grand Major',url:'https://www.youtube.com/playlist?list=event-archive',countText:'3 videos'}]}};

 await t.test('official news uses supplied fields and preserves saved posts when a refresh fails',async()=>{
  let fail=false;api.patches=async()=>{if(fail)throw Error('Network test failure');return feed;};await news.mountPatches({id:'finals',name:'THE FINALS'});
  assert.ok(document.querySelector('.patches-page'));assert.equal(document.querySelector('.fn-news-page'),null);assert.equal(document.querySelector('.patch-feature h2').textContent,'Store Update 11.8.0');assert.equal(document.querySelectorAll('.patch-row').length,1);assert.equal(document.querySelectorAll('.patches-page img').length,0,'No article image was supplied by the provider');assert.equal(document.querySelector('.patch-excerpt'),null);assert.ok(document.querySelector('[data-hub-source="https://www.reachthefinals.com/patchnotes/11-80"]'));
  fail=true;document.querySelector('#refresh-patches').click();await tick();assert.match(document.querySelector('.patch-error').textContent,/saved updates are still available/);assert.equal(document.querySelectorAll('.patch-row').length,1);assert.match(document.querySelector('.source-status-detail').textContent,/Network test failure/);assert.ok(document.querySelector('#refresh-patches'));
  news.leavePatches();api.patches=async()=>({...feed,game:'lol'});await news.mountPatches({id:'lol',name:'League of Legends'});assert.equal(document.querySelector('.fn-media-page'),null);assert.ok(document.querySelector('.patch-feature'));news.leavePatches();
 });

 await t.test('fatal and empty news have a retry and never claim cached content exists',async()=>{
  api.patches=async()=>{throw Error('Unavailable');};await news.mountPatches({id:'finals',name:'THE FINALS'});assert.match(document.querySelector('.cod-empty').textContent,/no saved posts/);assert.doesNotMatch(document.querySelector('.patch-error').textContent,/saved updates are still available/);
  api.patches=async()=>({...feed,articles:[]});document.querySelector('#refresh-patches').click();await tick();assert.match(document.querySelector('.cod-empty').textContent,/No updates available/);assert.equal(document.querySelector('.patch-error'),null);news.leavePatches();
 });

 await t.test('video filtering, real durations, missing artwork and archive playback remain functional',async()=>{
  const calls=[];api.media=async q=>{calls.push(q);return q.playlist?{game:'finals',playlist:{id:q.playlist,videos:[clips[2]],partial:true}}:{game:'finals',channels:[channel]};};await watch.mountWatch('finals');
  assert.equal(document.querySelectorAll('.video-card').length,3);assert.equal(document.querySelectorAll('.video-duration').length,1);assert.equal(document.querySelectorAll('.video-card img').length,2);assert.equal(document.querySelector('.video-card time'),null,'A date is not fabricated for undated broadcasts');assert.equal(document.querySelector('iframe'),null);
  const image=document.querySelector('[data-watch-image]');image.dispatchEvent(new window.Event('error'));assert.equal(image.hidden,true);assert.ok(image.parentElement.querySelector('.video-fallback'));
  const search=document.querySelector('#watch-search');search.value='AMER';search.dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(document.querySelectorAll('.video-card').length,1);assert.equal(document.querySelector('[data-watch-result-count]').textContent,'1 video');assert.equal(calls.length,1,'Search filters locally');
  search.value='not present';search.dispatchEvent(new window.Event('input',{bubbles:true}));assert.match(document.querySelector('.watch-empty h2').textContent,/No matches/);
  document.querySelector('[data-watch-tab=latest]').click();assert.equal(document.querySelectorAll('.video-card').length,1,'Shorts stay excluded');assert.match(document.querySelector('.video-card').textContent,/Latest upload/);document.querySelector('[data-video]').click();assert.ok(document.querySelector('[data-start-video]'));assert.equal(document.querySelector('iframe'),null,'Selection does not automatically load YouTube');document.querySelector('[data-start-video]').click();assert.match(document.querySelector('iframe').src,/youtube-nocookie.com/);document.querySelector('[data-close-video]').click();assert.equal(document.querySelector('iframe'),null);
  document.querySelector('[data-watch-tab=matches]').click();const archive=document.querySelector('#watch-archive');archive.value='event-archive';archive.dispatchEvent(new window.Event('change',{bubbles:true}));await tick();assert.equal(document.querySelectorAll('.video-card').length,1);assert.match(document.querySelector('.watch-browser').textContent,/part of the archive/);assert.ok(calls.some(q=>q.playlist==='event-archive'));document.querySelector('[data-play-playlist]').click();assert.match(document.querySelector('.watch-player-heading').textContent,/Grand Major/);
  document.querySelector('[data-watch-tab=latest]').click();assert.equal(document.querySelector('.watch-results-heading h2').textContent,'Latest uploads');assert.equal(document.querySelector('[data-play-playlist]'),null);assert.equal(document.querySelector('#watch-player-section'),null,'Changing section closes the previous archive player');assert.doesNotMatch(document.querySelector('.watch-browser').textContent,/Grand Major|part of the archive/);assert.match(document.querySelector('.video-card').textContent,/Latest upload/);
  document.querySelector('[data-watch-tab=matches]').click();assert.equal(document.querySelector('#watch-archive').value,'event-archive','Archive choice survives switching sections');assert.equal(document.querySelector('.watch-results-heading h2').textContent,'Grand Major');watch.leaveWatch();assert.equal(document.querySelector('#watch-player-section'),null);
 });

 await t.test('video cache failures remain understandable and other games use the shared view',async()=>{
  api.media=async()=>({game:'finals',channels:[{...channel,cacheState:'offline',error:'Offline test error'}]});await watch.mountWatch('finals');assert.match(document.querySelector('.watch-alert').textContent,/saved videos/);assert.equal(document.querySelectorAll('.video-card').length,3);watch.leaveWatch();
  api.media=async()=>{throw Error('No source');};await watch.mountWatch('finals');assert.ok(document.querySelector('.watch-empty'));assert.ok(document.querySelector('[data-refresh-videos]'));assert.equal(document.querySelectorAll('.video-card').length,0);watch.leaveWatch();
  api.media=async()=>({game:'lol',channels:[{...channel,games:['lol'],name:'LoL Esports'}]});await watch.mountWatch('lol');assert.equal(document.querySelector('.fn-media-page'),null);assert.equal(document.querySelectorAll('.video-card').length,3);assert.match(document.querySelector('h1').textContent,/LoL Esports/);watch.leaveWatch();
 });

 await t.test('an embedded video host retains its surrounding tracker shell and ignores detached-host responses',async()=>{
  document.querySelector('#hub-app').innerHTML='<header id="tracker-shell">Rocket League</header><section id="embedded"></section>';
  const shell=document.querySelector('#tracker-shell'),host=document.querySelector('#embedded');
  api.media=async()=>({game:'rocket-league',channels:[{...channel,games:['rocket-league'],name:'Rocket League Esports'}]});
  await watch.mountWatch('rocket-league',host);assert.equal(document.querySelector('#tracker-shell'),shell);assert.equal(host.querySelectorAll('.video-card').length,3);assert.match(host.querySelector('h1').textContent,/RLCS videos/);
  watch.leaveWatch();let finish;api.media=()=>new Promise(resolve=>finish=resolve);const pending=watch.mountWatch('rocket-league',host);host.remove();finish({game:'rocket-league',channels:[]});await pending;assert.equal(document.querySelector('#tracker-shell'),shell);assert.equal(document.querySelector('.watch-page'),null);watch.leaveWatch();
 });
});
