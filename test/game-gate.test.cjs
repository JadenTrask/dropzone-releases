const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createServices}=require('../core/services.cjs');
test('GZW construction gate preserves source data but disables tools and background refresh',async()=>{
 const services=createServices({cacheDir:path.join(__dirname,'unused-gate-cache'),bundleDir:path.join(__dirname,'../app/data')});
 const games=services.games.list(),gzw=games.find(g=>g.id==='gray-zone');
 assert.equal(gzw.status,'under-construction');assert.equal(gzw.kind,'tacmap');assert.equal(gzw.patches,false);
 for(const service of [services.gzw,services.gzwMap]){const result=await service.get({refresh:true});assert.equal(result.underConstruction,true);assert.equal(result.unavailable,true);}
 assert.equal(services.patches.feeds.has('gray-zone'),false);
 assert.ok(!services.updates.status().rows.some(row=>row.id.startsWith('gzw-')||row.id==='patches-gray-zone'));
 for(const id of ['finals','siege','sotf','wardogs','apex','rocket-league','lol','bo7','warzone'])assert.equal(games.find(g=>g.id===id).status,'active',id);
 assert.ok(require('../app/data/gzw/gzw-markers.json').counts.markers>0,'Preserve the bundled map data');
});
