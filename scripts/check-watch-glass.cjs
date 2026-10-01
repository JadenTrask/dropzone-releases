'use strict';
// Real bundled CDL catalogues; playback requests are blocked in this isolated
// renderer. This checks selection/embed construction, not YouTube availability.
const fs=require('node:fs'),path=require('node:path');
module.exports=async({run,win,pause,capture,report,data})=>{
 const apex=process.argv.includes('--apex-videos'),prefix=apex?'apex-algs':'bo7-cdl';
 const channel=data.media[apex?'apex-esports':'cod-league'];
 const playlist=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../app/data/media/'+channel.id+'-'+channel.catalog.playlists[0].id+'.json')));
 const check=async(name,fn)=>{const passed=await run(fn);report.flows.push({name,passed});if(!passed)throw Error(name);};
 const click=async selector=>{await run(selector=>document.querySelector(selector).click(),selector);await pause(150);};
 await run((channel,playlist)=>{window.qaWatchCalls=[];window.rift.media=async q=>{window.qaWatchCalls.push(q);return q.playlist?{game:q.game,playlist}:{game:q.game,channels:[channel]};};},channel,playlist);
 await click('[data-game-page="videos"]');await pause(350);
 if(process.argv.includes('--glass-diagnostic')){
  await capture('glass-diagnostic-base',1920,1080);
  const evidence=await run(()=>{const result=[];for(const selector of ['.video-copy','.watch-filter']){const chain=[];for(let n=document.querySelector(selector);n;n=n.parentElement){const c=getComputedStyle(n);chain.push({node:n.className||n.tagName,opacity:c.opacity,filter:c.filter,backdrop:c.backdropFilter,isolation:c.isolation,transform:c.transform,contain:c.contain,willChange:c.willChange,overflow:c.overflow,clip:c.clipPath,mask:c.maskImage});}result.push({selector,chain});}return result;});
  fs.writeFileSync(path.resolve(__dirname,'../.validation-cache/glass-compositing-diagnostic.json'),JSON.stringify(evidence,null,2));
  await run(()=>document.querySelector('.watch-page').style.isolation='auto');await capture('glass-diagnostic-no-isolation',1920,1080);
  await run(()=>{const s=document.createElement('style');s.textContent='.watch-page::before {opacity:1!important;filter:none!important;background-image:linear-gradient(#ffffff00,#ffffff00),url(./assets/cdl/league-white.svg)!important}';document.head.append(s);});await capture('glass-diagnostic-bright-logo',1920,1080);
  await run(()=>document.querySelector('#hub-app').style.viewTransitionName='none');await capture('glass-diagnostic-no-transition-root',1920,1080);
  await run(()=>{const s=document.createElement('style');s.textContent='.watch-page::before{z-index:0!important}.watch-page>*{position:relative;z-index:1}';document.head.append(s);});await capture('glass-diagnostic-positive-layers',1920,1080);
  await run(()=>document.querySelector('#hub-app').style.viewTransitionName='workspace-page');await capture('glass-diagnostic-positive-transition-root',1920,1080);
  await run(()=>{const s=document.createElement('style');s.textContent='.watch-page::before{display:none!important}.watch-page{background:url(./assets/cdl/league-white.svg) center/90% auto no-repeat fixed!important}';document.head.append(s);});await capture('glass-diagnostic-background-image',1920,1080);return;
 }
 if(apex){await run(id=>{const s=document.querySelector('#watch-archive');s.value=id;s.dispatchEvent(new Event('change',{bubbles:true}));},playlist.id);await pause(250);}
 for(const [w,h]of [[1920,1080],[2560,1440],[3840,2160],[1000,900]])await capture(prefix+'-glass',w,h);
 await check('CDL source playlist loaded with uncropped 16:9 thumbnails',()=>{const t=document.querySelector('.video-thumb').getBoundingClientRect();return document.querySelectorAll('.video-card').length===18&&Math.abs(t.width/t.height-16/9)<.03&&document.querySelectorAll('.video-copy').length===18;});
 await check('CDL logo is fixed at the visible window center',()=>{const s=getComputedStyle(document.querySelector('.watch-page'),'::before'),rail=document.querySelector('.app-rail').getBoundingClientRect(),filter=getComputedStyle(document.querySelector('.watch-filter'));return s.position==='fixed'&&Math.abs(parseFloat(s.left)-(innerWidth+rail.width)/2)<1&&Math.abs(parseFloat(s.top)-innerHeight/2)<1&&(/league-white|algs-logo/).test(s.backgroundImage)&&parseFloat(filter.backdropFilter.match(/blur\(([\d.]+)px\)/)?.[1])>=24&&s.pointerEvents==='none';});
 for(const [name,fraction]of [['top',0],['middle',.5],['bottom',1]]){
  await run(fraction=>{const p=document.querySelector('.watch-page');p.scrollTop=(p.scrollHeight-p.clientHeight)*fraction;window.qaWatchScroll=p.scrollTop;},fraction);
  await pause(120);await capture(prefix+'-fixed-'+name,1920,1080);
  await check('CDL backdrop stays fixed at '+name,()=>{const s=getComputedStyle(document.querySelector('.watch-page'),'::before');return s.position==='fixed'&&Math.abs(parseFloat(s.top)-innerHeight/2)<1&&document.querySelectorAll('.app-rail').length===1;});
 }
 await run(()=>document.querySelector('.watch-page').scrollTop=0);
 await run(()=>{const i=document.querySelector('#watch-search');i.value=document.querySelector('.video-card strong').textContent.split(' ')[0];i.dispatchEvent(new Event('input',{bubbles:true}));});
 await check('Search filters actual official titles',()=>{const cards=[...document.querySelectorAll('.video-card')];return cards.length>0&&cards.every(c=>c.textContent.toLowerCase().includes(document.querySelector('#watch-search').value.toLowerCase()));});
 await run(()=>{const i=document.querySelector('#watch-search');i.value='no-result-qa-7849';i.dispatchEvent(new Event('input',{bubbles:true}));});
 await check('No-match state preserves search',()=>!document.querySelector('.video-card')&&document.querySelector('.cod-empty').textContent.includes('No matching'));
 await run(()=>{const i=document.querySelector('#watch-search');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));});await click('[data-more-videos]');
 await check('Show more expands archive without altering source data',()=>document.querySelectorAll('.video-card').length===36);
 await click('[data-video]');await check('Selecting a video waits for explicit playback',()=>!!document.querySelector('[data-start-video]')&&!document.querySelector('.watch-player iframe'));
 await win.webContents.debugger.sendCommand('Network.setBlockedURLs',{urls:['*youtube-nocookie.com/embed/*']});
 await click('[data-start-video]');
 await check('Explicit playback constructs official privacy-enhanced embed',()=>{const f=document.querySelector('.watch-player iframe');return f?.src.startsWith('https://www.youtube-nocookie.com/embed/')&&f.src.includes('playsinline=1')&&f.getAttribute('referrerpolicy')==='strict-origin-when-cross-origin';});
 await click('[data-close-video]');await check('Close removes embedded player',()=>!document.querySelector('.watch-player-section'));
 await click('[data-play-playlist]');await check('Full playlist uses selected official archive',()=>document.querySelector('.watch-player-heading h2').textContent===document.querySelector('#watch-archive option:checked').textContent);await click('[data-close-video]');
 await run(()=>{const s=document.querySelector('#watch-archive');s.value='broadcasts';s.dispatchEvent(new Event('change',{bubbles:true}));});await pause(150);
 await check('Archive selection changes to recent broadcasts',()=>document.querySelector('#watch-archive').value==='broadcasts'&&!!document.querySelector('.video-card strong'));
 await click('[data-watch-tab="latest"]');await check('Latest uploads removes archive control',()=>!document.querySelector('#watch-archive')&&document.querySelectorAll('.video-card').length>0);
 if(apex){
  await click('[data-game-page="apex-esports"]');await pause(250);await check('Apex Esports news remains available',()=>document.querySelectorAll('.apex-editorial-grid .apex-article').length>0);
  await run(()=>history.back());await pause(400);await check('Back restores Apex Videos and its active shared tab',()=>!!document.querySelector('.watch-page[data-watch-game=apex]')&&document.querySelector('[data-game-page=videos]').getAttribute('aria-current')==='page');
 }
 await run(()=>document.querySelector('[data-game-page="loadouts"]').click());await pause(350);
 await check('CDL material does not remain in loadouts',()=>!document.querySelector('.watch-page'));
};
