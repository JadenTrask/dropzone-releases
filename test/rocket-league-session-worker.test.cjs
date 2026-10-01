const {test}=require('node:test'),assert=require('node:assert/strict');
const {Worker}=require('node:worker_threads'),{mkdtemp,rm}=require('node:fs/promises'),{tmpdir}=require('node:os'),path=require('node:path'),http=require('node:http'),{createHash}=require('node:crypto');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let n=0;n<100;n++){if(await check())return;await pause(30);}throw Error('Fixture did not settle');}
test('worker emits one telemetry session edge while hidden, with no process/menu or reconnect triggers',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'dropzone-session-edge-')),server=http.createServer(),sockets=new Set(),events=[];let socket,worker,id=0;
 server.on('upgrade',(req,s)=>{socket=s;sockets.add(s);s.on('error',()=>{});s.on('close',()=>sockets.delete(s));s.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');});
 const launch=()=>{worker=new Worker(path.resolve(__dirname,'../core/rocket-league-worker.cjs'),{workerData:{directory}});worker.on('message',message=>{if(message.event)events.push(message);});};
 const request=input=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>reject(Error('Worker timeout')),5000);const listener=message=>{if(message.id!==key)return;clearTimeout(timer);worker.off('message',listener);message.error?reject(Error(message.error)):resolve(message.value);};worker.on('message',listener);worker.postMessage({id:key,input});});
 const send=(Event,Data)=>{const bytes=Buffer.from(JSON.stringify({Event,Data:JSON.stringify(Data)})),header=Buffer.alloc(bytes.length<126?2:4);header[0]=0x81;if(bytes.length<126)header[1]=bytes.length;else{header[1]=126;header.writeUInt16BE(bytes.length,2);}socket.write(Buffer.concat([header,bytes]));};
 const update=(guid,playlist=9)=>send('UpdateState',{MatchGuid:guid,Players:[{PrimaryId:'fixture',Name:'Fixture',TeamNum:0}],Game:{PlaylistId:playlist,TimeSeconds:300}});
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));launch();await request({action:'settings',value:{port:server.address().port,record:false}});await until(async()=>(await request({action:'state'})).connected);
  await pause(160);assert.equal(events.filter(e=>e.event==='session-start').length,0,'A socket connection is not a session');
  send('MatchCreated',{MatchGuid:'freeplay'});update('freeplay');await pause(140);update('freeplay');await until(()=>events.some(e=>e.event==='session-start'));
  assert.equal(events.find(e=>e.event==='session-start').value.kind,'freeplay');assert.equal(events.filter(e=>e.event==='state').length,0,'Hidden view receives only the bounded session edge, not telemetry packets');
  for(let n=0;n<30;n++)update('freeplay');await pause(80);assert.equal(events.filter(e=>e.event==='session-start').length,1);
  // Restart simulates connection recovery; current state without a new start is ignored.
  await worker.terminate();launch();await until(async()=>(await request({action:'state'})).connected);update('freeplay');await pause(150);update('freeplay');await pause(80);assert.equal(events.filter(e=>e.event==='session-start').length,1);
  send('MatchDestroyed',{MatchGuid:'freeplay'});send('MatchCreated',{MatchGuid:'private'});update('private',6);await pause(140);update('private',6);await until(()=>events.filter(e=>e.event==='session-start').length===2);assert.equal(events.filter(e=>e.event==='session-start')[1].value.kind,'private');
  assert.equal((await request({action:'history'})).total,0,'Automatic opening never enables match recording');
 }finally{await worker?.terminate();for(const s of sockets)s.destroy();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
