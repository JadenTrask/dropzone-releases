const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');

test('rail uses official art without changing game routes or library images',()=>{
 const root=path.resolve(__dirname,'..'),games=JSON.parse(fs.readFileSync(path.join(root,'core/games.json'),'utf8'));
 const list=Array.isArray(games)?games:games.games;
 const original=JSON.stringify(list),source=fs.readFileSync(path.join(root,'app/hub.js'),'utf8');
 const start=source.indexOf('const railArtwork='),end=source.indexOf('function renderCollection',start);
 assert.ok(start>=0&&end>start);
 const dom=new JSDOM('<nav id="rail-games"></nav>');
 const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 vm.runInNewContext(source.slice(start,end)+';renderRail();',{state:{games:list},$:s=>dom.window.document.querySelector(s),e:escape,releaseStatus:()=> 'Coming soon'});
 const rows=[...dom.window.document.querySelectorAll('.rail-game')];
 assert.equal(rows.length,list.filter(game=>!game.parent).length);
 for(const row of rows){
  const game=list.find(game=>game.id===row.dataset.route);assert.ok(game&&!game.parent);assert.ok(row.getAttribute('aria-label').startsWith(game.name));
  const img=row.querySelector('img'),asset=path.join(root,'app',img.getAttribute('src'));assert.ok(fs.existsSync(asset),asset);assert.equal(img.width,40);assert.equal(img.height,40);
  if(game.status==='under-construction')assert.equal(row.querySelector('.rail-game-state')?.textContent,'Under construction');
  else if(game.status!=='active')assert.ok(row.querySelector('.rail-soon'));
 }
 for(const id of ['sotf','wardogs','lol'])assert.match(dom.window.document.querySelector(`[data-route="${id}"] img`).getAttribute('src'),new RegExp(`${id}-official\\.jpg$`));
 assert.match(dom.window.document.querySelector('[data-route="siege"] img').getAttribute('src'),/siege-icon-official\.jpg$/);
 assert.equal(JSON.stringify(list),original,'The library/map cover data is unchanged');
 dom.window.close();
});
