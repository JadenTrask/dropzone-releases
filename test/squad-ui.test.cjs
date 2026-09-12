const {test}=require('node:test'),assert=require('node:assert/strict');
test('Squad invite is visible and selectable after creation and hidden after disconnect',async()=>{
 const {JSDOM}=await import('jsdom'),maps=require('../app/data/wardogs/maps.json');const dom=new JSDOM('<div id="hub-app"></div><div id="toast"></div>',{url:'http://localhost/'}),w=dom.window;
 for(const key of ['window','document','localStorage','sessionStorage','Event','CustomEvent'])global[key]=key==='window'?w:w[key];
 const code='DZ1.visible-invite-code';w.rift={squad:async()=>({code,owner:'test-owner',room:{map:'bakurani',revision:maps.revision,version:0,markers:[],expires:Date.now()+60000}})};
 const ui=await import('../app/squad-ui.js'),client=await import('../app/squad-client.js');ui.mountSquad();assert.equal(document.querySelector('#squad-room').hidden,true);document.querySelector('#squad-create').click();await new Promise(r=>setTimeout(r,20));
 const field=document.querySelector('#squad-visible-code');assert.equal(field.value,code);assert.equal(field.readOnly,true);assert.equal(document.querySelector('#squad-room').hidden,false);field.click();assert.equal(field.selectionStart,0);assert.equal(field.selectionEnd,code.length);
 client.leaveSquad();assert.equal(document.querySelector('#squad-room').hidden,true);dom.window.close();
});
