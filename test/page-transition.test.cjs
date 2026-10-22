const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function harness(options={}){
 const animations=[];let target;
 const document={visibilityState:options.hidden?'hidden':'visible',querySelector:selector=>selector==='.dz-intro'?(options.splash?{}:null):target,documentElement:{classList:{contains:()=>!!options.legacyReduced}},body:{classList:{contains:()=>!!options.appReduced}},startViewTransition:()=>{throw Error('Screen capture must never be used');}};
 const context={document,matchMedia:()=>({matches:!!options.reduced})};vm.createContext(context);
 vm.runInContext(fs.readFileSync('app/page-transition.js','utf8').replace('export async function','async function'),context);
 return {render:(fn,options)=>context.transitionPage(fn,options),animations,setTarget(){target={isConnected:true,animate(frames,timing){if(options.apiThrows)throw Error('Animation unavailable');const done=deferred();const animation={frames,timing,finished:done.promise,cancels:0,cancel(){this.cancels++;done.reject(Error('Cancelled'));}};animations.push(animation);return animation;}};return target;}};
}
test('Rocket League fades only opacity on the newly rendered live content',async()=>{
 const h=harness(),old=h.setTarget();let incoming;
 assert.equal(await h.render(()=>{incoming=h.setTarget();return 42;},{target:'#rl-content'}),42);
 assert.notEqual(incoming,old);assert.deepEqual(JSON.parse(JSON.stringify(h.animations[0].frames)),[{opacity:0},{opacity:1}]);
 assert.equal(h.animations[0].timing.duration,180);
});
test('whole-screen navigation renders immediately without capturing glass or animating layout',async()=>{
 const h=harness();h.setTarget();let mounted=false;
 const result=h.render(()=>{mounted=true;return 'ready';});assert.equal(mounted,true);assert.equal(await result,'ready');assert.equal(h.animations.length,0);
});
test('rapid selection cancels the prior fade and a late provider cannot start an outdated fade',async()=>{
 const h=harness(),provider=deferred();h.setTarget();
 await h.render(()=>1,{target:'#loadout-detail .weapon-build'});
 const slow=h.render(()=>provider.promise,{target:'#rl-content'});assert.equal(h.animations[0].cancels,1);
 await h.render(()=>2,{target:'#rl-content'});provider.resolve('late');assert.equal(await slow,'late');assert.equal(h.animations.length,2);
});
test('hidden pages, startup and reduced-motion preferences skip the fade',async()=>{
 for(const options of [{splash:true},{hidden:true},{reduced:true},{appReduced:true},{legacyReduced:true}]){
  const h=harness(options);h.setTarget();assert.equal(await h.render(()=>3,{target:'#rl-content'}),3);assert.equal(h.animations.length,0);
 }
});
test('missing targets and unavailable animation still render, while rendering errors propagate once',async()=>{
 const missing=harness();assert.equal(await missing.render(()=>4,{target:'#rl-content'}),4);
 const unsupported=harness({apiThrows:true});unsupported.setTarget();assert.equal(await unsupported.render(()=>5,{target:'#rl-content'}),5);
 for(const render of [()=>{throw Error('Render failed');},()=>Promise.reject(Error('Render failed'))])await assert.rejects(harness().render(render),/Render failed/);
});
