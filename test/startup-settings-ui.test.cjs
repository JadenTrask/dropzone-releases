const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
test('launch settings are distinct, accessible, default off, and only persist the requested preference',async()=>{
 const dom=new JSDOM('<main></main>',{url:'http://localhost/'});global.window=dom.window;global.document=dom.window.document;const calls=[];let settings={available:true,startMinimized:false,openLiveTrackerOnSession:false};
 window.rift={loginStartup:async input=>{calls.push(['windows',input]);return {available:true,enabled:false,message:'Off.'};},launchBehavior:async input=>{calls.push(['launch',input]);if(input.action==='set')settings={...settings,[input.key]:input.enabled};return settings;}};
 const {api}=await import('../app/shared.js');Object.assign(api,window.rift);
 const {mountStartupSetting}=await import('../app/startup-settings.js');mountStartupSetting(document.querySelector('main'));const settle=()=>new Promise(r=>setImmediate(r));await settle();
 const checks=[...document.querySelectorAll('input')];assert.equal(checks.length,3);assert.ok(checks.every(input=>!input.checked&&!input.disabled));assert.match(document.body.textContent,/Open Live Tracker when a session starts/);assert.match(document.body.textContent,/menu does not trigger/);
 const toggle=document.querySelector('#launch-startMinimized');toggle.checked=true;toggle.dispatchEvent(new window.Event('change'));await settle();assert.equal(document.querySelector('#launch-at-login').checked,false);assert.equal(document.querySelector('#launch-openLiveTrackerOnSession').checked,false);assert.deepEqual(calls.filter(([type,input])=>type==='windows'&&input.action==='set'),[]);assert.deepEqual(calls.at(-1),['launch',{action:'set',key:'startMinimized',enabled:true}]);
 for(const input of checks)assert.ok(input.getAttribute('aria-describedby').split(' ').every(id=>document.getElementById(id)));dom.window.close();
});

test('pending saves announce accessibly without inserting visible row text, and failures stay actionable',async()=>{
 const dom=new JSDOM('<main></main>',{url:'http://localhost/'});global.window=dom.window;global.document=dom.window.document;
 let finish;const state={available:true,startMinimized:false,openLiveTrackerOnSession:false};
 window.rift={loginStartup:async()=>({available:true,enabled:false,message:'Off.'}),launchBehavior:input=>input.action==='set'?new Promise(resolve=>{finish=resolve;}):Promise.resolve(state)};
 const {api}=await import('../app/shared.js');Object.assign(api,window.rift);
 const {mountStartupSetting}=await import('../app/startup-settings.js');mountStartupSetting(document.querySelector('main'));await new Promise(r=>setImmediate(r));
 const toggle=document.querySelector('#launch-startMinimized'),status=document.querySelector('#launch-startMinimized-status');
 toggle.checked=true;toggle.dispatchEvent(new window.Event('change'));
 assert.equal(toggle.getAttribute('aria-busy'),'true');assert.equal(status.hidden,true);
 assert.equal(document.querySelector('.startup-save-announcement[role=status]').textContent,'Saving preference.');
 finish({...state,saved:false,message:'Could not save. Try again.'});await new Promise(r=>setImmediate(r));
 assert.equal(toggle.hasAttribute('aria-busy'),false);assert.equal(toggle.checked,false);assert.equal(toggle.disabled,false);
 assert.equal(status.hidden,false);assert.match(status.textContent,/Try again/);assert.equal(document.querySelector('.startup-save-announcement').textContent,'');dom.window.close();
});
