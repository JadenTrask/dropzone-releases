const {test}=require('node:test'),assert=require('node:assert/strict');
test('Goal groups respect simultaneous restrictions and reject prerequisite loops',async()=>{
 const {cleanRecord,cleanState,blankState}=await import('../app/command-model.js'),{challengeGroups}=await import('../app/workflow-model.js');
 const make=(id,data,links=[])=>cleanRecord({id,kind:'goal',game:'finals',title:id,links,data:{total:10,...data}});
 const goals=[make('any',{}),make('ascent',{map:'Ascent',weapon:'Vandal'}),make('bind',{map:'Bind',weapon:'Vandal'}),make('done',{current:10})];
 const groups=challengeGroups(goals);assert.equal(groups.length,2);assert.ok(!groups.some(g=>g.some(r=>r.id==='ascent')&&g.some(r=>r.id==='bind')));assert.ok(!groups.flat().some(r=>r.id==='done'));
 assert.throws(()=>cleanState({...blankState(),records:[make('a',{},['b']),make('b',{},['a'])]}),/loop/);
});
test('Saved game plans keep equipment and all board/attachment references through backup restore',async()=>{
 const {cleanRecord,CENTER_KEY}=await import('../app/command-model.js'),{remapRestoredMedia}=await import('../app/command-backup.js');
 const r=cleanRecord({id:'plan',kind:'strategy',game:'siege',title:'Basement hold',data:{side:'defense',floor:'Basement',boards:[{floor:'Basement',imageId:'map'}],attachments:[{id:'shot',name:'site.png',type:'image/png'}],slots:[{name:'One',pick:'Mute',role:'Support',assignment:'Protect wall',gadgets:[]}],shapes:[{type:'point',x:.2,y:.3,x2:.2,y2:.3,floor:'Basement',category:'reinforcement',owner:'One'}]}});
 const restored=remapRestoredMedia({[CENTER_KEY]:JSON.stringify({records:[r]})},[['map',new File(['m'],'map.png')],['shot',new File(['s'],'shot.png')]]);const data=JSON.parse(restored.entries[CENTER_KEY]).records[0].data;
 assert.notEqual(data.boards[0].imageId,'map');assert.notEqual(data.attachments[0].id,'shot');assert.equal(data.shapes[0].floor,'Basement');assert.equal(data.slots[0].assignment,'Protect wall');
});
test('Session start restores chosen records, collects edits and finishes with a recap',async t=>{
 const {JSDOM}=await import('jsdom'),dom=new JSDOM('<body><div class="rail-main"></div><div class="global-tools"></div><div id="hub-app"></div><div id="toast"></div></body>',{url:'http://localhost/'}),w=dom.window;
 for(const key of ['window','document','localStorage','sessionStorage','FormData','Event','CustomEvent'])global[key]=key==='window'?w:w[key];w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const ui=await import('../app/command-center.js'),store=await import('../app/command-store.js'),workflow=await import('../app/workflow-model.js');
 t.after(()=>{ui.leaveCommandCenter();w.dispatchEvent(new w.Event('beforeunload'));dom.window.close();});const routes=[];ui.initCommandCenter(require('../core/games.json'),(...args)=>routes.push(args));ui.mountCommandCenter('finals','session');
 store.saveRecord({id:'build',kind:'build',game:'finals',title:'Sage practice',data:{pick:'Sage'}});store.saveRecord({id:'goal',kind:'goal',game:'finals',title:'Clean throws',data:{current:2,total:10}});
 document.querySelector('[data-cc="start-session"]').click();let f=document.querySelector('#session-setup');assert.equal(f.elements.launch.checked,false);f.elements.build.value='build';f.elements.tool.value='build';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,40));
 let s=store.getState(),session=s.records.find(r=>r.id===s.activeSession);assert.deepEqual(session.links,['build']);assert.equal(session.data.goalBaseline.goal,2);assert.equal(s.preferences.sessionDefaults.finals.build,'build');assert.equal(document.querySelector('#cc-dialog h2').textContent,'Sage practice');
 store.saveRecord({...s.records.find(r=>r.id==='goal'),data:{current:5,total:10}});store.saveRecord({id:'note',kind:'note',game:'finals',title:'Angle note',data:{}});store.saveRecord({id:'other',kind:'note',game:'siege',title:'Other game',data:{}});
 assert.deepEqual(workflow.goalChanges(store.getState(),session).map(x=>[x.before,x.after]),[[2,5]]);assert.ok(workflow.sessionEntries(store.getState(),session).some(r=>r.id==='note'));assert.ok(!workflow.sessionEntries(store.getState(),session).some(r=>r.id==='other'));
 document.querySelector('[data-cc="close"]').click();ui.mountCommandCenter('finals','session');document.querySelector('[data-cc="end-session"]').click();f=document.querySelector('#session-recap');f.elements.worked.value='Utility timing';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(store.getState().activeSession,null);assert.ok(store.getState().records.find(r=>r.id===session.id).data.collectedIds.includes('note'));
 ui.leaveCommandCenter();w.dispatchEvent(new w.Event('beforeunload'));dom.window.close();
});
test('FINALS lineup rejects incompatible equipment and reports selected utility coverage',async()=>{
 const {JSDOM}=await import('jsdom'),dom=new JSDOM('<form></form>');global.FormData=dom.window.FormData;
 const {teamFields,planningValues,finalsCatalog,bindPlanning}=await import('../app/game-planning.js'),{teamCoverage}=await import('../app/command-model.js');
 const f=dom.window.document.querySelector('form'),record={kind:'team',game:'finals',data:{}};f.innerHTML=teamFields(record,(name,label,value='')=>`<label>${label}<input name="${name}" value="${value||''}"></label>`);bindPlanning(f,record);
 f.elements.className0.value='Heavy';f.elements.className0.dispatchEvent(new dom.window.Event('change'));assert.ok(finalsCatalog('Heavy').weapons.includes(f.elements.weapon0.value));const d=planningValues(f,record);assert.equal(d.slots.length,3);
 const gadget=finalsCatalog('Heavy').gadgets[0];f.elements.gadget0_0.value=gadget;f.elements.gadget0_1.value=gadget;assert.throws(()=>planningValues(f,record),/different gadgets/);
 const coverage=teamCoverage('finals',[{specialization:'Healing Beam',gadgets:['Defibrillator','Jump Pad','APS Turret']}]);assert.deepEqual(coverage.missing,[]);dom.window.close();
});
