const {test}=require('node:test'),assert=require('node:assert/strict');
const model=import('../app/command-model.js');
test('Content packs reject malformed data, preserve references and merge as independent copies',async()=>{
 const m=await model,a=m.cleanRecord({id:'a',kind:'goal',game:'valorant',title:'Unlock goal',data:{current:1,total:5}}),b=m.cleanRecord({id:'b',kind:'note',game:'valorant',title:'Plan',links:['a'],data:{}});
 const decoded=m.unpack(m.readCode(m.shareCode(m.pack([a,b]))));const merged=m.mergeRecords([a,b],decoded);assert.equal(merged.length,4);assert.notEqual(merged[2].id,'a');assert.equal(merged[3].links[0],merged[2].id);
 assert.throws(()=>m.cleanRecord({...a,data:{total:0}}));assert.throws(()=>m.cleanRecord({...b,kind:'script'}));assert.throws(()=>m.cleanRecord({...b,data:{shapes:[{type:'point',x:NaN}]}}));assert.throws(()=>m.cleanRecord({...b,data:{summary:{averageFps:'<img>'}}}));assert.equal(m.safeLink('javascript:alert(1)'),'');assert.equal(m.safeLink('https://user:password@example.com'),'');
});
test('Workspace backup includes old League saves, excludes room credentials and rolls back failed writes',async()=>{
 const m=await model,map=new Map([['rf-saved','[]'],['dropzone-squad-room','{"secret":"private"}'],['dropzone-pins-v1','[]']]);const storage={get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>{if(v==='FAIL')throw Error('quota');map.set(k,v);},removeItem:k=>map.delete(k)};
 const backup=m.backupStorage(storage);assert.equal(backup.entries['rf-saved'],'[]');assert.ok(!('dropzone-squad-room' in backup.entries));assert.throws(()=>m.restoreStorage(storage,{'rf-saved':'[1]','dropzone-pins-v1':'FAIL'}));assert.equal(map.get('rf-saved'),'[]');assert.throws(()=>m.validateBackup({...backup,entries:{foreign:'[]'}}));
});
test('Sensitivity and imported performance use defined units and reject bad input',async()=>{
 const m=await model,r=m.sensitivity({dpi:800,sensitivity:1,yaw:.1,targetDpi:1600,targetYaw:.1});assert.equal(r.targetSensitivity,.5);assert.equal(r.cm360,11.43);assert.throws(()=>m.sensitivity({dpi:0}));const s=m.performanceSummary([10,10,10,10]);assert.equal(s.averageFps,100);assert.equal(s.onePercentLow,100);assert.throws(()=>m.performanceSummary([0,NaN]));
});
test('Pairing server requires a secret, versions edits and expires links when stopped',async()=>{
 const room=require('../desktop/companion-server.cjs').createCompanionServer();try{const started=await room.start({title:'Test room',cards:[{title:'Plan',body:'Private note'}],slots:[{name:'Player',pick:'Sage',role:'Sentinel'}]});const url=started.urls[0];assert.ok(url);const token=new URL(url).hash.slice(1),base='http://127.0.0.1:'+room.getPort();assert.equal((await fetch(base+'/api/room')).status,401);const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'},a=await fetch(base+'/api/room',{headers}).then(r=>r.json());assert.equal(a.snapshot.cards[0].body,'Private note');assert.equal((await fetch(base+'/api/room',{method:'POST',headers,body:JSON.stringify({version:a.version,slot:0,name:'Friend',pick:'Clove',role:'Controller',ready:true})})).status,200);assert.equal((await fetch(base+'/api/room',{method:'POST',headers,body:JSON.stringify({version:a.version,slot:0})})).status,409);assert.equal(room.read().snapshot.slots[0].pick,'Clove');}finally{await room.stop();assert.equal(room.status().active,false);}
});
test('Removed games are absent while existing game workspaces remain available',()=>{
 const games=new (require('../core/game-service.cjs').GameService)().list();for(const id of ['valorant','rivals'])assert.equal(games.find(g=>g.id===id),undefined);for(const id of ['wardogs','finals','siege','lol','bo7','warzone'])assert.ok(games.some(g=>g.id===id));
});
