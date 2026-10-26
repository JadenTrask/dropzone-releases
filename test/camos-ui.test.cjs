const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const catalog=require('../app/data/cod/mw4-camos.json');
const setup=async()=>{
 const dom=new JSDOM('<div id="hub-app"></div><div id="toast"></div>',{url:'http://localhost'});
 global.window=dom.window;global.document=dom.window.document;global.localStorage=dom.window.localStorage;
 const ui=await import('../app/camos-ui.js'),model=await import('../app/camos-model.js');
 const click=selector=>document.querySelector(selector).click();
 const change=(selector,value)=>{const input=document.querySelector(selector);input.value=value;input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
 return {dom,ui,model,click,change};
};

test('shared weapon tab shows both requirements and restores unlocks after visiting mastery',async()=>{
 const {dom,ui,model,click}=await setup();
 try{
  ui.mountCamos();click('[data-camo-view="weapons"]');click('[data-camo-weapon="han-86"]');
  assert.deepEqual([...document.querySelectorAll('[data-camo-view]')].map(b=>b.textContent),['Weapon camos','Multiplayer mastery','DMZ mastery']);
  assert.equal(document.querySelector('[data-camo-mode]'),null);
  assert.match(document.querySelector('#camo-detail').textContent,/Get 20 Kills while Mounted against Players/);
  assert.match(document.querySelector('#camo-detail').textContent,/Get 75 Enemy Kills while Mounted against Enemies/);
  assert.equal(document.querySelectorAll('#camo-detail .camo-requirements').length,6);
  click('#camo-han-86-gold');assert.equal(document.querySelectorAll('#camo-detail input:checked').length,12);
  click('[data-camo-view="dmz"]');click('[data-camo-view="weapons"]');
  assert.equal(document.querySelector('#camo-han-86-gold').checked,true);
  ui.mountCamos();assert.equal(document.querySelector('#camo-han-86-gold').checked,true);assert.equal(model.camoTotals(catalog,model.readProgress(localStorage)).gold,1);
 }finally{dom.window.close();}
});

test('one checkbox per mastery camo stays separate by mode and survives remounting',async()=>{
 const {dom,ui,click}=await setup();
 try{
  ui.mountCamos();click('[data-camo-view="mp"]');
  assert.equal(document.querySelectorAll('[data-camo-mastery][type="checkbox"]').length,3);assert.equal(document.querySelectorAll('input[type="number"]').length,0);
  click('[data-camo-mastery="mercurial-drift"]');click('[data-camo-view="dmz"]');assert.equal(document.querySelector('[data-camo-mastery="chiral"]').checked,false);
  click('[data-camo-mastery="chiral"]');ui.mountCamos();assert.equal(document.querySelector('[data-camo-mastery="chiral"]').checked,true);
  click('[data-camo-view="mp"]');assert.equal(document.querySelector('[data-camo-mastery="mercurial-drift"]').checked,true);
  click('[data-camo-mastery="mercurial-drift"]');assert.equal(document.querySelector('[data-camo-mastery="mercurial-drift"]').checked,false);
 }finally{dom.window.close();}
});

test('storage failure does not claim or display a saved unlock, and damaged saves stay untouched',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {dom,ui,model,click}=await setup();
 try{
  ui.mountCamos();click('[data-camo-view="weapons"]');click('[data-camo-weapon="han-86"]');
  global.localStorage={getItem:()=>null,setItem(){throw new Error('Full');}};
  click('#camo-han-86-gold');assert.equal(document.querySelector('#camo-han-86-gold').checked,false);assert.match(document.querySelector('#camo-save-status').textContent,/not saved/);
  global.localStorage=dom.window.localStorage;localStorage.setItem(model.CAMO_STORAGE_KEY,'damaged');ui.mountCamos();
  assert.equal(document.querySelector('#camo-han-86-gold').disabled,true);assert.equal(localStorage.getItem(model.CAMO_STORAGE_KEY),'damaged');assert.match(document.querySelector('#camo-save-status').textContent,/Editing is paused/);
 }finally{dom.window.close();}
});

test('search and class filtering leave earned progress intact',async()=>{
 const {dom,ui,click,change}=await setup();
 try{
  ui.mountCamos();click('[data-camo-view="weapons"]');
  assert.equal(document.querySelectorAll('.camo-list-group').length,9);
  click('[data-camo-weapon="m4"]');assert.equal(document.querySelector('.camo-weapon-heading h2').textContent,'M4');
  const search=document.querySelector('#camo-search');search.value='Han';search.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(document.querySelectorAll('[data-camo-weapon]').length,1);
  assert.equal(document.querySelectorAll('.camo-list-group').length,1);assert.match(document.querySelector('.camo-list-group').textContent,/Assault Rifle/);
  change('#camo-category','Sniper');assert.equal(document.querySelectorAll('[data-camo-weapon]').length,0);
 }finally{dom.window.close();}
});
