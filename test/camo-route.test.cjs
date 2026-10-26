const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'app/hub.js'),'utf8'),html=fs.readFileSync(path.join(root,'app/index.html'),'utf8'),games=require('../core/games.json');

test('Camos is a lazy workspace tab available only in MW4',()=>{
 const dom=new JSDOM(html),doc=dom.window.document;
 try{
  assert.deepEqual(games.filter(g=>g.pages?.includes('camos')).map(g=>g.id),['mw4']);
  const style=doc.querySelector('[data-feature-style="camos.css"]');assert.ok(style);assert.equal(style.getAttribute('href'),null);assert.equal(style.dataset.href,'camos.css');
  const scope=vm.createContext({document:doc,$:s=>doc.querySelector(s),showPlayerCount(){}});
  vm.runInContext(source.slice(source.indexOf('function gameTabs('),source.indexOf('function location(')),scope);
  const tab=doc.querySelector('[data-game-page="camos"]');
  scope.gameTabs(games.find(g=>g.id==='mw4'),'camos');assert.equal(tab.hidden,false);assert.equal(tab.getAttribute('aria-current'),'page');assert.equal(doc.querySelector('#game-tabs-name').textContent,'MW4');
  for(const game of games.filter(g=>g.id!=='mw4')){scope.gameTabs(game);assert.equal(tab.hidden,true,game.id);}
 }finally{dom.window.close();}
});

test('Camos keeps MW4 context through navigation and cannot be replaced by a loadout refresh',async()=>{
 const {recordRoute,restoredRoute}=await import('../app/navigation-history.js');
 const dom=new JSDOM(html,{url:'http://localhost/?game=mw4'}),doc=dom.window.document,calls=[],workspaces=[],tabs=[];
 dom.window.HTMLElement.prototype.scrollTo=function(){};
 const state={games,route:'home',watchGame:null,request:0};let loadouts=0;
 const scope=vm.createContext({state,navigationRevision:0,navigationHistoryStarted:false,loadedFeatures:new Map(),window:dom.window,document:doc,CustomEvent:dom.window.CustomEvent,
  game:()=>games.find(g=>g.id===state.route),$:s=>doc.querySelector(s),leaveIntel(){},leaveSources(){},rememberWorkspace:(...args)=>workspaces.push(args),recordRoute,setTheme(){},gameTabs:(g,page)=>tabs.push([g?.id,page]),location(){},
  mountFeature:async(...args)=>calls.push(args),stored:(_key,fallback)=>fallback,resetFilters(){},loadBuilds:async()=>{loadouts++;}});
 try{
  vm.runInContext(source.slice(source.indexOf('async function renderRoute('),source.indexOf('function resetFilters(')),scope);
  await scope.renderRoute('camos','mw4');assert.deepEqual(calls.at(-1),['camos-ui','mountCamos']);assert.deepEqual(tabs.at(-1),['mw4','camos']);assert.deepEqual(workspaces.at(-1),['camos','mw4']);assert.deepEqual(restoredRoute(dom.window.history,dom.window.location),['camos','mw4',null]);
  const start=source.indexOf("window.addEventListener('tbb-sources-updated'");vm.runInContext(source.slice(start,source.indexOf('\n',start)),scope);
  dom.window.dispatchEvent(new dom.window.CustomEvent('tbb-sources-updated',{detail:{rows:[]}}));assert.equal(loadouts,0,'Source polling must leave the tracker visible');
  await scope.renderRoute('mw4','mw4');assert.equal(loadouts,1);assert.deepEqual(tabs.at(-1),['mw4','loadouts']);
  await new Promise(resolve=>{dom.window.addEventListener('popstate',resolve,{once:true});dom.window.history.back();});
  await scope.renderRoute(...restoredRoute(dom.window.history,dom.window.location),true);assert.deepEqual(calls.at(-1),['camos-ui','mountCamos']);assert.deepEqual(tabs.at(-1),['mw4','camos']);assert.equal(loadouts,1);
  const mounted=calls.length;await scope.renderRoute('camos','bo7');assert.equal(calls.length,mounted,'Other Call of Duty games cannot open MW4 camos');
 }finally{dom.window.close();}
});
