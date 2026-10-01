const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const modulePromise=import('../app/navigation-history.js');
function moved(window,method){return new Promise(resolve=>{window.addEventListener('popstate',resolve,{once:true});window.history[method]();});}

test('file-backed desktop history restores Apex landing/profile and the previous game',async()=>{
 const {recordRoute,restoredRoute}=await modulePromise;
 const {window}=new JSDOM('',{url:'file:///C:/Dropzone/app/index.html'}),{history,location}=window;
 try{
  recordRoute(history,location,{id:'siege',replace:true});
  recordRoute(history,location,{id:'apex',view:'loadouts'});
  history.replaceState({...history.state,apexPlayer:{view:'landing',search:{playerName:'Example'}}},'');
  history.pushState({...history.state,apexPlayer:{view:'profile',key:'PC:1',fromPlayers:true}},'');
  assert.equal(location.href,'file:///C:/Dropzone/app/index.html');
  await moved(window,'back');assert.deepEqual(restoredRoute(history,location),['apex',null,'loadouts']);
  recordRoute(history,location,{id:'apex',view:'loadouts',replace:true,preserveState:true});
  assert.equal(history.state.apexPlayer.search.playerName,'Example');
  await moved(window,'back');assert.deepEqual(restoredRoute(history,location),['siege',null,null]);
  await moved(window,'forward');assert.equal(history.state.apexPlayer.view,'landing');
  await moved(window,'forward');assert.equal(history.state.apexPlayer.view,'profile');
 }finally{window.close();}
});

test('normal navigation clears old profile state without duplicate same-route entries',async()=>{
 const {recordRoute}=await modulePromise;
 const {window}=new JSDOM('',{url:'https://dropzone.test/?game=apex'}),{history,location}=window;
 try{
  recordRoute(history,location,{id:'apex',replace:true});
  history.replaceState({...history.state,apexPlayer:{view:'profile'}},'');
  const length=history.length;recordRoute(history,location,{id:'apex'});
  assert.equal(history.length,length);assert.equal(history.state.apexPlayer,undefined);
  recordRoute(history,location,{id:'patches',context:'finals'});
  assert.equal(location.search,'?game=patches&context=finals');
  recordRoute(history,location,{id:'home'});assert.equal(location.search,'?game=home');
 }finally{window.close();}
});

test('legacy and direct links still resolve route parameters',async()=>{
 const {restoredRoute}=await modulePromise;
 assert.deepEqual(restoredRoute({state:null},{href:'https://dropzone.test/?game=apex&view=apex-news'}),['apex',null,'apex-news']);
 assert.deepEqual(restoredRoute({state:null},{href:'file:///C:/Dropzone/app/index.html'}),['home',null,null]);
});
