const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Worker}=require('node:worker_threads');
const {mkdtemp,rm}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {createHash}=require('node:crypto');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(await fn())return;await pause(40);}throw Error('Condition did not settle');}
function launch(directory){const w=new Worker(path.resolve(__dirname,'../core/rocket-league-worker.cjs'),{workerData:{directory}});let id=0;const request=input=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{w.off('message',listener);reject(Error('timeout'));},8000);const listener=m=>{if(m.id===key){clearTimeout(timer);w.off('message',listener);m.error?reject(Error(m.error)):resolve(m.value);}};w.on('message',listener);w.postMessage({id:key,input});});return {w,request};}

test('analysis snapshot paginates equal-time SQLite matches once and excludes later starts',async()=>{
 const {DatabaseSync}=require('node:sqlite'),directory=await mkdtemp(path.join(tmpdir(),'dropzone-analysis-snapshot-')),tracker=launch(directory);let db;
 try{await tracker.request({action:'settings',value:{tracking:false,identity:'fixture'}});const asOf=Date.now()-1000;db=new DatabaseSync(path.join(directory,'history.sqlite'));for(let i=0;i<66;i++){const m={id:'fixture-'+String(i).padStart(3,'0'),startedAt:i===65?asOf+500:asOf-1000,status:'complete',winner:0,players:[{PrimaryId:'fixture',TeamNum:0,Goals:1}],game:{PlaylistId:11}};db.prepare('INSERT INTO matches VALUES (?,?,?,?,?)').run(m.id,m.startedAt,m.status,null,JSON.stringify(m));}db.close();db=null;const rows=[];for(const offset of [0,25,50]){const page=await tracker.request({action:'history',days:365,asOf,offset});assert.equal(page.total,65);rows.push(...page.matches);}assert.equal(rows.length,65);assert.equal(new Set(rows.map(r=>r.id)).size,65);assert.equal(rows[0].id,'fixture-064');assert.ok(rows.every(r=>r.startedAt<=asOf));assert.equal((await tracker.request({action:'history',days:365})).total,66);}finally{db?.close();await tracker.w.terminate();await rm(directory,{recursive:true,force:true});}
});
test('real local WebSocket intake records to SQLite without hidden UI traffic, survives restart and excludes replays',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'dropzone-rl-test-')),server=http.createServer();let socket;const sockets=new Set();
 server.on('upgrade',(req,s)=>{socket=s;sockets.add(s);s.on('error',()=>{});s.on('close',()=>sockets.delete(s));const accept=createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');s.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let tracker=launch(directory),pushes=0;tracker.w.on('message',m=>{if(m.event==='state')pushes++;});
 const send=(Event,Data)=>{const data=Buffer.from(JSON.stringify({Event,Data:JSON.stringify(Data)}));const header=Buffer.alloc(data.length<126?2:4);header[0]=0x81;if(data.length<126)header[1]=data.length;else{header[1]=126;header.writeUInt16BE(data.length,2);}socket.write(Buffer.concat([header,data]));};
 const update=id=>send('UpdateState',{MatchGuid:id,Players:[{PrimaryId:'Epic|1|0',Name:'Truck',TeamNum:0,Goals:2,Shots:4,Score:400}],Game:{PlaylistId:11,Teams:[{Name:'Blue',TeamNum:0,Score:2},{Name:'Orange',TeamNum:1,Score:1}],Arena:'Stadium_P',TimeSeconds:0}});
 try{
 await tracker.request({action:'settings',value:{port:server.address().port,identity:'Epic|1|0'}});await until(async()=> (await tracker.request({action:'state'})).connected);
 send('MatchCreated',{MatchGuid:'m1'});for(let i=0;i<200;i++)update('m1');send('MatchEnded',{MatchGuid:'m1',WinnerTeamNum:0});send('PodiumStart',{MatchGuid:'m1'});
 await until(async()=> (await tracker.request({action:'history'})).total===1);assert.equal(pushes,0,'Hidden renderer receives no telemetry');assert.equal((await tracker.request({action:'state'})).lastMatch.id,'m1');
 const a=await tracker.request({action:'analytics',limit:10});assert.equal(a.career.wins,1);assert.equal(a.career.shooting,50);assert.equal(a.career.samples.Saves,undefined,'Missing saves were not treated as zero');
 await tracker.request({action:'visible',value:true});await until(()=>pushes>0);await tracker.request({action:'visible',value:false});
 send('ReplayCreated',{MatchGuid:'m1',FileName:'SavedReplay',Date:'2026-09-26'});update('m1');send('MatchEnded',{MatchGuid:'m1',WinnerTeamNum:0});send('MatchDestroyed',{MatchGuid:'m1'});await pause(50);assert.equal((await tracker.request({action:'history'})).total,1);
 for(const playlist of [9,73,6]){const id='practice-'+playlist;send('MatchCreated',{MatchGuid:id});send('UpdateState',{MatchGuid:id,Players:[{PrimaryId:'Epic|1|0',Name:'Truck',TeamNum:0}],Game:{PlaylistId:playlist,Teams:[]}});send('MatchEnded',{MatchGuid:id,WinnerTeamNum:0});send('PodiumStart',{MatchGuid:id});}await pause(80);assert.equal((await tracker.request({action:'history'})).total,1);const {DatabaseSync}=require('node:sqlite');const check=new DatabaseSync(path.join(directory,'history.sqlite'));assert.equal(check.prepare('SELECT count(*) n FROM matches').get().n,1,'Free Play must not be written to SQLite');check.close();
 send('MatchCreated',{MatchGuid:'timed-freeplay'});const practice=()=>send('UpdateState',{MatchGuid:'timed-freeplay',Players:[{PrimaryId:'Epic|1|0',TeamNum:0}],Game:{PlaylistId:9,Teams:[]}});practice();await pause(120);practice();await pause(120);send('MatchDestroyed',{MatchGuid:'timed-freeplay'});await pause(80);const time=await tracker.request({action:'playtime'});const freeplay=time.find(r=>r.kind==='freeplay');assert.ok(freeplay.seconds>0&&freeplay.seconds<1);assert.equal((await tracker.request({action:'history'})).total,1);
 await tracker.w.terminate();tracker=launch(directory);const restoredTime=await tracker.request({action:'playtime'});assert.deepEqual(restoredTime,time);await until(async()=> (await tracker.request({action:'state'})).connected);
 await assert.rejects(tracker.request({action:'replay',command:'SeekReplay',time:4}),/Open a replay/);
 await assert.rejects(tracker.request({action:'replay',command:'LoadReplay',file:'../bad'}),/filename/);
 await tracker.w.terminate();tracker=launch(directory);assert.equal((await tracker.request({action:'analytics'})).career.matches,1);assert.equal((await tracker.request({action:'state'})).lastMatch.id,'m1');
 await until(async()=> (await tracker.request({action:'state'})).connected);
 await tracker.request({action:'settings',value:{keepHistory:false}});send('MatchCreated',{MatchGuid:'m2'});update('m2');send('MatchEnded',{MatchGuid:'m2',WinnerTeamNum:0});send('PodiumStart',{MatchGuid:'m2'});await pause(100);assert.equal((await tracker.request({action:'history'})).total,1);
 }finally{await tracker.w.terminate();for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true});}
});

