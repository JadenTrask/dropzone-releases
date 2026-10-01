'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app/appearance.js'),'utf8').replace(/^export /gm,'');
for(const previous of [null,'"light"','"system"','"dark"','broken'])test('Dark appearance safely migrates '+previous,()=>{
 const values=new Map([['unrelated-setting','keep'],['dropzone-accessibility-v1','{"contrast":true}']]);if(previous!==null)values.set('dropzone-appearance',previous);
 const root={dataset:{},style:{}},events={};const ctx={document:{documentElement:root},window:{addEventListener:(key,fn)=>events[key]=fn},localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},matchMedia:()=>{throw Error('System appearance must not be queried');}};
 vm.runInNewContext(source,ctx);assert.equal(root.dataset.appearance,'dark');assert.equal(root.style.colorScheme,'dark');assert.equal(values.get('dropzone-appearance'),'"dark"');assert.equal(values.get('unrelated-setting'),'keep');assert.equal(values.get('dropzone-accessibility-v1'),'{"contrast":true}');
 values.set('dropzone-appearance','"light"');events.storage({key:'dropzone-appearance'});assert.equal(root.dataset.appearance,'dark');assert.equal(values.get('dropzone-appearance'),'"dark"');
});
test('Denied storage still applies dark and HTML starts dark before modules run',()=>{
 const root={dataset:{},style:{}};vm.runInNewContext(source,{document:{documentElement:root},window:{addEventListener(){}},localStorage:{getItem(){throw Error('Denied');}}});assert.equal(root.dataset.appearance,'dark');
 const html=fs.readFileSync(require.resolve('../app/index.html'),'utf8');assert.match(html,/<html[^>]*data-appearance="dark"[^>]*color-scheme:dark/);assert.doesNotMatch(html,/href="light-theme.css"/);
 const settings=fs.readFileSync(require.resolve('../app/app-settings.js'),'utf8');assert.doesNotMatch(settings,/appearance-theme|Use system|value="light"/);for(const item of ['High contrast','Reduce motion','Text size'])assert.ok(settings.includes(item));
});
