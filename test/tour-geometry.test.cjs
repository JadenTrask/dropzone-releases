const {test} = require('node:test');
const assert = require('node:assert/strict');
test('tutorial connectors land on edge midpoints, never the clamped corner', async () => {
  const {tourConnection} = await import('../app/tour-geometry.js');
  const target = {left:40, top:100, right:240, bottom:150};
  for (const [card, expected, side] of [
    [{left:270, top:105, right:610, bottom:450}, {x:240,y:125}, 'right'],
    [{left:-350, top:105, right:10, bottom:450}, {x:40,y:125}, 'left'],
    [{left:20, top:180, right:360, bottom:520}, {x:140,y:150}, 'bottom'],
    [{left:20, top:-300, right:360, bottom:70}, {x:140,y:100}, 'top']
  ]) {
    const result = tourConnection(target, card);
    assert.deepEqual(result.end, expected);
    assert.equal(result.side, side);
    assert.ok(result.start.x >= card.left && result.start.x <= card.right);
    assert.ok(result.start.y >= card.top && result.start.y <= card.bottom);
  }
});
test('tutorial placement remains bounded after resize and handles a map surrounding the card', async () => {
  const {tourPlacement,tourConnection} = await import('../app/tour-geometry.js');
  const target = {left:30,top:40,right:1100,bottom:740};
  const card = {width:340,height:300};
  for (const viewport of [{width:1280,height:800},{width:400,height:700}]) {
    const p = tourPlacement(target, viewport, card);
    assert.ok(p.x>=16 && p.x+card.width<=viewport.width-16);
    assert.ok(p.y>=16 && p.y+card.height<=viewport.height-16);
    const {start,end} = tourConnection(target,{left:p.x,top:p.y,right:p.x+card.width,bottom:p.y+card.height});
    assert.ok([start.x,start.y,end.x,end.y].every(Number.isFinite));
  }
});
