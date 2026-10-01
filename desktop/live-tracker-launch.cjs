'use strict';
function chooseBounds(displays,primaryId,current,gameDisplayId){
 const usable=displays.filter(d=>d?.workArea&&[d.workArea.x,d.workArea.y,d.workArea.width,d.workArea.height].every(Number.isFinite)&&d.workArea.width>0&&d.workArea.height>0);
 if(!usable.length)return null;
 const gameKnown=usable.some(d=>String(d.id)===String(gameDisplayId));
 const target=(gameKnown?usable.find(d=>String(d.id)!==String(gameDisplayId)):usable.find(d=>String(d.id)!==String(primaryId)))||usable[0];
 const area=target.workArea,width=Math.min(area.width,Math.max(1000,Number.isFinite(current?.width)?current.width:1480)),height=Math.min(area.height,Math.max(720,Number.isFinite(current?.height)?current.height:980));
 // Electron screen workAreas and BrowserWindow bounds are both device-independent.
 return {x:Math.round(area.x+(area.width-width)/2),y:Math.round(area.y+(area.height-height)/2),width:Math.floor(width),height:Math.floor(height)};
}
function createLiveTrackerLaunch({window,screen,desktopCapturer,preferences,now=Date.now}){
 let ready=false,startupReady=false,destroyed=false,generation=0,pending=null,positionManaged=false;
 const valid=value=>value&&typeof value.id==='string'&&['freeplay','private','public'].includes(value.kind)&&Number.isFinite(value.receivedAt)&&now()-value.receivedAt>=0&&now()-value.receivedAt<=5000;
 async function open(value){
  if(!ready||!startupReady||destroyed||window.isDestroyed()||!valid(value)||!preferences.status().openLiveTrackerOnSession)return;
  const ticket=++generation;let gameDisplayId;
  let timeout;try{const sources=await Promise.race([desktopCapturer.getSources({types:['window'],thumbnailSize:{width:0,height:0},fetchWindowIcons:false}),new Promise(resolve=>{timeout=setTimeout(()=>resolve([]),750);})]);const game=sources.find(source=>/^Rocket League(?: \(.*\))?$/i.test(source.name));if(game?.display_id)gameDisplayId=game.display_id;}catch{}finally{clearTimeout(timeout);}
  if(ticket!==generation||destroyed||window.isDestroyed()||!valid(value)||!preferences.status().openLiveTrackerOnSession)return;
  // Claim before showing. Repeated packets, reconnects, dismissal and app restarts
  // cannot reopen the same identified session. A failed save safely stays closed.
  if(!preferences.claimSession(value.id))return;
  try{
   const bounds=chooseBounds(screen.getAllDisplays(),screen.getPrimaryDisplay().id,window.getNormalBounds(),gameDisplayId);
   // Quick Panel is explicitly always-on-top. Leave its presentation untouched;
   // automatic opening must never promote a window above the game.
   if(window.isAlwaysOnTop())return;
   if(bounds){window.setMinimumSize(Math.min(1000,bounds.width),Math.min(720,bounds.height));window.setBounds(bounds,false);positionManaged=true;}
   window.webContents.send('open-live-tracker',{reason:'session-start',kind:value.kind});
   // showInactive handles a hidden/minimized existing window without focus().
   // No restore(), show(), activation, new window, or always-on-top operation.
   window.showInactive();
  }catch{/* A display change or closing window must not interrupt the game. */}
 }
 function session(value){if(!valid(value))return;if(!ready||!startupReady){pending=value;return;}void open(value);}
 function drain(){if(!ready||!startupReady)return;const value=pending;pending=null;if(value)void open(value);}
 function rendererReady(){ready=true;drain();}
 function windowReady(){startupReady=true;drain();}
 function dismiss(){if(!startupReady)return;generation++;pending=null;}
 function suspend(){generation++;pending=null;ready=false;}
 function displayChanged(){if(!positionManaged||!preferences.status().openLiveTrackerOnSession||destroyed||window.isDestroyed()||!window.isVisible()||window.isMinimized()||window.isAlwaysOnTop())return;try{const displays=screen.getAllDisplays(),current=window.getNormalBounds();if(displays.some(d=>current.x>=d.workArea.x&&current.y>=d.workArea.y&&current.x+current.width<=d.workArea.x+d.workArea.width&&current.y+current.height<=d.workArea.y+d.workArea.height))return;const bounds=chooseBounds(displays,screen.getPrimaryDisplay().id,current);if(bounds){window.setMinimumSize(Math.min(1000,bounds.width),Math.min(720,bounds.height));window.setBounds(bounds,false);}}catch{}}
 screen.on('display-removed',displayChanged);screen.on('display-metrics-changed',displayChanged);
 window.on('minimize',dismiss);window.on('hide',dismiss);
 return {session,rendererReady,windowReady,suspend,destroy(){destroyed=true;suspend();window.removeListener('minimize',dismiss);window.removeListener('hide',dismiss);screen.removeListener('display-removed',displayChanged);screen.removeListener('display-metrics-changed',displayChanged);}};
}
module.exports={createLiveTrackerLaunch,chooseBounds};
