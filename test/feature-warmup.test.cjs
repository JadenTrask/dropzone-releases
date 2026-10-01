const {test}=require('node:test'),assert=require('node:assert/strict');
test('idle warmup is bounded, local-only, visibility-aware and cancellable',async()=>{
 const {scheduleFeatureWarmup}=await import('../app/feature-warmup.js');const idle=[],timers=[],loaded=[];let listener;
 const host={setTimeout:fn=>(timers.push(fn),1),clearTimeout(){},requestIdleCallback:fn=>(idle.push(fn),idle.length),cancelIdleCallback(){}};
 const doc={hidden:false,addEventListener(_event,fn){listener=fn;},removeEventListener(){listener=null;}};
 const stop=scheduleFeatureWarmup({host,document:doc,preferred:['gzw-ui','sotf-ui','apex-ui','apex-ui'],load:async m=>loaded.push(m)});
 assert.deepEqual(loaded,[]);timers.shift()();await idle.shift()({timeRemaining:()=>0});assert.deepEqual(loaded,[]);
 doc.hidden=true;await idle.shift()({timeRemaining:()=>50});assert.deepEqual(loaded,[]);
 doc.hidden=false;listener();await idle.shift()({timeRemaining:()=>50});await idle.shift()({timeRemaining:()=>50});
 assert.deepEqual(loaded,['apex-ui','finals-ui']);assert.equal(idle.length,0);stop();assert.equal(listener,null);
});
test('cancelled warmup cannot start pending work',async()=>{const {scheduleFeatureWarmup}=await import('../app/feature-warmup.js');let start,called=0;const stop=scheduleFeatureWarmup({load:async()=>called++,host:{setTimeout:fn=>(start=fn,1),clearTimeout(){},requestIdleCallback(){throw Error('Unexpected idle work');}},document:{hidden:false,addEventListener(){},removeEventListener(){}}});stop();start();assert.equal(called,0);});
