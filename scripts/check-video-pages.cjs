'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=async({boot,run,win,pause,capture,report,output,data})=>{
 const check=(name,passed,details={})=>{report.flows.push({name,passed,...details});if(!passed)throw Error(name);};
 const wait=async fn=>{for(let i=0;i<100;i++){if(await run(fn))return;await pause(50);}throw Error('Video UI readiness timed out');};
 for(const game of ['bo7','apex','siege','lol','finals','rocket-league']){
  await boot(game);await run(game=>document.querySelector(game==='rocket-league'?'[data-rl-view="videos"]':'[data-game-page="videos"]').click(),game);await wait(()=>!!document.querySelector('.watch-page')&&!document.querySelector('[data-refresh-videos]').disabled);
  for(const [w,h]of (process.argv.includes('--video-interactions')?[[1920,1080]]:[[1920,1080],[2560,1440],[3840,2160],[1000,900]])){
   await capture('videos-'+game,w,h);
   const metrics=await run(()=>{const cards=[...document.querySelectorAll('.video-card')];return{cards:cards.length,titlesSeparate:cards.every(card=>{const a=card.querySelector('.video-copy>strong').getBoundingClientRect(),b=card.querySelector('.video-copy>small').getBoundingClientRect();return a.bottom+5<=b.top&&a.width>50;}),blur:cards[0]?getComputedStyle(cards[0].querySelector('.video-copy')).backdropFilter:null,overflow:[...document.querySelectorAll('.video-copy')].some(n=>n.scrollWidth>n.clientWidth+1),heading:getComputedStyle(document.querySelector('.watch-page h1')).fontSize};});
   check(game+' titles wrap separately from metadata at '+w,metrics.cards>0&&metrics.titlesSeparate&&!metrics.overflow,metrics);check(game+' title panels diffuse the backdrop at '+w,metrics.blur&&metrics.blur!=='none');
  }
  if(process.argv.includes('--video-interactions')){
   const scrolling=await run(()=>{const page=document.querySelector('.watch-page'),scroller=page.closest('.rl-main-panel')||page;const top=document.querySelector('.video-card').getBoundingClientRect().top,before=getComputedStyle(page,'::before');const fixed={position:before.position,top:before.top,left:before.left};scroller.scrollTop=500;return{movement:top-document.querySelector('.video-card').getBoundingClientRect().top,offset:scroller.scrollTop,fixed,after:{position:getComputedStyle(page,'::before').position,top:getComputedStyle(page,'::before').top,left:getComputedStyle(page,'::before').left}};});
   check(game+' scrolls without moving the viewport backdrop',scrolling.offset>0&&scrolling.movement>0&&scrolling.fixed.position==='fixed'&&JSON.stringify(scrolling.fixed)===JSON.stringify(scrolling.after),scrolling);await capture('videos-'+game+'-scroll',1920,1080);
   const more=await run(()=>{const button=document.querySelector('[data-more-videos]');if(button.hidden)return null;const page=document.querySelector('.watch-page'),scroller=page.closest('.rl-main-panel')||page;const before=scroller.scrollTop,count=document.querySelectorAll('.video-card').length;button.click();const fresh=document.querySelector('.watch-page');return{before,after:(fresh.closest('.rl-main-panel')||fresh).scrollTop,count,next:document.querySelectorAll('.video-card').length};});if(more)check(game+' Show more retains scroll and expands results',Math.abs(more.after-more.before)<1&&more.next>more.count,more);
   await run(()=>{const page=document.querySelector('.watch-page');(page.closest('.rl-main-panel')||page).scrollTop=0;});
  }
  await run(()=>{const e=document.querySelector('#watch-search');e.value='this-title-does-not-exist-qa';e.dispatchEvent(new Event('input',{bubbles:true}));});check(game+' local search empty state',await run(()=>!!document.querySelector('.watch-empty')&&!document.querySelector('.video-card')));await capture('videos-'+game+'-empty',1920,1080);
  await run(()=>{const e=document.querySelector('#watch-search');e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-video]').click();});check(game+' selection does not autoplay',await run(()=>!!document.querySelector('[data-start-video]')&&!document.querySelector('iframe')));
  await run(()=>document.querySelector('[data-close-video]').click());check(game+' close removes player',await run(()=>!document.querySelector('#watch-player-section')));
  await run(()=>document.querySelector('[data-watch-tab="latest"]').click());check(game+' uploads hide archive controls',await run(()=>!document.querySelector('#watch-archive')&&document.querySelector('.watch-results-heading h2').textContent==='Latest uploads'));
  await run(()=>{window.qaOriginalMedia=rift.media;rift.media=()=>new Promise(resolve=>window.qaReleaseMedia=()=>qaOriginalMedia({game:document.querySelector('.watch-page').dataset.watchGame}).then(resolve));document.querySelector('[data-refresh-videos]').click();});check(game+' refresh exposes loading state',await run(()=>document.querySelector('[data-refresh-videos]').disabled&&document.querySelector('#watch-video-grid').getAttribute('aria-busy')==='true'));
  await run(()=>qaReleaseMedia());await wait(()=>!document.querySelector('[data-refresh-videos]').disabled);
  await run(()=>{rift.media=async()=>{throw Error('Offline verification fixture');};document.querySelector('[data-refresh-videos]').click();});await wait(()=>!!document.querySelector('.watch-alert'));check(game+' failed refresh preserves available videos',await run(()=>document.querySelectorAll('.video-card').length>0&&document.querySelector('.watch-alert').textContent.includes('Available videos')));await capture('videos-'+game+'-error',1920,1080);
  await run(()=>rift.media=qaOriginalMedia);
  if(game==='rocket-league'){
   await run(()=>{window.qaOldMedia=rift.media;rift.media=()=>new Promise(resolve=>window.qaLateMedia=()=>qaOldMedia({game:'rocket-league'}).then(resolve));document.querySelector('[data-refresh-videos]').click();document.querySelector('[data-rl-view="history"]').click();});await pause(300);await run(()=>qaLateMedia());await pause(100);
   check('Rocket League late video response cannot replace tracker tab',await run(()=>!document.querySelector('.watch-page')&&document.querySelector('[data-rl-view="history"]').getAttribute('aria-pressed')==='true'));
   await run(()=>{rift.media=qaOldMedia;document.querySelector('[data-rl-view="videos"]').click();});await wait(()=>!!document.querySelector('.watch-page'));await run(()=>document.querySelector('[data-route="apex"]').click());await pause(350);check('Leaving Rocket League cleans up embedded video page',await run(()=>!document.querySelector('.rl-commandbar')&&!document.querySelector('[data-watch-game="rocket-league"]')));
  }
 }
 fs.writeFileSync(path.resolve(output,'../../videos-250/renderer-report.json'),JSON.stringify(report,null,2));
};
