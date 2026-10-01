// Hidden Chromium captures with bundled source data and explicit offline fixtures.
// No live credentials, account writes, updater actions, or external navigation.
const {app,BrowserWindow}=require('electron');
// Offscreen GPU surfaces can disappear from CDP captures on Windows. Software
// compositing captures the canvas pixels without changing production settings.
app.disableHardwareAcceleration();
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../app'),output=path.resolve(__dirname,process.argv.includes('--regressions')?'../.validation-cache/regressions-248':'../.validation-cache/desktop-248',process.argv.includes('--before')?'before':'after');
fs.mkdirSync(output,{recursive:true});app.setPath('userData',path.join(output,'profile'));
const read=file=>JSON.parse(fs.readFileSync(path.join(root,'data',file),'utf8'));
const data={version:require('../package.json').version,apex:read('apex/apex-content.json'),games:require('../core/games.json'),modes:require('../core/provider.cjs').MODES,leagueBuild:read('builds/Ahri_ranked_default_emerald_plus_all_none.json'),catalog:read('catalog.json'),finals:{...read('finals/finals-ranked.json'),game:'finals',teamPresets:read('finals/teams.json'),official:read('finals/finals-patches.json')},siege:{...read('siege/siege-data.json'),guides:read('siege/siege-guides.json')},gzw:read('gzw/gzw-data.json'),markers:read('gzw/gzw-markers.json'),wardogs:{...read('wardogs/wardogs-data.json'),maps:read('wardogs/maps.json')},market:read('wardogs/gold-market.json'),cod:Object.fromEntries(['bo7-public','bo7-ranked','warzone','warzone-ranked'].map(n=>[n,read('cod/'+n+'.json')]))};
if(process.argv.includes('--interactions'))data.cod['bo7-public']=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../.validation-cache/regressions-248/current-bo7.json'),'utf8'));
data.patches=Object.fromEntries(['lol','bo7','warzone','mw4','finals','siege','wardogs','gray-zone'].map(game=>[game,{...read('patches/patches-'+game+'.json'),cacheState:'bundled'}]));
data.media=Object.fromEntries(require('../core/media-provider.cjs').CHANNELS.map(channel=>{const safeRead=name=>fs.existsSync(path.join(root,'data/media',name+'.json'))?read('media/'+name+'.json'):{};return[channel.id,{...channel,...safeRead(channel.id),broadcasts:safeRead(channel.id+'-streams'),catalog:safeRead(channel.id+'-playlists')}];}));
const report={fixture:'Bundled source snapshots; offline accounts and update state. These are renderer checks, not live-service or native gameplay QA.',captures:[],errors:[]};
if(process.argv.includes('--live-apex')||process.argv.includes('--theme-review')||process.argv.includes('--regressions')||process.argv.includes('--interactions')){data.liveApex=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../.validation-cache/apex-live-profile.json'),'utf8'));if(data.liveApex.status!=='ready'||!data.liveApex.profile)throw Error('Actual normalized profile evidence required');report.fixture='Apex profile from successful authenticated production lookup, '+data.liveApex.profile.checkedAt+'. Replay of that actual display contract in isolated Chromium; no invented player statistics.';}
report.flows=[];
if(process.argv.includes('--fresh-apex')){data.liveApex=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../.validation-cache/regressions-248/apex-fresh-profile.json'),'utf8'));if(data.liveApex.status!=='ready'||!data.liveApex.profile)throw Error('Fresh authenticated profile required');report.fixture='Fresh authenticated production response checked '+data.liveApex.profile.checkedAt+'; renderer replay of that exact normalized contract.';}
report.terrainNetwork={loaded:0,httpFailures:[],networkFailures:[]};
let server,win;const pause=ms=>new Promise(r=>setTimeout(r,ms));
const run=(fn,...args)=>win.webContents.executeJavaScript(`(${fn.toString()})(...${JSON.stringify(args)})`);
data.operatorProfiles=Object.fromEntries(fs.readdirSync(path.join(root,"data/siege")).filter(n=>/^operator-[a-z-]+\.json$/.test(n)&&!/(assets|catalog|summaries|abilities)/.test(n)).map(n=>{const p=read("siege/"+n);return[p.id,p];}));
function fixture(data){
 window.qaFrames={requested:0,painted:0};const frame=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{window.qaFrames.requested++;return frame(t=>{window.qaFrames.painted++;fn(t);});};
 localStorage.setItem('dropzone-whats-new-seen',JSON.stringify(data.version));localStorage.setItem('dropzone-wardogs-tutorial-v1','seen');localStorage.setItem('dropzone-rocket-league-setup-v1','seen');
 window.rift={games:async()=>data.games,appContext:async()=>({admin:false}),visualUpdates:async()=>({}),updates:async()=>({rows:[],checking:false}),personalIntel:async()=>({alerts:[]}),appUpdates:async()=>({version:data.version,status:'disabled',reason:'development',enabled:false}),onAppUpdate:()=>()=>{},copy:async()=>{},openSource:async()=>{},window:()=>{},catalog:async()=>data.catalog,build:async()=>data.leagueBuild,modes:async()=>data.modes,status:async()=>({}),siege:async q=>q?.operator?data.operatorProfiles[q.operator]:data.siege,gzw:async()=>data.gzw,gzwMap:async()=>data.markers,wardogs:async()=>data.wardogs,market:async()=>data.market,loadouts:async q=>q.game==='finals'?data.finals:{...data.cod[q.game==='bo7'?'bo7-'+(q.mode||'public'):q.mode==='ranked'?'warzone-ranked':'warzone'],game:q.game,mode:q.mode},apexContent:async()=>data.apex,apexPlayer:async()=>({configured:false,status:'setup-required',available:false,message:'Player lookup requires approved provider access and secure backend configuration.'})};
 window.qaActions=[];window.qaUpdate=null;
 window.rift.patches=async q=>{if(window.qaFeedFailure)throw Error('News could not be reached. Try again later.');return data.patches[q.game];};
 window.rift.media=async q=>{const channel=Object.values(data.media).find(c=>c.games.includes(q.game));return{game:q.game,channels:channel?[channel]:[]};};
 if(data.liveApex){window.qaApexResult=data.liveApex;window.qaApexCalls=[];window.rift.apexPlayer=async q=>{window.qaApexCalls.push(q);return q.action==='status'?{...data.liveApex,profile:undefined}:window.qaApexResult;};}
 Object.assign(window.rift,{onAppUpdate:callback=>{window.qaUpdate=callback;return()=>{};},checkAppUpdates:async()=>{window.qaActions.push('check-update');return{version:data.version,status:'current',enabled:true,checkedAt:new Date().toISOString()};},installAppUpdate:async()=>{window.qaActions.push('install-update');throw Error('Installation prohibited in renderer QA');}});
}
async function capture(name,width,height){
 await win.setContentSize(width,height);await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height,screenWidth:width,screenHeight:height,deviceScaleFactor:1,mobile:false});await pause(300);await run(async()=>{await document.fonts.ready;await Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,3000))]);});
 const metrics=await run(()=>({width:innerWidth,height:innerHeight,overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth,chrome:{rails:document.querySelectorAll('.app-rail').length,titlebars:document.querySelectorAll('.titlebar').length,activeTransition:!!document.activeViewTransition},broken:[...document.images].filter(i=>i.checkVisibility({checkVisibilityCSS:true})&&i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src')),heading:[...document.querySelectorAll('#hub-app h1,#league-app h1')].find(el=>el.checkVisibility({checkVisibilityCSS:true}))?.textContent,frames:window.qaFrames,canvas:[...document.querySelectorAll('canvas')].map(c=>({id:c.id,width:c.width,height:c.height,pixel:[...c.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data]}))}));
 // Explicit clipping forces a fresh surface after emulated resize. With false,
 // Windows software capture can repeat the smaller previous surface at edges.
 const screenshot=await win.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true,clip:{x:0,y:0,width,height,scale:1},optimizeForSpeed:true});
 if(process.argv.includes('--capture-diagnostic')&&name==='launch-options-default-off'&&width===1920){
  const layout=await win.webContents.debugger.sendCommand('Page.getLayoutMetrics');
  const state=await run(()=>({inner:[innerWidth,innerHeight],outer:[outerWidth,outerHeight],visual:[visualViewport.width,visualViewport.height],html:document.querySelectorAll('html').length,titlebars:document.querySelectorAll('.titlebar').length,rails:document.querySelectorAll('.app-rail').length,activeTransition:!!document.activeViewTransition,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,animations:document.getAnimations().map(a=>({name:a.animationName,state:a.playState})),edgeHit:document.elementFromPoint(innerWidth-10,innerHeight-10)?.outerHTML?.slice(0,220)}));
  fs.writeFileSync(path.join(output,'capture-diagnostic.json'),JSON.stringify({layout,state},null,2));
  for(const [suffix,options]of [['view',{fromSurface:false}],['clip',{fromSurface:true,clip:{x:0,y:0,width,height,scale:1}}],['full-clip',{fromSurface:true,captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}}]]){const shot=await win.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,...options});fs.writeFileSync(path.join(output,'capture-diagnostic-'+suffix+'.png'),Buffer.from(shot.data,'base64'));}
 }
 const png=Buffer.from(screenshot.data,'base64');
 if(png.readUInt32BE(16)!==width||png.readUInt32BE(20)!==height)throw Error(`Screenshot dimensions do not match ${width}x${height}`);
 const filename=name+'-'+width+'.png';fs.writeFileSync(path.join(output,filename),Buffer.from(screenshot.data,'base64'));report.captures.push({file:filename,...metrics});if(metrics.overflow>2)report.errors.push(filename+': overflow '+metrics.overflow);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(filename+' '+JSON.stringify(metrics));
}
async function mapChecks(){
 const check=await run(async()=>{
  const failures=[],assert=(ok,label)=>{if(!ok)failures.push(label);};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const click=s=>{const el=document.querySelector(s);assert(!!el,'Missing '+s);el?.click();};
  const canvas=document.querySelector('#gz-canvas');assert(canvas?.width>0&&canvas?.height>0,'Canvas has no usable dimensions');
  const original=canvas;
  const search=document.querySelector('#gz-search');search.value='Juliett 4';search.dispatchEvent(new Event('input',{bubbles:true}));
  assert(document.querySelectorAll('[data-gz-marker]').length===1,'Exact LZ search did not isolate result');
  document.querySelector('#gz-search').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await wait(400);
  assert(!document.querySelector('#gz-detail').hidden&&document.querySelector('#gz-detail').textContent.includes('Juliett 4'),'Search focus did not open LZ inspector');
  assert(document.querySelector('#gz-canvas')===original,'Selection replaced canvas');
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(document.querySelector('#gz-detail').hidden,'Escape did not close inspector');
  click('[data-gz-preset="none"]');assert(document.querySelectorAll('[data-gz-marker]').length===1,'LZ-only preset lost search result');
  click('[data-gz-tab="missions"]');assert(!!document.querySelector('[data-gz-filter="vendor"]'),'Mission filters unavailable');
  const input=document.querySelector('#gz-search');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
  click('[data-gz-mission]');assert(!document.querySelector('#gz-detail').hidden,'Mission inspector did not open');
  click('[data-gz-tab="keys"]');assert(!!document.querySelector('[data-gz-key]'),'Key catalog unavailable');click('[data-gz-key]');
  assert(document.querySelector('#gz-detail').textContent.includes('unlock')||document.querySelector('#gz-detail').textContent.includes('Key')||document.querySelector('#gz-detail').textContent.includes('key'),'Key inspector missing content');
  click('[data-gz-tab="markers"]');click('[data-gz-action="fit"]');
  for(let i=0;i<3;i++)click('[data-gz-action="zoom-in"]');await wait(550);
  canvas.focus();canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'0',bubbles:true}));await wait(200);
  assert(document.querySelector('#gz-canvas')===original,'Map actions replaced canvas');
  return {failures,canvas:{width:canvas.width,height:canvas.height},sourceNote:document.querySelector('#gz-status')?.textContent};
 });report.flows.push({name:'Gray Zone selection/search/layers/missions/keys/keyboard zoom/fit',...check});report.errors.push(...check.failures);
 await capture('gray-zone-inspector',1920,1080);
 // Exercise actual Chromium pointer events and wheel input on the existing canvas.
 const rect=await run(()=>{const r=document.querySelector('#gz-canvas').getBoundingClientRect();return{x:r.x+r.width*.5,y:r.y+r.height*.5};});
 for(const event of [{type:'mousePressed',button:'left',buttons:1,clickCount:1,...rect},{type:'mouseMoved',button:'left',buttons:1,x:rect.x+80,y:rect.y+40},{type:'mouseReleased',button:'left',buttons:0,clickCount:1,x:rect.x+80,y:rect.y+40},{type:'mouseWheel',deltaX:0,deltaY:-160,...rect}])await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',event);
 await pause(550);await capture('gray-zone-pan-zoom',1920,1080);
 await run(()=>document.querySelector('[data-route="home"]').click());await pause(550);
 await run(()=>document.querySelector('[data-route="gray-zone"]').click());await pause(900);
 const returned=await run(()=>!!document.querySelector('#gz-canvas')&&document.querySelector('#gz-canvas').width>0);report.flows.push({name:'Gray Zone leave/reopen',passed:returned});if(!returned)report.errors.push('Gray Zone map did not survive navigation');
 await run(()=>history.back());await pause(700);const back=await run(()=>!!document.querySelector('.library-page'));await run(()=>history.forward());await pause(800);const forward=await run(()=>!!document.querySelector('#gz-canvas'));report.flows.push({name:'Browser back/forward restores workspaces',passed:back&&forward});if(!back||!forward)report.errors.push('Browser back/forward did not restore workspaces');
}
async function workspaceChecks(route){
 const checks=await run(async route=>{
  const failures=[],assert=(ok,label)=>{if(!ok)failures.push(label);},click=selector=>{const el=document.querySelector(selector);assert(!!el,'Missing '+selector);el?.click();};
  const wait=()=>new Promise(r=>setTimeout(r,100));
  if(route==='sotf'){
   const canvas=document.querySelector('#sotf-canvas');click('[data-sotf-preset="none"]');assert(document.querySelector('#sotf-count').textContent.startsWith('0 markers'),'Hide all did not clear markers');click('[data-sotf-preset="essentials"]');
   const search=document.querySelector('#sotf-search');search.value='Shovel';search.dispatchEvent(new Event('input',{bubbles:true}));search.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert(!document.querySelector('#sotf-detail').hidden,'Search did not focus Shovel');
   click('[data-sotf-found]');const found=document.querySelector('#sotf-hide-found');found.checked=true;found.dispatchEvent(new Event('change',{bubbles:true}));
   document.querySelector('#hub-app').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(document.querySelector('#sotf-detail').hidden,'Sons inspector did not dismiss');
   click('[data-sotf-zoom="in"]');click('[data-sotf-zoom="out"]');click('[data-sotf-zoom="fit"]');assert(canvas===document.querySelector('#sotf-canvas'),'Sons actions replaced canvas');
  }
  if(route==='siege'){
   assert(document.querySelectorAll('.r6-team-member').length===5,'Siege lineup is not five operators');click('[data-r6-side="defense"]');assert(document.querySelectorAll('.r6-team-member').length===5,'Defense team lost operators');
   const map=document.querySelector('#r6-map');map.value='oregon';map.dispatchEvent(new Event('change',{bubbles:true}));assert(document.querySelector('#r6-map').value==='oregon'&&document.querySelector('.r6-context-image').alt.includes('Oregon'),'Round plan did not follow selected map');click('[data-r6-tab="stats"]');click('[data-r6-chart]');assert(document.querySelector('#r6-chart-dialog').open,'Siege chart did not open');click('[data-r6-close]');assert(!document.querySelector('#r6-chart-dialog').open,'Siege chart did not close');click('[data-r6-tab="maps"]');
  }
  if(route==='apex'){
   assert(document.querySelector('.apex-player-form>button').disabled,'Unconfigured player lookup claims availability');
   const tabs=[...document.querySelectorAll('[data-game-page]')].filter(el=>!el.hidden);
   assert(tabs.map(el=>el.dataset.gamePage).join('|')==='loadouts|apex-legends|apex-news|videos','Apex navigation does not use the shared game bar');
   assert(!document.querySelector('.apex-nav'),'Redundant in-page Apex navigation remains');
   click('[data-game-page="apex-legends"]');await new Promise(r=>setTimeout(r,350));click('.am-guide-nav [data-apex-meta-view="directory"]');await new Promise(r=>setTimeout(r,350));assert(document.querySelectorAll('.am-legend-banner').length===28,'Apex roster is incomplete');const search=document.querySelector('#apex-query');search.value='Axle';search.dispatchEvent(new Event('input',{bubbles:true}));assert(document.querySelectorAll('.am-legend-banner').length===1,'Apex search did not isolate Axle');const current=document.querySelector('#apex-query');current.value='no matching legend';current.dispatchEvent(new Event('input',{bubbles:true}));assert(!!document.querySelector('.am-empty'),'Apex empty state missing');document.querySelector('#apex-query').value='';document.querySelector('#apex-query').dispatchEvent(new Event('input',{bubbles:true}));
   click('[data-game-page="apex-news"]');await new Promise(r=>setTimeout(r,350));assert(document.querySelectorAll('.patch-feature,.patch-row').length===14,'EA news links missing');
  }
  await wait();return{failures};
 },route);report.flows.push({name:route+' workspace controls',...checks});report.errors.push(...checks.failures);
 if(route==='apex'){for(const tab of ['legends','news']){await run(tab=>document.querySelector(`[data-game-page="apex-${tab}"]`).click(),tab);await pause(400);for(const [width,height] of [[1920,1080],[2560,1440],[3840,2160],[1000,900]])await capture('apex-'+tab,width,height);}}
 if(route==='siege')await capture('siege-defense-oregon',1920,1080);
 if(route==='sotf')await capture('sotf-search-found',1920,1080);
}
async function key(name){const event={key:name,code:name,windowsVirtualKeyCode:{Escape:27,Enter:13,ArrowDown:40}[name]};await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',...event,...(name==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',...event});await pause(120);}
async function stateChecks(route){
 const check=async(name,fn)=>{const passed=await run(fn);report.flows.push({name,passed});if(!passed)report.errors.push(name);};
 if(route==='settings'){
  await run(()=>document.querySelector('#text-size-select-control').click());await pause(100);await capture('settings-text-size-menu',1000,900);
  // Viewport emulation may dispatch resize, intentionally closing popovers.
  // Reopen after capture before testing keyboard dismissal and focus return.
  await run(()=>{const b=document.querySelector('#text-size-select-control');b.focus();if(b.getAttribute('aria-expanded')!=='true')b.click();});await pause(100);await key('Escape');
  await check('Shared select Escape closes and restores trigger focus',()=>!document.querySelector('#text-size-select-options').matches(':popover-open')&&document.activeElement.id==='text-size-select-control');
  await key('ArrowDown');await key('ArrowDown');await key('Enter');
  await check('Keyboard text-size selection applies while theme stays dark',()=>document.documentElement.dataset.textSize==='115'&&document.documentElement.dataset.appearance==='dark');
  await capture('settings-text-size',1920,1080);
  await run(()=>{const el=document.querySelector('#text-size-select');el.value='100';el.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-access="contrast"]').click();document.querySelector('[data-access="reducedMotion"]').click();});
  await check('Accessibility checkboxes apply and persist',()=>{const p=JSON.parse(localStorage.getItem('dropzone-accessibility-v1'));return p.contrast&&p.reducedMotion&&document.body.classList.contains('app-high-contrast')&&document.body.classList.contains('app-reduced-motion');});
  await capture('settings-accessibility',1000,900);
  await run(()=>{document.querySelector('[data-access="contrast"]').click();document.querySelector('[data-access="reducedMotion"]').click();});
 }
 if(route==='updates'){
  for(const status of ['checking','downloading','error','ready','current']){
   await run(status=>window.qaUpdate({version:'2.4.7',availableVersion:'2.4.8',status,enabled:true,percent:47,error:'The update server could not be reached. Try again later.'}),status);
   await capture('updates-'+status,1000,900);
   await check('Update '+status+' control state',()=>{const b=document.querySelector('[data-app-update-action]'),p=document.querySelector('progress');return b&&(['checking','downloading'].includes(document.querySelector('.app-update-status [role=status]').textContent.toLowerCase().split(' ')[0])?b.disabled:true)&&(!p||p.value===47);});
  }
  await run(()=>document.querySelector('[data-app-update-action="check"]').click());await pause(150);
  await check('Update check works without invoking installation',()=>window.qaActions.filter(x=>x==='check-update').length===1&&!window.qaActions.includes('install-update'));
 }
 if(route==='siege'){
  await run(()=>{document.querySelector('[data-r6-tab="stats"]').click();const button=document.querySelector('[data-r6-chart]');button.focus();button.click();});await capture('siege-chart-dialog',1920,1080);await key('Escape');
  await check('Native chart dialog Escape closes and restores focus',()=>!document.querySelector('#r6-chart-dialog').open&&document.activeElement.hasAttribute('data-r6-chart'));
  await run(()=>document.querySelector('[data-r6-tab="maps"]').click());await run(()=>document.querySelector('[data-open-operator]').click());await pause(700);await capture('siege-operator-profile',1920,1080);
  await check('Recommended operator opens matching equipment profile',()=>!!document.querySelector('.operator-hero')&&!!document.querySelector('.operator-loadout'));
 }
}
async function extraChecks(route){
 const click=async selector=>{const found=await run(selector=>{const el=document.querySelector(selector);if(!el)return false;el.focus();el.click();return true;},selector);if(!found)throw Error('Missing '+selector);await pause(160);};
 const check=async(name,fn)=>{const passed=await run(fn);report.flows.push({name,passed});if(!passed)report.errors.push(name);};
 if(['bo7','warzone'].includes(route)){
  await run(()=>{const input=document.querySelector('#cod-search');input.value='no matching weapon';input.dispatchEvent(new Event('input',{bubbles:true}));});await pause(150);await capture(route+'-empty',1000,900);
  await check(route+' search empty state',()=>!!document.querySelector('.cod-empty'));
  await click('[data-hub-action="reset-filters"]');await check(route+' reset restores builds',()=>document.querySelectorAll('[data-cod-build]').length>0);
  await click('[data-cod-mode="ranked"]');await pause(500);await capture(route+'-ranked',1920,1080);
  await check(route+' ranked mode remains usable',()=>!!document.querySelector('#loadout-detail h2'));
 }
 if(route==='finals'){
  await click('[data-finals-class="Heavy"]');await capture('finals-heavy',1920,1080);
  await click('[data-finals-action="save-build"]');await click('[data-finals-tab="saved"]');await capture('finals-saved',1000,900);
  await check('Finals saved snapshot renders',()=>!!document.querySelector('.fn-saved-card'));
  await click('[data-finals-tab="teams"]');await capture('finals-team',1920,1080);await capture('finals-team',1000,900);
  await check('Finals team has three loadouts',()=>document.querySelectorAll('.fn-team-player').length===3);
 }
 if(route==='rocket-league'){
  for(const view of ['history','personal','friends','settings']){await click(`[data-rl-view="${view}"]`);await pause(400);await capture('rocket-league-'+view,1000,900);}
  await check('Rocket League full workspace preserves Setup and help',()=>!document.querySelector('#rl-profile')&&!!document.querySelector('[data-rl="tutorial"]'));
  await click('[data-rl="tutorial"]');await pause(250);await capture('rocket-league-setup',1000,900);await key('Escape');
 }
 if(route==='wardogs'){
  await click('[data-wd-action="tutorial"]');await capture('wardogs-tutorial',1920,1080);
  await check('Wardogs tutorial positioning layer remains transparent',()=>{const el=document.querySelector('dialog.wd-tour');if(!el?.open)return false;const css=getComputedStyle(el);return css.backgroundColor==='rgba(0, 0, 0, 0)'&&css.backgroundImage==='none'&&css.backdropFilter==='none';});
  await key('Escape');await check('Wardogs tutorial Escape closes without hiding workspace',()=>!document.querySelector('dialog.wd-tour')&&document.querySelector('#wd-map-canvas').checkVisibility());
  await click('[data-wd-action="help"]');await capture('wardogs-help-dialog',1000,900);await key('Escape');
  await check('Wardogs help Escape closes',()=>!document.querySelector('#wd-help-dialog').open);
  await click('[data-wd-action="sight"]');await capture('wardogs-sight',1920,1080);
  for(const tab of ['server-status','market','damage']){await click(`[data-game-page="${tab}"]`);await pause(450);await capture('wardogs-'+tab,1920,1080);await capture('wardogs-'+tab,1000,900);}
 }
}
async function navigationChecks(route){
 const click=async selector=>{if(!await run(selector=>{const el=document.querySelector(selector);if(!el)return false;el.focus();el.click();return true;},selector))throw Error('Missing '+selector);await pause(250);};
 const check=async(name,fn)=>{const passed=await run(fn);report.flows.push({name,passed});if(!passed)report.errors.push(name);};
 if(route==='home'){
  await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'k',code:'KeyK',windowsVirtualKeyCode:75,modifiers:2});await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'k',code:'KeyK',windowsVirtualKeyCode:75,modifiers:2});await pause(150);
  await check('Global tool palette opens from Ctrl K',()=>document.querySelector('#workspace-dialog').open);await capture('workspace-palette',1000,900);await key('Escape');await check('Global tool palette closes with Escape',()=>!document.querySelector('#workspace-dialog').open);
  await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:34,y:292});await pause(350);await capture('home-rail-hover',1000,900);return;
 }
 if(route==='lol'){
  await click('[data-action="pick-champion"]');await capture('lol-champion-picker',1000,900);await key('Escape');await check('Champion picker Escape returns focus',()=>!document.querySelector('#picker-dialog').open&&document.activeElement.matches('[data-action="pick-champion"]'));
  await click('[data-item]');await capture('lol-item-dialog',1000,900);await key('Escape');await check('Item dialog dismisses with Escape',()=>!document.querySelector('#item-dialog').open);
  for(const view of ['roster','saved','settings']){await click('[data-view="'+view+'"]');await capture('lol-'+view,1920,1080);await capture('lol-'+view,1000,900);}
 }
 await click('[data-game-page="patches"]');await pause(300);
 await check(route+' news tab reaches the correct source',()=>!!document.querySelector('.patches-page'));
 for(const [w,h]of [[1920,1080],[2560,1440],[3840,2160],[1000,900]])await capture(route+'-news',w,h);
 if(route==='finals'){
  await run(()=>window.qaFeedFailure=true);await click('#refresh-patches');await capture('finals-news-error',1000,900);await check('News failure retains saved articles',()=>!!document.querySelector('.fn-media-alert')&&!!document.querySelector('.fn-news-feature'));
  await run(()=>window.qaFeedFailure=false);await click('[data-game-page="videos"]');await pause(400);for(const [w,h]of [[1920,1080],[2560,1440],[3840,2160],[1000,900]])await capture('finals-videos',w,h);
 }
 await click('[data-game-page="loadouts"]');await pause(400);await check(route+' returns to its workspace',()=>![...document.querySelectorAll('.patches-page,.watch-page')].some(el=>el.checkVisibility({checkVisibilityCSS:true})));
}
async function regressionChecks(route){
 const hover=async(selector,name)=>{
  const rect=await run(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing hover target '+selector);el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};},selector);
  await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',...rect});await pause(180);await capture(name,1920,1080);
 };
 await capture(route+'-inspection',1920,1080);
 if(route==='wardogs'){
  for(const action of ['origin','target','ruler','clear-ruler','fit','clear-target','undo'])await hover('['+(['origin','target','ruler'].includes(action)?'data-wd-tool':'data-wd-action')+'="'+action+'"]','wardogs-hover-'+action);
  await hover('[data-wd-action="sight"]','wardogs-hover-sight');
  report.flows.push({name:'Wardogs controls and group surfaces',styles:await run(()=>[...document.querySelectorAll('.wd-map-toolbar,.wd-tools,.wd-view-tools,.wd-map-toolbar button,.wd-sight-tab')].map(el=>{const s=getComputedStyle(el);return{label:el.textContent.trim(),class:el.className,disabled:el.disabled,background:s.background,border:s.border,shadow:s.boxShadow,radius:s.borderRadius};}))});
 }
 if(route==='gray-zone'){
  await run(()=>document.querySelector('[data-gz-tab="missions"]').click());await pause(250);await hover('[data-gz-mission]','gzw-mission-hover');
  await run(()=>document.querySelector('[data-gz-mission]').click());await capture('gzw-mission-selected',1920,1080);
  for(const tool of ['pan','pin','route'])await hover('[data-gz-tool="'+tool+'"]','gzw-toolbar-hover-'+tool);
 }
 if(route==='finals'){
  await hover('[data-finals-tab="teams"]','finals-workspace-hover');await hover('.fn-build-option','finals-build-hover');
 }
 if(route==='cod'||route==='home')await hover('.game-card',route+'-card-hover');
 if(route==='apex'){
  await liveApexChecks();
  // Return from the simulated guard states to the actual normalized profile.
  await run(p=>{window.qaApexResult=p;document.querySelector('.apex-player-form').requestSubmit();},data.liveApex);await run(()=>document.querySelector('[data-apex-refresh]').click());await pause(600);await run(()=>document.querySelector('.apex-player-form').requestSubmit());await pause(350);
  await capture('apex-profile-restored',1920,1080);
  await run(()=>{const p=document.querySelector('.apex-profile');p.scrollIntoView({block:'start'});});await capture('apex-profile-scrolled',1920,1080);
 }
}
async function liveApexChecks(){
 const until=async fn=>{for(let n=0;n<60;n++){if(await run(fn))return;await pause(50);}throw Error('Apex state did not settle');};
 const check=async(name,fn,...args)=>{const passed=await run(fn,...args);report.flows.push({name,passed});if(!passed)throw Error(name);};
 await run(identity=>{document.querySelector('[data-apex-identifier]').click();const input=document.querySelector('.apex-player-form input');input.value=identity.uid;input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.apex-player-form').requestSubmit();},data.liveApex.profile.identity);
 await until(()=>!!document.querySelector('.apex-profile-identity h1'));
 await check('Fresh authenticated profile renders exact returned identity and UID request',identity=>document.querySelector('.apex-profile-identity h1').textContent===identity.name&&document.querySelector('.apex-player-id').textContent.includes(identity.uid)&&window.qaApexCalls.some(q=>q.uid===identity.uid&&!q.player),data.liveApex.profile.identity);
 for(const [w,h]of [[1920,1080],[2560,1440],[3840,2160],[1000,900]])await capture(process.argv.includes('--fresh-apex')?'apex-fresh-profile':'apex-live-profile',w,h);
 await run(()=>document.querySelector('[data-apex-favorite]').click());
 await check('Validated result populates recents and favorite without another request',()=>{const saved=JSON.parse(localStorage.getItem('dropzone-apex-players-v1'));return saved.recent.length===1&&saved.favorites.length===1&&window.qaApexCalls.filter(q=>q.action==='lookup').length===1;});
 await run(()=>document.querySelector('[data-apex-back]').click());await until(()=>!!document.querySelector('.apex-player-form'));
 await run(()=>document.querySelector('[data-apex-history="favorites"]').click());await capture('apex-live-favorite',1920,1080);
 for(const status of ['player-not-found','rate-limited','sign-in-required']){
  await run(status=>{window.qaApexResult={status,available:false,configured:true,retryAfter:2,message:({'player-not-found':'No player was found. Check the platform and EA or platform name.','rate-limited':'The provider is busy. Wait before trying again.','sign-in-required':'Sign in to your Dropzone account to look up an Apex player.'})[status]};document.querySelector('.apex-player-form').requestSubmit();},status);
  await until(()=>!!document.querySelector('.apex-player-error'));
  if(status==='rate-limited')await check('Quota prevents early retry',()=>document.querySelector('[data-apex-retry]').disabled);
  await capture('apex-'+status,1000,900);
  await check('Apex '+status+' recovery controls (simulated response)',status=>!!document.querySelector('[data-apex-back]')&&!document.querySelector('.apex-profile-identity')&&(status==='sign-in-required'?!!document.querySelector('[data-apex-sign-in]'):!!document.querySelector('[data-apex-retry]')),status);
  if(status==='rate-limited'){await pause(2100);await check('Quota retry recovers after the supplied cooldown',()=>!document.querySelector('[data-apex-retry]').disabled);}
  await run(()=>document.querySelector('[data-apex-back]').click());await until(()=>!!document.querySelector('.apex-player-form'));
 }
}
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'})[ext]||'application/octet-stream');let body=fs.readFileSync(process.argv.includes('--performance')&&process.argv.includes('--before')&&['/hub.js','/page-transition.js','/sotf-ui.js'].includes(pathname)?path.resolve(__dirname,'../.validation-cache/regressions-248/performance-baseline',pathname.slice(1)):process.argv.includes('--map-motion')&&process.argv.includes('--before')&&pathname==='/gzw-map.js'?path.resolve(__dirname,'../.validation-cache/regressions-248/gzw-map-before.js'):file);if(process.argv.includes('--fade-motion')&&process.argv.includes('--before')&&['/page-transition.js','/wardogs-fullscreen.css'].includes(pathname))body=require('node:child_process').execFileSync('git',['show','be81032:app'+pathname]);if(ext==='.html')body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');res.end(body);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:false,width:1920,height:1080,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true}});
 win.webContents.session.webRequest.onCompleted({urls:['https://cdn.gzwtacmap.com/*']},details=>{if(details.statusCode===200)report.terrainNetwork.loaded++;else report.terrainNetwork.httpFailures.push({url:details.url,status:details.statusCode});});
 win.webContents.session.webRequest.onErrorOccurred({urls:['https://cdn.gzwtacmap.com/*']},details=>report.terrainNetwork.networkFailures.push({url:details.url,error:details.error}));
 win.webContents.on('console-message',(_event,_level,message)=>{if(/Uncaught|Error:/.test(message))report.errors.push(message);});
