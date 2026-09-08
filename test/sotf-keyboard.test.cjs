const {test}=require('node:test');
const assert=require('node:assert/strict');

async function map(){
  const {ForestMap}=await import('../app/sotf-map.js');
  return Object.assign(Object.create(ForestMap.prototype),{camera:{x:140,y:-75,scale:1},width:900,height:700,minScale:.2,draw(){}});
}

test('Island map leaves modified text-size shortcuts to the application',async()=>{
  const view=await map(),initial={...view.camera};
  for(const modifier of ['ctrlKey','metaKey','altKey'])for(const key of ['+','=','-','0','ArrowLeft']){
    let prevented=false;
    view.key({key,[modifier]:true,preventDefault(){prevented=true;}});
    assert.deepEqual(view.camera,initial,`${modifier} ${key} must not move the map`);
    assert.equal(prevented,false,'Application shortcuts must remain available');
  }
});

test('Island map retains unmodified zoom, pan and fit shortcuts',async()=>{
  const view=await map();let prevented=0;
  const press=key=>view.key({key,preventDefault(){prevented++;}});
  press('+');assert.equal(view.camera.scale,1.4);
  press('-');assert.equal(view.camera.scale,1);
  press('ArrowLeft');assert.equal(view.camera.x,60);
  press('ArrowUp');assert.equal(view.camera.y,5);
  press('0');assert.deepEqual(view.camera,{x:0,y:0,scale:.2});
  assert.equal(prevented,5);
});
