const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const base=require('../app/data/finals/finals-ranked.json'),teamPresets=require('../app/data/finals/teams.json');
const wait=()=>new Promise(resolve=>setImmediate(resolve));

test('THE FINALS redesigned workbench preserves loadout, team, source and recovery behavior',async t=>{
  const dom=new JSDOM('<div id="hub-app"></div><div id="toast"></div>',{url:'http://localhost',pretendToBeVisual:true});
  const win=dom.window;global.window=win;global.document=win.document;global.localStorage=win.localStorage;
  const nativeSetTimeout=global.setTimeout,toastTimers=[];global.setTimeout=(callback,ms,...args)=>{const timer=nativeSetTimeout(callback,ms,...args);if(ms===5000)toastTimers.push(timer);return timer;};
  let mode='normal',copies=[],copyReject=false,requests=[];
  const data=()=>({...structuredClone(base),game:'finals',teamPresets:structuredClone(teamPresets),freshness:{level:'warning',message:'New balance update needs a build review.'},official:{season:11,latest:{patch:'11.8.0'},gameplay:{patch:'11.8.0'},fetchedAt:new Date().toISOString()}});
  win.rift={loadouts:async options=>{requests.push(options);if(mode==='error')throw new Error('Network unavailable');const d=data();if(mode==='empty')d.builds=[];if(mode==='no-teams')d.teamPresets.teams=[];if(mode==='invalid-team')d.builds=d.builds.filter(b=>b.id!=='mesh-fortress');return d;},copy:async text=>{if(copyReject)throw new Error('Clipboard unavailable');copies.push(text);}};
  const ui=await import('../app/finals-ui.js');
  const click=async selector=>{const button=document.querySelector(selector);assert.ok(button,selector);button.click();await wait();};
  t.after(()=>{ui.leaveFinals();for(const timer of toastTimers)clearTimeout(timer);global.setTimeout=nativeSetTimeout;win.close();});

  await t.test('class browser, weapon choices, reserves and source details use real bundled data',async()=>{
    await ui.mountFinals();assert.equal(document.querySelectorAll('[data-finals-class]').length,3);assert.equal(document.querySelector('[data-finals-class=Medium]').getAttribute('aria-pressed'),'true');assert.match(document.querySelector('.fn-build-intro h2').textContent,/FCAR Aggro/);
    assert.equal(document.querySelectorAll('.fn-gadget-grid .fn-equipment').length,3);assert.equal(document.querySelectorAll('.fn-gadget-grid svg').length,3);assert.match(document.querySelector('[data-disclosure=sources]').textContent,/Build review/);assert.match(document.querySelector('#fn-build-status').textContent,/Build review pending/);
    const alternatives=document.querySelector('[data-disclosure=alternatives]');alternatives.open=true;assert.match(alternatives.textContent,/APS Turret/);
    await click('[data-finals-class=Light]');assert.equal(document.querySelector('[data-finals-class=Light]').getAttribute('aria-pressed'),'true');assert.match(document.querySelector('.fn-build-intro h2').textContent,/Cloak Recon/);assert.ok(document.querySelector('[data-disclosure=alternatives]').open);
    const weapon=document.querySelector('#finals-weapon');assert.ok([...weapon.options].some(o=>o.value==='LH1'));weapon.value='LH1';weapon.dispatchEvent(new win.Event('change',{bubbles:true}));assert.equal(document.querySelector('.fn-weapon-display h3').textContent,'LH1');
    await click('[data-finals-build=bow-picker]');assert.equal(document.querySelector('.fn-weapon-display h3').textContent,'Recurve Bow');assert.equal(document.querySelector('#finals-weapon'),null);
  });

  await t.test('copy is exact, confirms inline, restores, and failures recover without claiming success',async()=>{
    await click('[data-finals-class=Medium]');const button=document.querySelector('[data-finals-action=copy-build]'),original=button.textContent;
    await click('[data-finals-action=copy-build]');assert.match(button.textContent,/Copied/);assert.ok(button.classList.contains('is-copied'));assert.equal(button.disabled,true);assert.match(copies.at(-1),/Weapon: FCAR/);assert.match(copies.at(-1),/Specialization: Healing Beam/);assert.match(copies.at(-1),/Gadget 3: Goo Grenade/);assert.equal(document.querySelector('#toast').textContent,'');
    await new Promise(resolve=>setTimeout(resolve,1650));assert.equal(button.textContent,original);assert.equal(button.disabled,false);assert.equal(button.classList.contains('is-copied'),false);
    copyReject=true;await click('[data-finals-action=copy-build]');assert.equal(button.disabled,false);assert.equal(button.textContent,original);assert.doesNotMatch(button.textContent,/Copied/);assert.match(document.querySelector('#toast').textContent,/Clipboard unavailable/);copyReject=false;document.querySelector('#toast').textContent='';
  });

  await t.test('saved snapshots, fixed team weapons and strategy evidence remain available',async()=>{
    await click('[data-finals-action=save-build]');assert.equal(JSON.parse(localStorage.getItem('tbb-finals-saves')).length,1);assert.ok(document.querySelector('[data-finals-tab=saved]'));await click('[data-finals-tab=saved]');assert.equal(document.querySelectorAll('.fn-saved-card').length,1);await click('[data-finals-copy-saved]');assert.match(copies.at(-1),/FCAR Aggro/);
    await click('[data-finals-tab=teams]');assert.equal(document.querySelectorAll('.fn-team-player').length,3);assert.deepEqual([...document.querySelectorAll('.fn-team-equipment .fn-equipment-weapon strong')].map(x=>x.textContent),['Lewis Gun','SA1216','FCAR']);assert.match(document.querySelector('[data-disclosure=team-evidence]').textContent,/HHM Is The New META/);assert.match(document.querySelector('.fn-team-tradeoff').textContent,/Less mobility/);
    await click('[data-finals-action=copy-team]');assert.match(copies.at(-1),/PLAYER 3/);assert.match(copies.at(-1),/Weapon: SA1216/);assert.match(document.querySelector('[data-finals-action=copy-team]').textContent,/Copied/);
    await click('[data-finals-team=hml]');assert.match(document.querySelector('.fn-team-strategy h2').textContent,/Heavy \+ Medium \+ Light/);assert.deepEqual([...document.querySelectorAll('.fn-player-banner>div>span')].map(x=>x.textContent),['Heavy','Medium','Light']);
  });

  await t.test('cached refresh failures, missing team recommendations and empty builds are distinct',async()=>{
    mode='error';await click('[data-finals-action=refresh]');await wait();assert.match(document.querySelector('.fn-load-error').textContent,/last available builds are still shown/);assert.equal(document.querySelectorAll('.fn-team-player').length,3);assert.equal(requests.at(-1).refresh,true);
    mode='no-teams';await ui.mountFinals('teams');assert.match(document.querySelector('.fn-empty').textContent,/No team setups available/);await click('[data-finals-tab=classes]');assert.ok(document.querySelector('.fn-build-stage'));
    mode='invalid-team';await ui.mountFinals('teams');await click('[data-finals-team=hhm]');assert.equal(document.querySelector('[data-finals-action=copy-team]').disabled,true);assert.match(document.querySelector('.fn-team-player').textContent,/Loadout needs review/);
    mode='empty';await ui.mountFinals('classes');assert.match(document.querySelector('.fn-empty').textContent,/No builds for this class/);assert.equal(document.querySelectorAll('[data-finals-class]').length,3);assert.ok(document.querySelector('[data-finals-action=refresh]'));
  });

  await t.test('leaving during a refresh does not replace another module',async()=>{
    let resolve;win.rift.loadouts=()=>new Promise(r=>{resolve=r;});const pending=ui.mountFinals();ui.leaveFinals();document.querySelector('#hub-app').innerHTML='<p id="other-game">Other game</p>';resolve(data());await pending;assert.ok(document.querySelector('#other-game'));
  });
});
