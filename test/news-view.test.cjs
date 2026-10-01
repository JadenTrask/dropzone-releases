'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('Apex and existing news use one feature/list/source renderer with escaped content',async()=>{
 global.window={};const {renderNewsPage}=await import('../app/news-view.js');const data={source:'Publisher',sourceUrl:'https://www.ea.com/',fetchedAt:'2026-10-01',articles:[{title:'<Unsafe title>',kind:'Announcement',publishedAt:'2026-09-30',url:'https://www.ea.com/one',dateLabel:'Published'},{title:'Older notes',kind:'Patch notes',publishedAt:'2026-09-14',url:'https://www.ea.com/two',dateLabel:'Published'}]};
 for(const game of ['apex','bo7']){const html=renderNewsPage({gameName:game,selectedGame:game,data,refreshId:game+'-refresh'});assert.match(html,/patches-page/);assert.match(html,/patch-feature/);assert.match(html,/patch-row/);assert.match(html,/source-status/);assert.match(html,/&lt;Unsafe title&gt;/);assert.doesNotMatch(html,/<Unsafe title>/);assert.ok(html.includes('id="'+game+'-refresh"'));}
 const fail=renderNewsPage({gameName:'Apex',selectedGame:'apex',data,error:'Offline'});assert.match(fail,/role="alert">Offline/);assert.match(fail,/Older notes/);
});
