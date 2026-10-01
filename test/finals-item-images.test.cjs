const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const catalog=require('../app/data/finals/item-images.json');
const builds=require('../app/data/finals/finals-ranked.json').builds;

test('every bundled loadout item resolves to its own verified local game image',async()=>{
  const {finalsItemImage}=await import('../app/finals-item-images.js');
  const names=new Set(builds.flatMap(b=>[...b.weapons,b.specialization,...b.gadgets,...b.alternatives]));
  for(const name of names){
    const item=finalsItemImage(name);assert.ok(item?.path,name);
    assert.match(item.pageUrl,/^https:\/\/www\.thefinals\.wiki\/wiki\//);
    const bytes=fs.readFileSync(path.join(__dirname,'../app',item.path));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256,name);
  }
  assert.notEqual(finalsItemImage('ShAK-50').path,finalsItemImage('SA1216').path);
  assert.equal(finalsItemImage('Chimera XB'),finalsItemImage('Chimera-XB'));
  assert.equal(finalsItemImage('Charge N Slam'),finalsItemImage("Charge 'N' Slam"));
  assert.equal(Object.values(catalog.items).filter(x=>x.path).length,85);
});

test('unknown and broken images show an honest unavailable state and retain the equipment name',async()=>{
  const {JSDOM}=require('jsdom');
  const {itemImagery,itemImageError,finalsItemImage}=await import('../app/finals-item-images.js');
  assert.equal(finalsItemImage('constructor'),null);
  assert.match(itemImagery('Future weapon'),/Image unavailable/);
  assert.doesNotMatch(itemImagery('Future weapon'),/<svg|<img/);
  assert.match(itemImagery('<unknown>'),/&lt;unknown&gt;/);
  const dom=new JSDOM(itemImagery('ShAK-50'));
  const image=dom.window.document.querySelector('img');
  assert.equal(image.alt,'');
  itemImageError({target:image});
  assert.equal(image.hidden,true);
  assert.equal(dom.window.document.querySelector('.fn-item-unavailable').hidden,false);
  assert.equal(image.parentElement.dataset.finalsItem,'ShAK-50');
  dom.window.close();
});