const themeReview=process.argv.includes('--theme-review');
 if(process.argv.includes('--release-gate')){
  const boot=async(query,saved)=>{await win.loadURL('http://127.0.0.1:'+server.address().port+'/'+query);await run(fixture,data);await run(saved=>{localStorage.removeItem('dropzone-last-workspace');localStorage.setItem('dropzone-startup-game',JSON.stringify('last'));if(saved)localStorage.setItem('dropzone-last-workspace',JSON.stringify(saved));},saved);await win.webContents.executeJavaScript("(async()=>{await import('/hub.js');return true;})()");await pause(450);};
  await require('./check-release-gate.cjs')({boot,run,win,pause,capture,report});return;
 }
 if(process.argv.includes('--rl-material')){
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/?game=rocket-league');await run(fixture,data);await win.webContents.executeJavaScript("(async()=>{await import('/hub.js');return true;})()");await pause(250);
  await require('./check-rocket-league-material.cjs')({run,capture,report,pause});return;
 }
 if(process.argv.includes('--watch-glass')||process.argv.includes('--apex-videos')){
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/?game='+(process.argv.includes('--apex-videos')?'apex':'bo7'));await run(fixture,data);await win.webContents.executeJavaScript("(async()=>{await import('/hub.js');return true;})()");await pause(250);
  await require('./check-watch-glass.cjs')({run,win,pause,capture,report,data});return;
 }
 if(process.argv.includes('--apex-composition')||process.argv.includes('--apex-meta')||process.argv.includes('--appearance')){
  const boot=async(query='?game=apex')=>{await win.loadURL('http://127.0.0.1:'+server.address().port+'/'+query);await run(fixture,data);await win.webContents.executeJavaScript("(async()=>{await import('/hub.js');return true;})()");await pause(250);};
  await require(process.argv.includes('--appearance')?'./check-appearance.cjs':process.argv.includes('--apex-meta')?'./check-apex-meta.cjs':'./check-apex-composition.cjs')({boot,run,win,pause,capture,report,data});return;
 }
 if(process.argv.includes('--fade-motion')){
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/?game=home');await run(fixture,data);await win.webContents.executeJavaScript("(async()=>{await import('/hub.js');return true;})()");await pause(500);
  await require('./check-page-motion.cjs')({run,win,report,pause,output});return;
 }
 if(process.argv.includes('--performance')){
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/?game=home');await run(fixture,data);if(process.argv.includes('--map-motion'))await run(require('./check-map-motion.cjs').instrument);await win.webContents.executeJavaScript("(async()=>{await import('/hub.js');return true;})()");await pause(500);
  await require('./navigation-benchmark.cjs')({run,win,report,pause});return;
 }
