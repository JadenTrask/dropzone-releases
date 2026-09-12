'use strict';
const http=require('node:http'),crypto=require('node:crypto'),os=require('node:os'),fs=require('node:fs/promises'),path=require('node:path');
const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y);};
function createCompanionServer(){
 let server=null,token='',snapshot={title:'Dropzone',cards:[],slots:[]},version=0,expires=0,port=0,timer;
 function status(){return {active:!!server,expiresAt:expires?new Date(expires).toISOString():null,version,urls:server?Object.values(os.networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal).map(x=>`http://${x.address}:${port}/#${token}`):[]};}
 async function stop(){clearTimeout(timer);const s=server;server=null;token='';expires=0;port=0;s?.closeAllConnections();if(s)await new Promise(r=>s.close(r));return status();}
 function setSnapshot(value){if(!value||JSON.stringify(value).length>250000)throw Error('Shared workspace too large.');snapshot={title:String(value.title||'Dropzone').slice(0,120),game:String(value.game||'').slice(0,40),cards:(value.cards||[]).slice(0,100).map(c=>({title:String(c.title||'').slice(0,120),body:String(c.body||'').slice(0,16000),kind:String(c.kind||'').slice(0,30)})),slots:(value.slots||[]).slice(0,6).map(s=>({name:String(s.name||'').slice(0,80),pick:String(s.pick||'').slice(0,80),role:String(s.role||'').slice(0,80),utility:String(s.utility||'').slice(0,300),ready:!!s.ready}))};version++;return status();}
 async function start(value){await stop();setSnapshot(value);token=crypto.randomBytes(24).toString('hex');expires=Date.now()+8*3600000;
 server=http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
 try{if(req.url==='/'||req.url==='/companion.js'||req.url==='/companion.css'){if(req.method!=='GET'){res.writeHead(405);return res.end();}const file=req.url==='/'?'companion.html':req.url.slice(1);res.setHeader('Content-Type',file.endsWith('html')?'text/html':file.endsWith('css')?'text/css':'text/javascript');return res.end(await fs.readFile(path.join(__dirname,'../app',file)));}
 if(req.url!=='/api/room'){res.writeHead(404);return res.end();}
 if(Date.now()>expires||!equal(req.headers.authorization,'Bearer '+token)){res.writeHead(401);return res.end('{}');}
 if(req.method==='POST'){
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)throw Error('Origin rejected.');
  let raw='';for await(const c of req){raw+=c;if(raw.length>4000)throw Error('Too large.');}const input=JSON.parse(raw);
  if(input.version!==version){res.writeHead(409);return res.end(JSON.stringify({error:'The draft changed. Refresh and retry.'}));}
  if(!Number.isInteger(input.slot)||input.slot<0||input.slot>=snapshot.slots.length)throw Error('Invalid slot.');
  const old=snapshot.slots[input.slot];snapshot.slots[input.slot]={...old,name:String(input.name||'').slice(0,80),pick:String(input.pick||'').slice(0,80),role:String(input.role||'').slice(0,80),ready:!!input.ready};version++;
 }else if(req.method!=='GET'){res.writeHead(405);return res.end();}
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({snapshot,version,expiresAt:new Date(expires).toISOString()}));
 }catch{res.writeHead(400);res.end(JSON.stringify({error:'Invalid room request.'}));}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'0.0.0.0',()=>{port=server.address().port;resolve();});});timer=setTimeout(stop,8*3600000);timer.unref();return status();}
 return {start,stop,status,update:setSnapshot,read:()=>({snapshot,version}),getPort:()=>port};
}
module.exports={createCompanionServer};
