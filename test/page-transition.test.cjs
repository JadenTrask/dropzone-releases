const {test}=require('node:test'),assert=require('node:assert/strict');
test('navigation renders immediately without canvas snapshots, cancels stale fades and propagates errors',async()=>{
 const saved={document:global.document,matchMedia:global.matchMedia};let resolveContent,rendered=false,fades=0,cancelled=0;
 global.matchMedia=()=>({matches:false});
 global.document={visibilityState:'visible',querySelector:s=>s==='.dz-intro'?null:{animate(){fades++;return{cancel(){cancelled++;}};}},documentElement:{classList:{contains:()=>false}},startViewTransition(){throw Error('Snapshot must not block canvas or provider rendering');}};
 try{
  const {transitionPage}=await import('../app/page-transition.js');
  const pending=transitionPage(()=>{rendered=true;return new Promise(resolve=>{resolveContent=resolve;});});
  assert.equal(rendered,true);assert.equal(fades,0);
  await transitionPage(()=>{});assert.equal(fades,1);
  resolveContent();await pending;assert.equal(fades,1,'Stale provider completion must not animate the newer page');
  await assert.rejects(transitionPage(async()=>{throw Error('Provider failed');}),/Provider failed/);assert.equal(cancelled,1);
  global.document.visibilityState='hidden';await transitionPage(()=>{});assert.equal(fades,1);
 }finally{global.document=saved.document;global.matchMedia=saved.matchMedia;}
});
function harness({splash=true,reduced=false,hidden=false,appReduced=false}={}){
 const vm=require('node:vm'),fs=require('node:fs');let fades=0;
 const context={document:{visibilityState:hidden?'hidden':'visible',querySelector:s=>s==='.dz-intro'?(splash?{}:null):{animate(){fades++;return{cancel(){}};}},body:{classList:{contains:()=>appReduced}},documentElement:{classList:{contains:()=>false}},startViewTransition(){throw Error('Unexpected snapshot');}},matchMedia:()=>({matches:reduced})};
 vm.createContext(context);vm.runInContext(fs.readFileSync('app/page-transition.js','utf8').replace('export async function','async function'),context);
 return {render:fn=>context.transitionPage(fn),dismiss:()=>{splash=false;},fades:()=>fades};
}
test('startup and splash exit render without an overlaid animation',async()=>{
 const s=harness();let renders=0;await s.render(()=>renders++);await s.render(()=>renders++);assert.equal(renders,2);assert.equal(s.fades(),0);
 s.dismiss();await s.render(()=>renders++);assert.equal(renders,3);assert.equal(s.fades(),1);
});
test('normal navigation fades while OS and app reduced-motion preferences skip it',async()=>{
 const normal=harness({splash:false});await normal.render(()=>{});assert.equal(normal.fades(),1);
 for(const option of [{reduced:true},{appReduced:true}]){const s=harness({splash:false,...option});let rendered=false;await s.render(()=>{rendered=true;});assert.equal(rendered,true);assert.equal(s.fades(),0);}
});
test('hidden pages still render without starting an animation',async()=>{
 const hidden=harness({splash:false,hidden:true});let rendered=0;await hidden.render(()=>rendered++);assert.equal(rendered,1);assert.equal(hidden.fades(),0);
});
