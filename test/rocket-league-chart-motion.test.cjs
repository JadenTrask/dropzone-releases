const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
global.window={};

function environment(){
  const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),win=dom.window,frames=new Map(),timers=new Map(),observers=[];
  let id=0;
  win.requestAnimationFrame=cb=>{frames.set(++id,cb);return id;};win.cancelAnimationFrame=i=>frames.delete(i);
  win.setTimeout=cb=>{timers.set(++id,cb);return id;};win.clearTimeout=i=>timers.delete(i);
  win.IntersectionObserver=class{constructor(callback){this.callback=callback;this.targets=new Set();observers.push(this);}observe(target){this.targets.add(target);}unobserve(target){this.targets.delete(target);}disconnect(){this.targets.clear();}};
  const flush=now=>{const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(now);};
  return {dom,win,frames,timers,observers,flush};
}
const fixture=()=>({profile:{handle:'player'},records:[{played_at:new Date().toISOString(),won:true,stats:{PlaylistId:11,Goals:2,Assists:1,Saves:3,Shots:5,Score:480}}]});

test('profile entrances wait for visibility, complete, and leave no animation frame running',async()=>{
  const {playerProfileUI}=await import('../app/rocket-league-player-profile.js'),{mountProfileMotion,resetProfileMotion}=await import('../app/rocket-league-chart-motion.js');
  resetProfileMotion();const qa=environment(),root=qa.win.document.querySelector('main');root.innerHTML=playerProfileUI(fixture());
  const cleanup=mountProfileMotion(root),observer=qa.observers[0],summary=root.querySelector('[data-motion-section=summary]');
  assert.equal(qa.frames.size,0,'off-screen charts do not schedule frames');assert.equal(summary.querySelector('[data-count]').textContent,'0');
  observer.callback([{target:summary,isIntersecting:true}]);assert.equal(qa.frames.size,1);assert.equal(observer.targets.has(summary),false);
  qa.flush(0);qa.flush(390);const partial=Number(summary.querySelector('[data-count="100"]').textContent.replace('%',''));assert.ok(partial>0&&partial<100);
  qa.flush(800);assert.equal(qa.frames.size,0,'counter stops at its final value');assert.equal(summary.querySelector('[data-count="100"]').textContent,'100%');
  for(const callback of qa.timers.values())callback();qa.timers.clear();assert.ok(summary.classList.contains('rl-motion-complete'));
  cleanup();assert.equal(observer.targets.size,0);assert.equal(qa.frames.size,0);assert.equal(qa.timers.size,0);qa.dom.window.close();
});

test('unrelated profile rerenders do not replay entered animations and cleanup cancels work',async()=>{
  const {playerProfileUI}=await import('../app/rocket-league-player-profile.js'),{mountProfileMotion,resetProfileMotion}=await import('../app/rocket-league-chart-motion.js');
  resetProfileMotion();const qa=environment(),root=qa.win.document.querySelector('main');root.innerHTML=playerProfileUI(fixture());
  let cleanup=mountProfileMotion(root),summary=root.querySelector('[data-motion-section=summary]');qa.observers[0].callback([{target:summary,isIntersecting:true}]);assert.equal(qa.frames.size,1);cleanup();assert.equal(qa.frames.size,0);assert.equal(qa.timers.size,0);
  root.innerHTML=playerProfileUI(fixture());cleanup=mountProfileMotion(root);summary=root.querySelector('[data-motion-section=summary]');assert.ok(summary.classList.contains('rl-motion-complete'));assert.equal(summary.querySelector('[data-count]').textContent,'1');assert.equal(qa.frames.size,0);
  assert.ok(qa.observers[1].targets.has(root.querySelector('[data-motion-section=style]')),'previously hidden chart can still animate later');cleanup();qa.dom.window.close();
});

test('reduced motion presents final values immediately; keyboard tooltips remain readable',async()=>{
  const {playerProfileUI}=await import('../app/rocket-league-player-profile.js'),{mountProfileMotion,resetProfileMotion}=await import('../app/rocket-league-chart-motion.js');
  resetProfileMotion();const qa=environment(),root=qa.win.document.querySelector('main');qa.win.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});root.innerHTML=playerProfileUI(fixture());
  const cleanup=mountProfileMotion(root);assert.equal(qa.frames.size,0);assert.equal(qa.timers.size,0);assert.equal(root.querySelector('[data-count="100"]').textContent,'100%');
  const point=root.querySelector('[data-chart-point]');point.dispatchEvent(new qa.win.FocusEvent('focusin',{bubbles:true}));const tip=point.closest('.rl-chart-card').querySelector('[role=tooltip]');assert.equal(tip.hidden,false);assert.match(tip.textContent,/Goals2/);assert.match(point.getAttribute('aria-label'),/2 goals/);
  point.dispatchEvent(new qa.win.FocusEvent('focusout',{bubbles:true}));assert.equal(tip.hidden,true);cleanup();qa.dom.window.close();
});

test('profile match cards retain all statistics without requiring a wide table',async()=>{
  const {playerProfileUI}=await import('../app/rocket-league-player-profile.js');const data=fixture();data.records[0].stats.CarTouches=7;data.records[0].stats.TimesDemolished=2;
  const dom=new JSDOM(playerProfileUI(data,{tab:'matches'})),card=dom.window.document.querySelector('.rl-profile-match');assert.ok(card.querySelector('summary'));assert.equal(card.querySelectorAll('dl>div').length,11);assert.match(card.textContent,/Car touches7/);assert.match(card.textContent,/Times demolished2/);assert.equal(dom.window.document.querySelector('table'),null);dom.window.close();
});
