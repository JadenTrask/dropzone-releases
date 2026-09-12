const test=require('node:test'),assert=require('node:assert/strict');
test('5.56 ammo matches published first-hit examples and rejects unsupported calibers',async()=>{
 const {solveDamage,rangeBreakpoints}=await import('../app/wardogs-damage-engine.js'),data=require('../app/data/wardogs/damage-reference.json'),m4=data.weapons.find(w=>w.id==='m4');
 const rounded=(ammo,body,zone='Upper torso')=>Math.round(solveDamage(m4,{ammo,body,helmet:body,zone,range:50}).damage);
 assert.deepEqual([0,1,2,3,4].map(t=>rounded('AP',t)),[25,20,19,17,15]);
 assert.deepEqual([0,1,2,3,4].map(t=>rounded('HP',t)),[62,9,7,3,0]);
 assert.deepEqual([0,1,2,3,4].map(t=>rounded('HP',t,'Head')),[132,13,9,4,1]);
 assert.equal(solveDamage(data.weapons.find(w=>w.id==='fal'),{ammo:'HP'}).valid,false);
 const settings={range:0,health:100,body:2},points=rangeBreakpoints(m4,settings);
 assert.ok(points.length>0);for(const p of points){assert.equal(solveDamage(m4,{...settings,range:p.after+.0001}).hits,p.hits);assert.equal(solveDamage(m4,{...settings,range:p.after-.0001}).hits,p.hits-1);}
});
test('unlock eligibility is separate from ownership and unknown levels remain unknown',async()=>{
 const {UNLOCKS,unlockState,nextUnlock}=await import('../app/wardogs-planner-engine.js'),m4=UNLOCKS.find(i=>i.id==='m4');
 assert.equal(unlockState(m4,{}).status,'Level unknown');assert.equal(unlockState(m4,{roles:{assault:{level:20}}}).status,'Eligible to unlock');
 assert.equal(unlockState(m4,{roles:{assault:{level:19}}}).remaining,1);assert.equal(unlockState(m4,{unlocks:['M4']}).status,'Owned');
 assert.equal(nextUnlock({roles:{assault:{level:10}}},'assault').item.id,'m4');
});
test('personal patch checks match whole names and refuse an unexpected publisher destination',async()=>{
 const {findMentions,createPersonalIntel}=require('../core/personal-intel.cjs');assert.deepEqual(findMentions('<script>M4</script><p>M400 and AK74. MP5 buff.</p>',['M4','MP5','AK74']),['MP5','AK74']);
 let called=false;await assert.rejects(createPersonalIntel({list:async()=>({articles:[{kind:'Patch notes',url:'https://example.com/private'}]})},async()=>{called=true;})({game:'wardogs',names:['M4']}));assert.equal(called,false);
});
test('quick access restores the original window and unregisters its shortcut',()=>{
 const {createQuickPanel}=require('../desktop/quick-panel.cjs');let visible=true,bounds={x:25,y:30,width:1400,height:900},top=false,shortcut,unregistered=false;
 const window={webContents:{send(){}},isDestroyed:()=>false,isVisible:()=>visible,isMinimized:()=>false,isMaximized:()=>false,getNormalBounds:()=>({...bounds}),setMinimumSize(){},setBounds:b=>{bounds=b;},setAlwaysOnTop:v=>{top=v;},show:()=>{visible=true;},hide:()=>{visible=false;},focus(){}};
 const panel=createQuickPanel({window,globalShortcut:{register:(_,cb)=>{shortcut=cb;return true;},unregister:()=>{unregistered=true;}},screen:{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1920,height:1040}})}});
 shortcut();assert.equal(bounds.width,540);assert.equal(top,true);shortcut();assert.equal(visible,false);shortcut();assert.equal(visible,true);panel.command('full');assert.deepEqual(bounds,{x:25,y:30,width:1400,height:900});assert.equal(top,false);panel.destroy();assert.equal(unregistered,true);
});
