const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function harness({splash=true,reduced=false,hidden=false,abortReady=false}={}){
 let transitions=0;
 const context={document:{visibilityState:hidden?'hidden':'visible',querySelector:()=>splash?{}:null,documentElement:{classList:{contains:()=>false}},startViewTransition:render=>{transitions++;const done=Promise.resolve().then(render);return {ready:abortReady?Promise.reject(new Error('Document hidden')):done,updateCallbackDone:done,finished:done,skipTransition(){}};}},matchMedia:()=>({matches:reduced})};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('app/page-transition.js','utf8').replace('export async function','async function'),context);
 return {render:fn=>context.transitionPage(fn),dismiss:()=>{splash=false;},transitions:()=>transitions};
}
test('startup renders behind the splash without an overlaid page transition',async()=>{
 const s=harness();let renders=0;
 await s.render(async()=>{renders++;});
 assert.equal(renders,1);assert.equal(s.transitions(),0);
 // Keep bypassing during the splash exit, not just the first route.
 await s.render(()=>{renders++;});
 assert.equal(renders,2);assert.equal(s.transitions(),0);
 s.dismiss();await s.render(()=>{renders++;});
 assert.equal(renders,3);assert.equal(s.transitions(),1);
});
test('normal navigation retains the crossfade and reduced motion skips it',async()=>{
 const s=harness({splash:false});await s.render(()=>{});assert.equal(s.transitions(),1);
 const reduced=harness({splash:false,reduced:true});let rendered=false;
 await reduced.render(()=>{rendered=true;});assert.equal(rendered,true);assert.equal(reduced.transitions(),0);
});
test('hidden pages render without snapshots and an aborted snapshot does not reject successful navigation',async()=>{
 const hidden=harness({splash:false,hidden:true});let rendered=0;await hidden.render(()=>rendered++);assert.equal(hidden.transitions(),0);
 const interrupted=harness({splash:false,abortReady:true});await interrupted.render(()=>rendered++);assert.equal(rendered,2);
 await new Promise(resolve=>setImmediate(resolve));
});
