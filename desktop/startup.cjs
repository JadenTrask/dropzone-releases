// One window: the renderer owns both the ident and the page underneath it.
function coordinateStartup({main,limit=10000,schedule=setTimeout,cancel=clearTimeout}){
  let finished=false,timer;
  const finish=()=>{
    if(finished||main.isDestroyed())return;
    finished=true;cancel(timer);main.show();main.webContents.send?.('startup-reveal');
  };
  main.once('ready-to-show',finish);
  timer=schedule(finish,limit);
  main.once('closed',()=>{finished=true;cancel(timer);});
  return {finish};
}
module.exports={coordinateStartup};
