// A local splash never waits for feeds or update downloads.
function coordinateStartup({main,splash,delay=2000,limit=10000,schedule=setTimeout,cancel=clearTimeout}){
  let mainReady=false,minimumElapsed=false,finished=false,minimumTimer,limitTimer;
  const finish=()=>{
    if(finished||main.isDestroyed())return;
    finished=true;cancel(minimumTimer);cancel(limitTimer);
    main.show();main.webContents.send?.('startup-reveal');if(!splash.isDestroyed())splash.destroy();
  };
  const maybe=()=>{if(mainReady&&minimumElapsed)finish();};
  main.once('ready-to-show',()=>{mainReady=true;maybe();});
  splash.once('ready-to-show',()=>{if(finished)return;splash.show();minimumTimer=schedule(()=>{minimumElapsed=true;maybe();},delay);});
  splash.webContents.once('did-fail-load',()=>{minimumElapsed=true;maybe();});
  limitTimer=schedule(finish,limit);
  main.once('closed',()=>{finished=true;cancel(minimumTimer);cancel(limitTimer);if(!splash.isDestroyed())splash.destroy();});
  return {finish};
}
module.exports={coordinateStartup};
