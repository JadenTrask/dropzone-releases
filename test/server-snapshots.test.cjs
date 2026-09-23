const {test}=require('node:test'),assert=require('node:assert/strict');
test('server snapshots share default requests, isolate filters and retain good snapshots on failure',async()=>{
 let calls=0,fail=false;global.window={rift:{serverStatus:async()=>{calls++;return fail?{error:'offline',rows:[]}:{rows:[{id:'one'}],all:{players:10}}}}};
 try{const {getServers,peekServers}=await import('../app/server-snapshots.js');
 const [a,b]=await Promise.all([getServers({}),getServers({type:'all',page:'1',q:'',sort:'players',dir:'desc',password:'any'})]);assert.equal(calls,1);assert.equal(a,b);assert.equal(peekServers({}),a);
 await getServers({region:'eu-west'});assert.equal(calls,2);await getServers({});assert.equal(calls,2);
 fail=true;await getServers({refresh:true});assert.equal(calls,3);assert.equal(peekServers({}),a);
 }finally{delete global.window;}
});
