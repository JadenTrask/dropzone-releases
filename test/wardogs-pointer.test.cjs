const {test}=require('node:test'),assert=require('node:assert/strict');
test('Placement clicks commit once, gun lock holds, every drag pans and lost release never sticks',async()=>{
  const {WardogsMap}=await import('../app/wardogs-map.js'),definition=require('../app/data/wardogs/maps.json').maps[0];
  const originals={ResizeObserver:global.ResizeObserver,window:global.window,requestAnimationFrame:global.requestAnimationFrame,cancelAnimationFrame:global.cancelAnimationFrame};
  global.ResizeObserver=class{observe(){}disconnect(){}};global.window={devicePixelRatio:1,matchMedia:()=>({matches:true})};global.requestAnimationFrame=()=>1;global.cancelAnimationFrame=()=>{};
  class Canvas extends EventTarget{dataset={};captured=false;getContext(){return {}}getBoundingClientRect(){return {left:0,top:0,width:800,height:600}}focus(){}setPointerCapture(){this.captured=true}hasPointerCapture(){return this.captured}releasePointerCapture(){this.captured=false}}
  const canvas=new Canvas(),state={tool:'origin',lockOrigin:false},placements=[];
  const emit=(type,extra={})=>canvas.dispatchEvent(Object.assign(new Event(type),{pointerId:1,pointerType:'mouse',button:0,buttons:1,clientX:400,clientY:300,...extra}));
  let map;
  try{map=new WardogsMap(canvas,{map:definition,getState:()=>state,onPoint:(key,p)=>{placements.push(key);state[key]=p;if(key==='origin'){state.tool='target';state.lockOrigin=true}}});
    emit('pointerdown');emit('pointerup',{buttons:0});assert.deepEqual(placements,['origin']);const gun={...state.origin};
    emit('pointerdown');emit('pointerup',{buttons:0});assert.deepEqual(placements,['origin','target']);assert.deepEqual(state.origin,gun);
    const camera={...map.camera};emit('pointerdown');emit('pointermove',{clientX:450});emit('pointerup',{buttons:0,clientX:450});assert.equal(placements.length,2);assert.notEqual(map.camera.x,camera.x);
    emit('pointerdown');emit('pointerup',{buttons:0,clientX:500});assert.equal(placements.length,2);
    emit('pointerdown');emit('lostpointercapture');assert.equal(map.drag,null);
    emit('pointerdown');emit('pointermove',{buttons:0});assert.equal(map.drag,null);
    state.tool='origin';emit('pointerdown');emit('pointerup',{buttons:0});assert.equal(placements.length,2);
    state.lockOrigin=false;emit('pointerdown');emit('pointerup',{buttons:0});assert.equal(placements.length,3);
    emit('pointerdown');emit('pointercancel');assert.equal(map.drag,null);assert.equal(canvas.dataset.dragging,undefined);
  }finally{map?.destroy();Object.assign(global,originals)}
});
