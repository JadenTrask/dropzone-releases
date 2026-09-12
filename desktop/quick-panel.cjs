const SHORTCUTS=['CommandOrControl+Alt+D','CommandOrControl+Shift+Space','F8'];
function createQuickPanel({window,globalShortcut,screen}){
 let quick=false,normal=null,key=SHORTCUTS[0],registered=false;
 const status=()=>({quick,shortcut:key,registered});
 const send=()=>{if(!window.isDestroyed())window.webContents.send('quick-panel-status',status());};
 function full(){if(!quick)return status();quick=false;window.setAlwaysOnTop(false);window.setMinimumSize(1000,720);if(normal){window.setBounds(normal.bounds);if(normal.maximized)window.maximize();}window.show();send();return status();}
 function toggle(){
  if(quick&&window.isVisible()&&!window.isMinimized()){window.hide();return status();}
  if(!quick){normal={bounds:window.getNormalBounds(),maximized:window.isMaximized()};if(window.isMaximized())window.unmaximize();quick=true;const a=screen.getDisplayMatching(normal.bounds).workArea,width=Math.min(540,a.width),height=Math.min(830,a.height);window.setMinimumSize(Math.min(420,width),Math.min(540,height));window.setBounds({x:a.x+Math.max(0,a.width-width-20),y:a.y+Math.min(35,Math.max(0,a.height-height)),width,height});window.setAlwaysOnTop(true);}
  if(window.isMinimized())window.restore();window.show();window.focus();send();return status();
 }
 function register(value){if(!SHORTCUTS.includes(value))throw Error('Choose one of the supported shortcuts.');if(registered)globalShortcut.unregister(key);key=value;registered=globalShortcut.register(key,toggle);send();return status();}
 register(key);
 return {status,command(input){if(input==='toggle')return toggle();if(input==='full')return full();if(input==='hide'){if(quick)window.hide();return status();}if(input?.shortcut)return register(input.shortcut);return status();},destroy(){if(registered)globalShortcut.unregister(key);}};
}
module.exports={createQuickPanel,SHORTCUTS};