const routes=process.argv.includes('--launch-options')?['settings']:process.argv.includes('--wardogs-overlays')?['wardogs']:process.argv.includes('--siege-refinement')?['siege']:process.argv.includes('--search-surfaces')?['lol','finals']:process.argv.includes('--interactions')?['wardogs','bo7','settings','sotf','apex']:process.argv.includes('--map-motion')?['gray-zone']:process.argv.includes('--padding-review')?['home','cod']:process.argv.includes('--regressions')?['home','wardogs','finals','gray-zone','cod','bo7','apex']:themeReview?['apex','wardogs']:process.argv.includes('--shell')?['home']:process.argv.includes('--details')?['siege','wardogs']:process.argv.includes('--navigation')?['home','gray-zone','lol','finals','bo7','warzone','mw4','siege','wardogs']:process.argv.includes('--live-apex')?['apex']:process.argv.includes('--extras')?['bo7','warzone','finals','lol','rocket-league','wardogs']:process.argv.includes('--apex')?['apex']:process.argv.includes('--polish')?['home','siege','apex']:process.argv.includes('--states')?['settings','updates','siege','finals','apex']:process.argv.includes('--map')?['gray-zone','sotf']:process.argv.includes('--quick')?['siege','gray-zone','sotf','rocket-league','apex']:['home','cod','bo7','warzone','mw4','finals','siege','gray-zone','sotf','rocket-league','lol','wardogs','updates','settings','sensitivity',...(data.games.some(g=>g.id==='apex')?['apex']:[])];
 if(process.argv.includes('--final-controls'))routes.splice(0,routes.length,'gray-zone','settings');
 if(process.argv.includes('--fresh-apex'))routes.splice(0,routes.length,'apex');
 for(const route of routes){
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/?game='+route);await run(fixture,data);if(process.argv.includes('--map-motion'))await run(require('./check-map-motion.cjs').instrument);await win.webContents.executeJavaScript("(async()=>{await import('/hub.js');return true;})()");if(!win.webContents.debugger.isAttached())win.webContents.debugger.attach('1.3');await pause(400);
  if(data.games.some(g=>g.id===route&&g.status==='under-construction')){for(const [w,h]of [[1920,1080],[2560,1440],[3840,2160],[1000,900]])await capture(route+'-construction',w,h);const passed=await run(()=>!!document.querySelector('.construction-hero')&&!document.querySelector('#gz-canvas'));report.flows.push({name:route+' remains under construction',passed});continue;}
  if(process.argv.includes('--final-controls')){await require('./check-final-controls.cjs')({route,run,win,pause,capture,report,data});continue;}
  if(process.argv.includes('--fresh-apex')){await liveApexChecks();continue;}
  if(process.argv.includes('--map-motion')){await require('./check-map-motion.cjs').run({run,win,pause,capture,report});continue;}
  if(process.argv.includes('--search-surfaces')){
   await run(route=>document.querySelector(route==='lol'?'[data-action="pick-champion"]':'[data-game-page="videos"]').click(),route);await pause(500);
   const style=await run(route=>{const s=getComputedStyle(document.querySelector(route==='lol'?'.picker-search input':'.fn-video-search input'));return{background:s.backgroundColor,shadow:s.boxShadow,backdrop:s.backdropFilter};},route);
   report.flows.push({name:route+' search wrapper owns its single glass surface',passed:style.background==='rgba(0, 0, 0, 0)'&&style.shadow==='none'&&style.backdrop==='none',style});
   for(const [w,h]of [[1000,900],[1920,1080]])await capture(route==='lol'?'lol-champion-picker-final':'finals-video-search-final',w,h);continue;
  }
  for(const [width,height]of themeReview?[[1920,1080]]:process.argv.includes('--regressions')?[[1920,1080],[2560,1440],[3840,2160],[1680,1050],[1280,800],[1000,900]]:[[1920,1080],[2560,1440],[3840,2160],[1000,900]])await capture((themeReview?'clear-glass-':'')+route,width,height);
  if(process.argv.includes('--launch-options')){await require('./check-launch-options.cjs')({run,win,pause,capture,report,data});continue;}
  if(process.argv.includes('--wardogs-overlays')){await require('./check-wardogs-overlays.cjs')({run,win,pause,capture,report,data});continue;}
  if(process.argv.includes('--siege-refinement')){await require('./check-siege-refinement.cjs')({run,win,pause,capture,report,data});continue;}
  if(process.argv.includes('--interactions')){await require('./check-regression-interactions.cjs')({route,run,win,pause,capture,report,data});continue;}
  if(process.argv.includes('--regressions')){await regressionChecks(route);continue;}
  if(themeReview){report.flows.push({name:route+' glass computed styles',styles:await run(()=>{const el=document.querySelector('.apex-player-form input,.wd-sight-tab'),css=getComputedStyle(el),box=el.getBoundingClientRect();return{background:css.backgroundColor,backgroundImage:css.backgroundImage,color:css.color,placeholder:getComputedStyle(el,'::placeholder').color,blur:css.backdropFilter,rect:{x:box.x,y:box.y,width:box.width,height:box.height}};})});continue;}
  if(route==='gray-zone'&&!process.argv.includes('--navigation'))await mapChecks();
  if(process.argv.includes('--navigation')||process.argv.includes('--shell'))await navigationChecks(route);
  if(process.argv.includes('--live-apex'))await liveApexChecks();else if(!process.argv.includes('--navigation')&&['siege','sotf','apex'].includes(route))await workspaceChecks(route);
  if(process.argv.includes('--states')||process.argv.includes('--all')||process.argv.includes('--details'))await stateChecks(route);
  if(process.argv.includes('--extras')||process.argv.includes('--all')||process.argv.includes('--details'))await extraChecks(route);
 }
}).catch(e=>report.errors.push(e.stack)).finally(()=>{for(const flow of report.flows)if(flow.passed===false||flow.failures?.length)report.errors.push('Failed flow: '+flow.name);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(output,'report'+(process.argv.slice(2).join('-')||'-full')+'.json'),JSON.stringify(report,null,2));console.log('Captures '+report.captures.length+'; errors '+report.errors.length);win?.destroy();server?.close();app.exit(report.errors.length?1:0);});
