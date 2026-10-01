const {test}=require('node:test'),assert=require('node:assert/strict');
test('clusters use fixed world anchors independent of viewport clipping and pan',async()=>{
 const {groupMarkers}=await import('../app/gzw-marker-layout.js');
 const points=[{id:'a',x:102.1,y:104.2},{id:'b',x:102.9,y:104.8},{id:'c',x:110,y:110}];
 const groups=groupMarkers(points,2);assert.equal(groups.length,2);assert.equal(groups[0].x,102.5);assert.equal(groups[0].y,104.5);
 assert.deepEqual(groupMarkers([...points].reverse(),2).find(g=>g.key===groups[0].key).x,groups[0].x);
 const selected=groupMarkers(points,2,'b');assert.equal(selected.length,3);assert.equal(selected.find(g=>g.points[0].id==='b').x,102.9);
});
test('zoom level has hysteresis and category markers are not color-only',async()=>{
 const {markerCellSize,markerSymbol}=await import('../app/gzw-marker-layout.js');
 const cell=markerCellSize(10);for(const scale of [9,10,11,12,11,10])assert.equal(markerCellSize(scale,cell),cell);
 assert.equal(markerCellSize(90,cell),0);assert.equal(markerCellSize(70,0),0);
 const categories=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'../app/data/gzw/gzw-markers.json'),'utf8')).categories;
 for(const c of categories)assert.ok(markerSymbol(c.id).length>0,c.name);assert.notEqual(markerSymbol(40),markerSymbol(18));assert.notEqual(markerSymbol(2),markerSymbol(38));assert.equal(markerSymbol(27),'+');
});
