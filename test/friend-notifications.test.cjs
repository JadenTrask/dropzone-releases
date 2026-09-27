const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
test('request notifications deduplicate polls, expire after five seconds, and open requests',async t=>{
 const dom=new JSDOM('<body></body>',{url:'http://localhost'});global.document=dom.window.document;global.window=dom.window;global.Event=dom.window.Event;global.sessionStorage=dom.window.sessionStorage;
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 const {startFriendNotifications}=await import('../app/friend-notifications.js');let opened=0,rows=[{id:'new',handle:'new_friend',display_name:'<New>',incoming:true,accepted:false},{id:'old',handle:'existing',incoming:true,accepted:true},{id:'sent',incoming:false,accepted:false}];
 const call=async q=>q.action==='account-state'?{user:{id:'me'}}:rows;
 const stop=startFriendNotifications(call,()=>opened++);const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};await settle();
 assert.equal(document.querySelectorAll('.dz-friend-notification').length,1);assert.equal(document.querySelector('New'),null);
 t.mock.timers.tick(4999);assert.equal(document.querySelector('.is-leaving'),null);t.mock.timers.tick(1);assert.ok(document.querySelector('.is-leaving'));t.mock.timers.tick(320);assert.equal(document.querySelector('.dz-friend-notification'),null);
 t.mock.timers.tick(15000);await settle();assert.equal(document.querySelector('.dz-friend-notification'),null);
 rows.push({id:'second',handle:'second',incoming:true});t.mock.timers.tick(15000);await settle();document.querySelector('[data-open]').click();assert.equal(opened,1);stop();t.mock.timers.tick(320);dom.window.close();
});
test('friends and incoming/outgoing requests have separate tabs',async()=>{
 const dom=new JSDOM('<body></body>',{url:'http://localhost'});global.document=dom.window.document;global.window=dom.window;global.localStorage=dom.window.localStorage;
 const ui=await import('../app/rocket-league-accounts.js');const call=async q=>q.action==='account-state'?{enabled:true,user:{id:'me'},profile:{handle:'me'}}:[{id:'a',handle:'accepted_friend',accepted:true},{id:'b',handle:'incoming_person',incoming:true},{id:'c',handle:'outgoing_person',incoming:false}];
 await ui.loadAccounts(call);document.body.innerHTML=ui.accountsUI();assert.match(document.body.textContent,/accepted_friend/);assert.doesNotMatch(document.body.textContent,/incoming_person|outgoing_person/);
 await ui.accountAction({dataset:{account:'friends-tab',tab:'requests'}},call);document.body.innerHTML=ui.accountsUI();assert.doesNotMatch(document.body.textContent,/accepted_friend/);assert.match(document.body.textContent,/incoming_person/);assert.match(document.body.textContent,/outgoing_person/);assert.equal(document.querySelectorAll('[data-account=accept]').length,1);dom.window.close();
});
