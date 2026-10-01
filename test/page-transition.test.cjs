const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function harness(options={}){
 const element=()=>{const attributes=new Map();return{isConnected:true,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),hasAttribute:k=>attributes.has(k)};};
 const transitions=[],classes=new Set(options.legacyReduced?['cc-reduced-motion']:[]);
 const document={visibilityState:options.hidden?'hidden':'visible',querySelector:()=>options.splash?{}:null,documentElement:{classList:{contains:key=>classes.has(key),add:key=>classes.add(key),remove:key=>classes.delete(key)}},body:{classList:{contains:()=>!!options.appReduced}}};
 Object.assign(document.documentElement,element());
 if(!options.unsupported)document.startViewTransition=update=>{
  if(options.apiThrows)throw Error('Capture unavailable');
  const ready=deferred(),done=deferred(),finished=deferred();
  const t={ready:ready.promise,updateCallbackDone:done.promise,finished:finished.promise,skips:0,
   skipTransition(){this.skips++;ready.reject(Error('Animation skipped'));},
   run(){const result=update();done.resolve();ready.resolve();return result;},
   end(){finished.resolve();},failAnimation(){ready.reject(Error('Document hidden'));finished.reject(Error('Animation abandoned'));}};
  transitions.push(t);return t;
 };
 const context={document,matchMedia:()=>({matches:!!options.reduced})};vm.createContext(context);
 vm.runInContext(fs.readFileSync('app/page-transition.js','utf8').replace('export async function','async function'),context);
 return {render:(fn,options)=>context.transitionPage(fn,options),transitions,document,element};
}

test('content-only snapshots exclude the shell and release their scope on interruption and completion',async()=>{
 const h=harness(),a=h.element(),b=h.element();
 const first=h.render(()=>1,{target:a});assert.equal(a.hasAttribute('data-dz-transition-root'),true);
 const second=h.render(()=>2,{target:b});assert.equal(a.hasAttribute('data-dz-transition-root'),false);assert.equal(b.hasAttribute('data-dz-transition-root'),true);
 h.transitions[0].run();h.transitions[1].run();h.transitions[0].end();await first;
 assert.equal(h.document.documentElement.hasAttribute('data-dz-transition-scoped'),true,'Stale completion keeps the current scope');
 h.transitions[1].end();await second;await Promise.resolve();
 assert.equal(b.hasAttribute('data-dz-transition-root'),false);assert.equal(h.document.documentElement.hasAttribute('data-dz-transition-scoped'),false);
 const failed=harness({apiThrows:true}),target=failed.element();await failed.render(()=>3,{target});assert.equal(target.hasAttribute('data-dz-transition-root'),false);assert.equal(failed.document.documentElement.hasAttribute('data-dz-transition-scoped'),false);
});
test('the crossfade callback settles independently of slow provider work',async()=>{
 const h=harness(),provider=deferred();let mounted=false,completed=false;
 const route=h.render(()=>{mounted=true;return provider.promise;}).then(value=>{completed=true;return value;});
 assert.equal(mounted,false,'Capture the outgoing view before changing its DOM');
 assert.equal(h.transitions[0].run(),undefined,'Never return the provider promise to Chromium');
 assert.equal(mounted,true);await h.transitions[0].ready;h.transitions[0].end();await Promise.resolve();
 assert.equal(h.document.documentElement.classList.contains('dz-transitioning'),false,'Release the snapshot root so live glass can sample its backdrop again');
 assert.equal(completed,false,'Animation can finish while data is still loading');
 provider.resolve('loaded');assert.equal(await route,'loaded');
});
test('rapid navigation skips stale callbacks without mounting the wrong workspace',async()=>{
 const h=harness(),mounted=[];
 const first=h.render(()=>mounted.push('old')),second=h.render(()=>mounted.push('latest'));
 assert.equal(h.transitions[0].skips,1);h.transitions[0].run();h.transitions[1].run();
 await Promise.all([first,second]);assert.deepEqual(mounted,['latest']);
 h.transitions[0].end();await Promise.resolve();const third=h.render(()=>mounted.push('third'));
 assert.equal(h.transitions[1].skips,1,'An old completion cannot clear the current animation');
 h.transitions[2].run();h.transitions[1].end();h.transitions[2].end();await third;
});
test('startup, hidden pages, unsupported browsers and all reduced-motion preferences render directly',async()=>{
 for(const options of [{splash:true},{hidden:true},{unsupported:true},{reduced:true},{appReduced:true},{legacyReduced:true}]){
  const h=harness(options);let mounted=0;assert.equal(await h.render(()=>++mounted),1);assert.equal(mounted,1);assert.equal(h.transitions.length,0);
 }
});
test('render errors propagate once while optional animation failures are consumed',async()=>{
 for(const render of [()=>{throw Error('Render failed');},()=>Promise.reject(Error('Render failed'))]){
  const h=harness(),route=h.render(render);const rejected=assert.rejects(route,/Render failed/);
  h.transitions[0].run();h.transitions[0].failAnimation();await rejected;
 }
 const h=harness();const route=h.render(()=>42);h.transitions[0].run();h.transitions[0].failAnimation();assert.equal(await route,42);
});
test('a synchronous browser capture failure falls back to one immediate render',async()=>{
 const h=harness({apiThrows:true});let mounts=0;assert.equal(await h.render(()=>++mounts),1);assert.equal(mounts,1);
});
