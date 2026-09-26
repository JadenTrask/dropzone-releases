const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {parse,patch,enable,configAt}=require('../core/rocket-league-setup.cjs');
test('setup preserves unrelated config and custom ports, fixes conflicting TCP port',()=>{
 const text='; preserve\r\n[Other]\r\nPacketSendRate=99\r\n[TAGame.MatchStatsExporter_TA]\r\nPacketSendRate=0 ; disabled\r\nWebPort=49999\r\nPort=49999\r\n';
 const updated=patch(text,49999);assert.deepEqual(parse(updated),{rate:10,port:49999,tcp:0,ready:true});assert.match(updated,/\[Other\]\r\nPacketSendRate=99/);assert.match(updated,/; disabled/);assert.equal(patch(updated,49999),updated);assert.equal(parse('[Other]\nPacketSendRate=10').ready,false);assert.equal(parse('[TAGame.MatchStatsExporter_TA]\nPacketSendRate=10').ready,true);
});
test('setup validates install, backs up exact bytes, preserves UTF16 and is idempotent',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dropzone-rl-setup-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));assert.equal(await configAt(root),null);await fs.mkdir(path.join(root,'Binaries','Win64'),{recursive:true});await fs.writeFile(path.join(root,'Binaries','Win64','RocketLeague.exe'),'fixture');const dir=path.join(root,'TAGame','Config');await fs.mkdir(dir,{recursive:true});const file=path.join(dir,'DefaultStatsAPI.ini'),bytes=Buffer.from('\ufeff; original\r\n[TAGame.MatchStatsExporter_TA]\r\nPacketSendRate=0\r\nWebPort=49124\r\n','utf16le');await fs.writeFile(file,bytes);assert.equal(await configAt(root),file);const result=await enable(file);assert.equal(result.ready,true);assert.deepEqual(await fs.readFile(result.backup),bytes);assert.match((await fs.readFile(file)).toString('utf16le'),/PacketSendRate=10/);assert.equal((await enable(file)).changed,false);assert.equal((await fs.readdir(dir)).length,2);const preferred=path.join(dir,'TAStatsAPI.ini');await fs.writeFile(preferred,'[TAGame.MatchStatsExporter_TA]\nPacketSendRate=20\nWebPort=50000');assert.equal(await configAt(root),preferred);const ready=await enable(preferred);assert.equal(ready.changed,false);assert.equal(ready.port,50000);
});
