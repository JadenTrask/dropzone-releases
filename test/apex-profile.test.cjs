const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
test('Official legend artwork covers the full roster with verified bytes and publisher classes',()=>{
 const art=require('../app/data/apex/legend-art.json'),catalog=require('../app/data/apex/apex-content.json').catalog;
 assert.equal(art.legends.length,28);assert.equal(new Set(art.legends.map(r=>r.name)).size,28);
 for(const legend of catalog.legends){const row=art.legends.find(r=>r.name===legend.name);assert.ok(row,legend.name);assert.equal(new URL(row.imageUrl).hostname,'drop-assets.ea.com');const bytes=fs.readFileSync('app/'+row.localPath);assert.equal(bytes.length,row.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256);}
 assert.equal(art.legends.find(l=>l.name==='Ash').role,'Skirmisher');
});
test('Player display contract rejects unknown shapes and omits missing/nonfinite metrics',async()=>{
 global.window={};const {playerProfile,renderPlayerProfile}=await import('../app/apex-profile.js');
 for(const value of [null,{}, {schema:1,identity:{name:'No UID',platform:'PC'}}, {schema:2}])assert.equal(playerProfile(value),null);
 const profile=playerProfile({schema:1,identity:{name:'<script>test</script>',uid:'123',platform:'PC'},level:null,secret:'private',ranks:[{mode:'Battle Royale',name:'Test rank',score:NaN}],legends:[{name:'Alter',trackers:[{label:'Test tracker',value:0},{label:'Unknown',value:null},{label:'Infinite',value:Infinity}]}]});
 assert.equal(profile.level,null);assert.equal(profile.ranks[0].score,null);assert.deepEqual(profile.legends[0].trackers,[{label:'Test tracker',value:0}]);assert.equal(profile.secret,undefined);
 const html=renderPlayerProfile(profile,{legends:[]});assert.doesNotMatch(html,/<script>|NaN|Infinity|private|0 RP|Level 0/);assert.match(html,/&lt;script&gt;/);assert.match(html,/Test tracker/);
});
