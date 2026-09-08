const {test}=require('node:test');
const assert=require('node:assert/strict');

const api={};
global.window={rift:api,addEventListener(){},dispatchEvent(){}};
global.localStorage={getItem(){return null;}};
global.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options?.detail;}};
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('leaving videos removes the embedded player and a pending fetch cannot recreate it',async()=>{
  let resolveMedia,playerPresent=true,renderCount=0;
  const root={set innerHTML(value){renderCount++;}};
  const player={remove(){playerPresent=false;}};
  global.document={addEventListener(){},querySelector(selector){
    if(selector==='#hub-app')return root;
    if(selector==='#watch-player-section')return playerPresent?player:null;
    return null;
  }};
  api.media=()=>new Promise(resolve=>{resolveMedia=resolve;});
  const {mountWatch,leaveWatch}=await import('../app/watch-ui.js');
  const loading=mountWatch('lol');
  assert.equal(renderCount,1);
  leaveWatch();
  assert.equal(playerPresent,false,'A hidden hub must not retain an active embedded player');
  resolveMedia({game:'lol',channels:[]});await loading;
  assert.equal(renderCount,1,'An old video request must not replace the destination workspace');
  leaveWatch();
  api.media=async()=>({game:'lol',channels:[]});
  await mountWatch('lol');
  assert.equal(renderCount,3,'The video page can still be opened again');
  leaveWatch();
});

test('changed source polling preserves scroll, open details and focused controls',async()=>{
  let resolveUpdates,html='',renderCount=0,page=null,focusedOptions;
  const listeners=new Map();
  const root={set innerHTML(value){html=value;renderCount++;page={scrollTop:0};}};
  const badge={dataset:{}};
  const focusTarget={focus(options){focusedOptions=options;}};
  const opened='source-refresh-guide';
  global.document={
    activeElement:{id:'source-refresh-guide-summary',closest:()=>page},
    addEventListener(type,handler){listeners.set(type,handler);},
    querySelectorAll:()=>page?[{id:opened}]:[],
    getElementById:id=>id==='source-refresh-guide-summary'?focusTarget:null,
    querySelector(selector){
      if(selector==='#hub-app')return root;
      if(selector==='.sources-page')return page;
      if(selector==='#updates-button')return badge;
      return null;
    }
  };
  api.updates=()=>new Promise(resolve=>{resolveUpdates=resolve;});
  const {mountSources,leaveSources}=await import('../app/updates-ui.js');
  mountSources();assert.equal(renderCount,1);
  page.scrollTop=980;
  resolveUpdates({running:false,finishedAt:'2026-09-08T12:00:00Z',rows:[
    {id:'league',name:'League of Legends',state:'checked',scope:'Catalog',sourceUrl:'https://www.leagueoflegends.com/',checkedAt:'2026-09-08T12:00:00Z'},
    {id:'warzone',name:'Warzone · battle royale',state:'checked',scope:'Loadouts',sourceUrl:'https://codmunity.gg/'},
    {id:'warzone-ranked',name:'Warzone · ranked',state:'checked',scope:'Loadouts',sourceUrl:'https://codmunity.gg/'}
  ]});
  await settle();
  assert.equal(renderCount,2,'A changed source result updates the displayed data');
  assert.equal(page.scrollTop,980,'Background polling must not return the reader to the page top');
  assert.match(html,/id="source-refresh-guide" open/);
  assert.deepEqual(focusedOptions,{preventScroll:true});
  listeners.get('change')({target:{id:'source-game-filter',value:'cod'}});
  assert.match(html,/id="update-detail-warzone"/,'Call of Duty includes the battle royale source');
  assert.match(html,/id="update-detail-warzone-ranked"/,'Call of Duty also includes the ranked source');
  assert.doesNotMatch(html,/id="update-detail-league"/,'The game filter excludes unrelated sources');
  leaveSources();
});
