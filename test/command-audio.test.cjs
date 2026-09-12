const {test}=require('node:test'),assert=require('node:assert/strict');
test('Closing readiness while microphone permission is pending stops the late stream',async()=>{
 const {JSDOM}=await import('jsdom'),dom=new JSDOM('<dialog id="cc-dialog"></dialog><div id="toast"></div>',{url:'http://localhost/'}),w=dom.window;
 for(const key of ['window','document','localStorage','Event'])global[key]=key==='window'?w:w[key];w.rift={command:async()=>true};global.cancelAnimationFrame=()=>{};
 let resolve,stops=0;const previous=Object.getOwnPropertyDescriptor(global,'navigator');Object.defineProperty(global,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}}});
 try{const t=await import('../app/command-tools.js');await t.toolsAction('readiness',{show:html=>document.querySelector('#cc-dialog').innerHTML=html,button:(action,label)=>`<button data-cc="${action}">${label}</button>`});const pending=document.querySelector('#cc-mic').onclick();await new Promise(r=>setImmediate(r));assert.equal(typeof resolve,'function');t.disposeTools();resolve({getTracks:()=>[{stop:()=>stops++}]});await pending;assert.equal(stops,1);}
 finally{if(previous)Object.defineProperty(global,'navigator',previous);else delete global.navigator;dom.window.close();}
});
