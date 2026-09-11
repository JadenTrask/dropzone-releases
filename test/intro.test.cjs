const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function intro({native=false,reduced=false}={}){
 const events={},timers=[],classes=new Set();let removed=false,startNative,src;
 const overlay={setAttribute(){},classList:{add:v=>classes.add(v)},querySelector:()=>({set src(v){src=v;}}),remove(){removed=true;}};
 const context={URLSearchParams,location:{search:'?intro=1'},matchMedia:()=>({matches:reduced}),document:{createElement:()=>overlay,body:{append(){}}},window:{rift:native?{desktop:true,onStartupReveal:fn=>startNative=fn}:null,addEventListener:(name,fn)=>events[name]=fn},setTimeout:(fn,ms)=>timers.push({fn,ms})};
 vm.runInNewContext(fs.readFileSync('app/intro.js','utf8'),context);
 return {classes,ready:()=>events['dropzone-page-ready'](),start:()=>startNative(),src:()=>src,removed:()=>removed,fire:ms=>{for(const timer of [...timers])if(timer.ms===ms&&!timer.fired){timer.fired=true;timer.fn();}}};
}
test('intro cannot reveal the temporary library before the destination is ready',()=>{
 const s=intro();s.fire(2050);assert.ok(!s.classes.has('dz-intro-leave'));s.ready();assert.ok(s.classes.has('dz-intro-leave'));s.fire(650);assert.equal(s.removed(),true);
});
test('ready destination remains behind the ident until animation finishes',()=>{
 const s=intro();s.ready();assert.ok(!s.classes.has('dz-intro-leave'));s.fire(2050);assert.ok(s.classes.has('dz-intro-leave'));
});
test('native animation starts on the visible window event, not during hidden loading',()=>{
 const s=intro({native:true});assert.equal(s.src(),undefined);s.ready();s.start();assert.match(s.src(),/dropzone-intro.webp/);s.fire(2050);assert.ok(s.classes.has('dz-intro-leave'));
});
test('reduced motion skips animation but still waits for the destination',()=>{
 const s=intro({reduced:true});assert.equal(s.src(),undefined);s.fire(0);assert.ok(!s.classes.has('dz-intro-leave'));s.ready();s.fire(0);assert.ok(s.removed());
});
test('failed boot or lost IPC has a bounded recovery',()=>{
 const s=intro({native:true});s.fire(10000);assert.ok(s.classes.has('dz-intro-leave'));s.fire(650);assert.ok(s.removed());
});
const {EventEmitter}=require('node:events');
test('preload remembers a display event that arrives before the intro subscribes',()=>{
 const ipc=new EventEmitter();let bridge;
 vm.runInNewContext(fs.readFileSync('desktop/preload.cjs','utf8'),{require:()=>({ipcRenderer:ipc,contextBridge:{exposeInMainWorld:(_name,value)=>bridge=value}})});
 ipc.emit('startup-reveal');let calls=0;bridge.onStartupReveal(()=>calls++);assert.equal(calls,1);
});
