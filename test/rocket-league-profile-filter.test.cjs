const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');

test('personal and friend profile filters update every view and reset match pagination',async()=>{
  const dom=new JSDOM('<main></main>',{url:'http://localhost'});
  global.window=dom.window;global.document=dom.window.document;global.localStorage=dom.window.localStorage;
  const ui=await import('../app/rocket-league-accounts.js');
  const row=(id,playlist,goals,age=1)=>({match_id:id,played_at:new Date(Date.now()-age*86400000).toISOString(),won:playlist===11,stats:{PlaylistId:playlist,Goals:goals,Shots:goals*2,Score:goals*100,Saves:1}});
  const records=[...Array.from({length:27},(_,i)=>row('ranked'+i,11,2)),row('casual',2,7),row('private',6,99),row('freeplay',999,99),row('unknown',null,99),row('expired',11,99,400)];
  const call=async q=>q.action==='account-state'?{enabled:true,user:{id:'filter-owner'},profile:{handle:'filter-owner'}}:q.action==='account-friends'?[]:q.action==='cloud-records'?[]:{profile:{handle:'friend'},records};
  await ui.loadAccounts(call);await ui.loadPersonalProfile(call,{settings:{}},'Me');
  await ui.accountAction({dataset:{account:'stats',id:'friend'}},call);
  for(const personal of [true,false]){
    const act=async(account,extra={})=>ui.accountAction({dataset:{account,...(personal?{personal:'true'}:{}),...extra}},call);
    const render=()=>{document.body.innerHTML=personal?ui.personalProfileUI():ui.accountsUI('player');};
    await act('profile-kind',{kind:'ranked'});
    for(const tab of ['overview','performance','matches']){
      await act('profile-tab',{tab});render();
      assert.equal(document.querySelector('.rl-summary-volume strong').textContent,'27');
      assert.equal(document.querySelector('[data-kind="ranked"]').getAttribute('aria-pressed'),'true');
      assert.match(document.querySelector('.rl-profile-scope').textContent,/Ranked only/);
      if(tab!=='matches'){
        const goals=[...document.querySelectorAll('.rl-profile-totals>div')].find(el=>el.querySelector('dt').textContent==='Goals');
        assert.equal(Number(goals.querySelector('dd').textContent),tab==='overview'?54:2);
      }else assert.equal(document.querySelectorAll('.rl-profile-match').length,25);
    }
    await act('profile-page',{step:'1'});render();assert.equal(document.querySelectorAll('.rl-profile-match').length,2);
    await act('profile-kind',{kind:'casual'});render();
    assert.equal(document.querySelector('.rl-summary-volume strong').textContent,'1');
    assert.equal(document.querySelectorAll('.rl-profile-match').length,1);
    assert.match(document.querySelector('.rl-profile-pagination').textContent,/1–1 of 1/);
    await act('profile-kind',{kind:'all'});render();assert.equal(document.querySelector('.rl-summary-volume strong').textContent,'28');
  }
  dom.window.close();
});

test('ranked empty states stay usable and invalid filters never include private matches',async()=>{
  const {playerProfileUI}=await import('../app/rocket-league-player-profile.js');
  const data={records:[{played_at:new Date().toISOString(),won:true,stats:{PlaylistId:2,Goals:1}}]};
  for(const personal of [true,false]){
    const dom=new JSDOM(playerProfileUI(data,{kind:'ranked',personal}));
    assert.equal(dom.window.document.querySelector('.rl-profile-highlights'),null);
    assert.match(dom.window.document.querySelector('.rl-profile-empty').textContent,/ranked matches/);
    assert.equal(dom.window.document.querySelectorAll('[data-account="profile-kind"]').length,3);
    dom.window.close();
  }
  const dom=new JSDOM(playerProfileUI({...data,records:[...data.records,{played_at:new Date().toISOString(),stats:{PlaylistId:6,Goals:99}}]},{kind:'private'}));
  assert.equal(dom.window.document.querySelector('.rl-summary-volume strong').textContent,'1');
  dom.window.close();
});