test('crash checkpoint is recovered as incomplete and a corrupt database fails independently',async()=>{
 const {DatabaseSync}=require('node:sqlite'),{writeFile}=require('node:fs/promises');
 const directory=await mkdtemp(path.join(tmpdir(),'dropzone-rl-recovery-'));let tracker;
 try{
  tracker=launch(directory);await tracker.request({action:'settings',value:{tracking:false}});await tracker.w.terminate();
  const db=new DatabaseSync(path.join(directory,'history.sqlite'));
  db.prepare('INSERT OR REPLACE INTO config VALUES (?,?)').run('pending',JSON.stringify({id:'crashed',startedAt:Date.now(),completeStart:true,ended:false,players:[{PrimaryId:'me',TeamNum:0}],game:{PlaylistId:11},events:[]}));db.close();
  tracker=launch(directory);const h=await tracker.request({action:'history'});assert.equal(h.total,1);assert.equal(h.matches[0].status,'incomplete');assert.equal((await tracker.request({action:'analytics'})).career.matches,0);await tracker.w.terminate();
  await writeFile(path.join(directory,'history.sqlite'),'not a sqlite database');tracker=launch(directory);const s=await tracker.request({action:'state'});assert.match(s.error,/storage unavailable/i);assert.deepEqual((await tracker.request({action:'history'})).matches,[]);
 }finally{await tracker?.w.terminate();await rm(directory,{recursive:true,force:true});}
});
test('date windows include every match in the period and preserve older history',async()=>{
 const {DatabaseSync}=require('node:sqlite');const directory=await mkdtemp(path.join(tmpdir(),'dropzone-rl-days-'));let tracker=launch(directory),db;
 try{await tracker.request({action:'settings',value:{tracking:false,identity:'period-player'}});db=new DatabaseSync(path.join(directory,'history.sqlite'));for(let i=0;i<40;i++){const age=i<35?20:40,id='period-'+i,started=Date.now()-age*86400000;const m={id,startedAt:started,status:'complete',winner:0,players:[{PrimaryId:'period-player',TeamNum:0,Goals:1,Shots:2}],game:{PlaylistId:11},events:[]};db.prepare('INSERT INTO matches VALUES (?,?,?,?,?)').run(id,started,'complete',null,JSON.stringify(m));}db.close();db=null;const a=await tracker.request({action:'analytics',days:30,limit:10});assert.equal(a.filtered.matches,35,'Date window must not retain the old ten-match limit');assert.equal(a.career.matches,40);assert.equal((await tracker.request({action:'analytics',days:365})).filtered.matches,40);assert.equal((await tracker.request({action:'analytics',days:14})).filtered.matches,0);assert.equal((await tracker.request({action:'analytics',days:0})).filtered.matches,40);const page=await tracker.request({action:'history',days:30});assert.equal(page.total,35);assert.equal(page.matches.length,25);assert.equal((await tracker.request({action:'history',days:30,offset:25})).matches.length,10);assert.equal((await tracker.request({action:'history',days:0})).total,40);}finally{db?.close();await tracker.w.terminate();await rm(directory,{recursive:true,force:true});}
});

