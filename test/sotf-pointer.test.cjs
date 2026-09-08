const {test}=require('node:test');
const assert=require('node:assert/strict');

test('Map icons can be selected within their visible marker size',async()=>{
  const {ForestMap}=await import('../app/sotf-map.js');
  const point={id:1,x:0,y:0,title:'Cave'};
  const map=Object.assign(Object.create(ForestMap.prototype),{getLocations:()=>[point],camera:{x:0,y:0,scale:1},width:200,height:200});
  assert.equal(map.hit({x:100,y:100}),point);
  assert.equal(map.hit({x:113,y:100}),point);
  assert.equal(map.hit({x:120,y:100}),undefined);
});

test('Clicking opens details with dragging cleared; lost capture and released buttons stop panning',async()=>{
  const {ForestMap}=await import('../app/sotf-map.js');
  const originals={ResizeObserver:global.ResizeObserver,devicePixelRatio:global.devicePixelRatio,requestAnimationFrame:global.requestAnimationFrame,cancelAnimationFrame:global.cancelAnimationFrame};
  global.ResizeObserver=class{observe(){} disconnect(){}};global.devicePixelRatio=1;global.requestAnimationFrame=()=>1;global.cancelAnimationFrame=()=>{};
  class Canvas extends EventTarget{style={};captured=false;getContext(){return {}}getBoundingClientRect(){return {left:0,top:0,width:200,height:200}}focus(){}setPointerCapture(){this.captured=true}hasPointerCapture(){return this.captured}releasePointerCapture(){this.captured=false}}
  const canvas=new Canvas(),point={id:1,x:0,y:0};let selected;
  const emit=(type,extra={})=>canvas.dispatchEvent(Object.assign(new Event(type),{pointerId:1,button:0,buttons:1,clientX:100,clientY:100,...extra}));
  let map;
  try{
    map=new ForestMap(canvas,{getLocations:()=>[point],getFound:()=>[],getColor:()=> '#fff',onSelect:id=>{assert.equal(map.drag,null);selected=id;}});
    emit('pointerdown');emit('pointerup',{buttons:0});assert.equal(selected,1);assert.equal(canvas.captured,false);
    const before={...map.camera};emit('pointermove',{buttons:0,clientX:150});assert.deepEqual(map.camera,before);
    emit('pointerdown');emit('lostpointercapture');assert.equal(map.drag,null);
    emit('pointerdown');emit('pointermove',{buttons:0,clientX:160});assert.equal(map.drag,null);assert.deepEqual(map.camera,before);
    selected=null;emit('pointerdown');emit('pointermove',{clientX:130});emit('pointerup',{buttons:0,clientX:130});assert.equal(selected,null);assert.equal(map.drag,null);assert.notEqual(map.camera.x,before.x);
  }finally{map?.destroy();Object.assign(global,originals);}
});
