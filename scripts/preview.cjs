const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createServices}=require('../core/services.cjs');
const root=path.resolve(__dirname,'../app');
const services=createServices({cacheDir:path.resolve(__dirname,'../.preview-cache/feeds'),leagueCacheDir:path.resolve(__dirname,'../.preview-cache'),bundleDir:path.join(root,'data')});
const {provider,games}=services;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const port=Number(process.env.RIFT_PORT)||4173;
http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,`http://127.0.0.1:${port}`);
    if(u.pathname.startsWith('/api/')){
      let data;
      if(u.pathname==='/api/games')data=games.list();
      else if(u.pathname==='/api/loadouts')data=await games.builds(Object.fromEntries(u.searchParams));
      else if(u.pathname==='/api/media')data=await services.media.list(Object.fromEntries(u.searchParams));
      else if(u.pathname==='/api/patches')data=await services.patches.list(Object.fromEntries(u.searchParams));
      else if(u.pathname==='/api/siege')data=await services.siege.get(Object.fromEntries(u.searchParams));
      else if(u.pathname==='/api/wardogs')data=await services.wardogs.get(Object.fromEntries(u.searchParams));
      else if(u.pathname==='/api/updates')data=req.method==='POST'?services.updates.check():services.updates.status();
      else if(u.pathname==='/api/catalog')data=await provider.getCatalog(u.searchParams.get('refresh')==='true');
      else if(u.pathname==='/api/modes')data=services.modes;
      else if(u.pathname==='/api/status')data=await provider.status();
      else if(u.pathname==='/api/build')data=await provider.build(Object.fromEntries(u.searchParams));
      else if(u.pathname==='/api/clear-cache'&&req.method==='POST')data=await provider.clearCache();
      else {res.writeHead(404);return res.end();}
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(data));
    }
    const file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
    const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(content);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
}).listen(port,'0.0.0.0',()=>{console.log(`Dropzone preview: http://localhost:${port}`);services.updates.check();});
setInterval(()=>services.updates.check(),15*60_000).unref();