test('player lookup and rolling history policy work with populated SQLite records',async()=>{
 const {DatabaseSync}=require('node:sqlite');const directory=await mkdtemp(path.join(tmpdir(),'dropzone-rl-policy-'));const tracker=launch(directory);let db;
 try{await tracker.request({action:'settings',value:{tracking:false,identity:'me'}});db=new DatabaseSync(path.join(directory,'history.sqlite'));for(const age of [10,40,370]){const id='age-'+age,started=Date.now()-age*86400000,m={id,startedAt:started,status:'complete',winner:0,players:[{PrimaryId:'me',Name:'Truck',TeamNum:0,Goals:1}],game:{PlaylistId:11},events:[]};db.prepare('INSERT INTO matches VALUES (?,?,?,?,?)').run(id,started,'complete',null,JSON.stringify(m));}db.close();db=null;
 const players=await tracker.request({action:'players'});assert.equal(players[0].id,'me');assert.equal((await tracker.request({action:'state'})).error,'');
 await tracker.request({action:'history-policy',days:365});assert.equal((await tracker.request({action:'history',days:0})).total,2);
 await tracker.request({action:'history-policy',days:30});assert.equal((await tracker.request({action:'history',days:365})).total,1);assert.equal((await tracker.request({action:'analytics'})).career.matches,1);assert.equal(await tracker.request({action:'detail',id:'age-40'}),null);
 db=new DatabaseSync(path.join(directory,'history.sqlite'));assert.equal(db.prepare('SELECT count(*) n FROM matches').get().n,1);
 }finally{db?.close();await tracker.w.terminate();await rm(directory,{recursive:true,force:true});}
});


test('existing private practice and empty lifecycle rows stay out of history, recovery and cloud uploads',async()=>{
 const {DatabaseSync}=require('node:sqlite');const directory=await mkdtemp(path.join(tmpdir(),'dropzone-rl-practice-'));let tracker=launch(directory);
 try{
  await tracker.request({action:'settings',value:{tracking:false,identity:'me'}});await tracker.w.terminate();
  const db=new DatabaseSync(path.join(directory,'history.sqlite'));
  const privateMatch={id:'real-private',startedAt:Date.now()-1000,status:'complete',ended:true,winner:0,players:[{PrimaryId:'me',TeamNum:0,Goals:1},{PrimaryId:'opponent',TeamNum:1,Goals:0}],game:{PlaylistId:6,Teams:[{TeamNum:0,Score:1},{TeamNum:1,Score:0}]},events:[]};
  const practice={...privateMatch,id:'same-team-practice',startedAt:Date.now(),players:[{PrimaryId:'me',TeamNum:0},{PrimaryId:'friend',TeamNum:0}]};
  for(const m of [privateMatch,practice,{...practice,id:'empty',players:[]}])db.prepare('INSERT INTO matches VALUES (?,?,?,?,?)').run(m.id,m.startedAt,m.status,null,JSON.stringify(m));
  db.prepare('INSERT OR REPLACE INTO config VALUES (?,?)').run('pending',JSON.stringify({...practice,id:'practice-checkpoint'}));db.close();
  tracker=launch(directory);const history=await tracker.request({action:'history'});assert.equal(history.total,1);assert.equal(history.matches[0].id,'real-private');assert.equal(await tracker.request({action:'detail',id:practice.id}),null);assert.equal((await tracker.request({action:'analytics'})).career.matches,0);assert.equal((await tracker.request({action:'state'})).lastMatch.id,'real-private');assert.deepEqual((await tracker.request({action:'cloud-records'})).map(m=>m.match_id),['real-private']);
  const check=new DatabaseSync(path.join(directory,'history.sqlite'));assert.equal(check.prepare('SELECT count(*) n FROM matches').get().n,3,'Practice checkpoint must not be recovered as a saved match; existing rows are not deleted');check.close();
 }finally{await tracker.w.terminate();await rm(directory,{recursive:true,force:true});}
});


test('named groups persist, filter by match type and delete without deleting matches',async()=>{
 const {DatabaseSync}=require('node:sqlite');const directory=await mkdtemp(path.join(tmpdir(),'dropzone-rl-groups-'));let tracker=launch(directory);
 try{await tracker.request({action:'settings',value:{tracking:false,identity:'me'}});const db=new DatabaseSync(path.join(directory,'history.sqlite'));
 for(const [id,PlaylistId] of [['ranked',11],['casual',2],['private',6],['unknown',null]]){const m={id,startedAt:Date.now(),status:'complete',winner:0,game:{PlaylistId},players:[{PrimaryId:'me',TeamNum:0,Goals:1},{PrimaryId:'other',TeamNum:1}],events:[]};db.prepare('INSERT INTO matches VALUES(?,?,?,?,?)').run(id,m.startedAt,'complete',null,JSON.stringify(m));}db.close();
 for(const kind of ['ranked','casual','private'])assert.deepEqual((await tracker.request({action:'history',kind})).matches.map(m=>m.id),[kind]);assert.equal((await tracker.request({action:'analytics'})).career.matches,2);
 const group=await tracker.request({action:'group-create',name:'Weekend games'});await tracker.request({action:'group-add',group:group.id,matches:['private','ranked']});await tracker.request({action:'group-add',group:group.id,matches:['ranked']});assert.equal((await tracker.request({action:'history',group:group.id})).total,2);assert.equal((await tracker.request({action:'history',group:group.id,kind:'ranked'})).total,1);
 await tracker.request({action:'group-rename',group:group.id,name:'My favorite matches'});await tracker.w.terminate();tracker=launch(directory);assert.equal((await tracker.request({action:'history'})).groups[0].name,'My favorite matches');await tracker.request({action:'group-remove',group:group.id,matches:['private']});assert.equal((await tracker.request({action:'history',group:group.id})).total,1);await tracker.request({action:'group-delete',group:group.id});assert.equal((await tracker.request({action:'history'})).total,4);assert.equal((await tracker.request({action:'history'})).groups.length,0);await assert.rejects(tracker.request({action:'group-create',name:'  '}),/name/);
 }finally{await tracker.w.terminate();await rm(directory,{recursive:true,force:true});}
});
