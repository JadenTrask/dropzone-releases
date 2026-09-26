'use strict';

// Socket parsing and SQLite never run on Electron's main or renderer threads.

const {parentPort,workerData}=require('node:worker_threads');

const {DatabaseSync}=require('node:sqlite');

const {mkdirSync}=require('node:fs');

const path=require('node:path');

const {randomUUID}=require('node:crypto');

const {execFile}=require('node:child_process');

const {MatchTracker,aggregate,isFreePlay}=require('./rocket-league-model.cjs');

const defaults={tracking:true,record:true,autoSession:true,eventFeed:true,keepHistory:true,mode:'auto',identity:'',port:49124,diagnostics:false};

const matchOnly="COALESCE(json_extract(data,'$.game.PlaylistId'),-1) NOT IN (9,73)";
let historyDays=365;
let lastAccepted=0,lastEvent='',lastMatch=null,localIdentity='';

let db,settings={...defaults},session=null,socket=null,retry=null,flush=null,endTimer=null,timeout=null,disconnectTimer=null,checkpointAt=0,visible=false,connected=false,stopped=false,attempt=0,gameDetected=false,error='',writes=0,dataRevision=0,lastUI=0,lastMessage=0,rate=0,rateStart=Date.now(),rateCount=0;

const failedSaves=new Map();let saveRetry=null,lastLifecycle='',suppressedSessionMatch=null;

function storage(fn){try{return fn();}catch(e){error='Local storage unavailable: '+e.message;return null;}}

function put(key,value){return storage(()=>{db.prepare('INSERT OR REPLACE INTO config VALUES (?,?)').run(key,JSON.stringify(value));writes++;return true;});}

function open(){mkdirSync(workerData.directory,{recursive:true});db=new DatabaseSync(path.join(workerData.directory,'history.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=2000; CREATE TABLE IF NOT EXISTS config(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY,started INTEGER NOT NULL,status TEXT NOT NULL,session TEXT,data TEXT NOT NULL); CREATE INDEX IF NOT EXISTS matches_started ON matches(started DESC); CREATE INDEX IF NOT EXISTS matches_session ON matches(session,started); CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,started INTEGER,ended INTEGER);');

 const get=k=>{const row=db.prepare('SELECT value FROM config WHERE key=?').get(k);return row?JSON.parse(row.value):null;};settings={...defaults,...get('settings')};session=get('session');

 const previous=db.prepare("SELECT data FROM matches WHERE status IN ('complete','partial') AND COALESCE(json_extract(data,'$.game.PlaylistId'),-1) NOT IN (9,73) ORDER BY started DESC LIMIT 1").get();if(previous)lastMatch=JSON.parse(previous.data);

 const pending=get('pending');if(pending){pending.interrupted=true;pending.completeStart=false;pending.ended=false;saveMatch(pending);put('pending',null);}

 if(session&&Date.now()-session.last>90*60_000){db.prepare('UPDATE sessions SET ended=? WHERE id=?').run(session.last,session.id);session=null;put('session',null);}

}

function startSession(){if(session)endSession();session={id:randomUUID(),started:Date.now(),last:Date.now()};storage(()=>db.prepare('INSERT INTO sessions VALUES (?,?,NULL)').run(session.id,session.started));put('session',session);dataRevision++;}

function endSession(){if(session)storage(()=>db.prepare('UPDATE sessions SET ended=? WHERE id=?').run(Date.now(),session.id));session=null;put('session',null);dataRevision++;}

function saveMatch(m){if(isFreePlay(m)){put('pending',null);return;}pruneHistory();if(m.ended)lastMatch=structuredClone(m);if(!settings.record||!settings.keepHistory)return;const saved=storage(()=>{

 m.status=m.ended?(m.completeStart&&!m.interrupted?'complete':'partial'):'incomplete';

 const existing=db.prepare('SELECT status FROM matches WHERE id=?').get(m.id);if(existing?.status==='complete')return true;

 if(session&&Date.now()-session.last>90*60_000&&settings.autoSession)endSession();if(!session&&settings.autoSession&&m.id!==suppressedSessionMatch)startSession();if(session){session.last=Date.now();put('session',session);}

 db.prepare('INSERT INTO matches VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,data=excluded.data').run(m.id,m.startedAt,m.status,session?.id||null,JSON.stringify(m));writes++;dataRevision++;put('pending',null);return true;

 });if(saved){failedSaves.delete(m.id);if(!failedSaves.size)error='';}else{if(failedSaves.size<8||failedSaves.has(m.id))failedSaves.set(m.id,m);else error='Storage unavailable; recovery queue is full. Free disk space and restart Dropzone.';if(!saveRetry)saveRetry=setTimeout(()=>{saveRetry=null;for(const item of [...failedSaves.values()])saveMatch(item);emit();},30000);}}

const tracker=new MatchTracker({save:saveMatch,checkpoint:m=>{if(settings.record&&settings.keepHistory&&!isFreePlay(m)&&m.players.length)put('pending',m);}});

storage(open);

function linkLocalIdentity(){if(!localIdentity)return;const saved=storage(()=>db.prepare("SELECT 1 FROM matches,json_each(matches.data,'$.players') p WHERE json_extract(p.value,'$.PrimaryId')=? LIMIT 1").get(localIdentity));if((saved||tracker.match?.players.some(p=>p.PrimaryId===localIdentity))&&settings.identity!==localIdentity){settings.identity=localIdentity;put('settings',settings);dataRevision++;}}

function state(){return {historyDays,feed:{receivedAt:lastMessage,acceptedAt:lastAccepted,event:lastEvent,messages:tracker.messages,rejected:tracker.malformed},status:!settings.tracking?'disabled':connected?(tracker.replaying?'replay':tracker.match&&!tracker.match.ended?'live':'connected'):gameDetected?'api-unavailable':'waiting',connected,settings,session,match:tracker.match?{...tracker.match,events:settings.eventFeed?tracker.match.events:[]}:null,lastMatch:lastMatch?{...lastMatch,events:settings.eventFeed?lastMatch.events:[]}:null,replay:tracker.replay,error,dataRevision,diagnostics:{messages:tracker.messages,malformed:tracker.malformed,rate,writes,database:db?(error?'error':'ready'):'unavailable',queue:failedSaves.size,uptime:Math.round(process.uptime())}};}

function emit(force=false){const lifecycle=!settings.tracking?'inactive':tracker.match&&!tracker.match.ended&&connected?'active':connected?'game-detected':'idle';if(lifecycle!==lastLifecycle){lastLifecycle=lifecycle;parentPort.postMessage({event:'lifecycle',value:lifecycle});}if(!visible)return;const wait=settings.mode==='low'?1000:settings.mode==='normal'?100:200,delay=Math.max(0,lastUI+wait-Date.now());if(force||!delay){clearTimeout(flush);flush=null;lastUI=Date.now();parentPort.postMessage({event:'state',value:state()});}else if(!flush)flush=setTimeout(()=>{flush=null;emit();},delay);}

function closeSocket(){clearTimeout(timeout);const old=socket;socket=null;if(old){old.onclose=old.onerror=old.onmessage=old.onopen=null;try{old.close();}catch{}}connected=false;}

function schedule(){if(stopped||!settings.tracking)return;clearTimeout(retry);const delays=[2000,5000,15000,30000,60000];retry=setTimeout(connect,delays[Math.min(attempt++,4)]);retry.unref();}

function lost(){closeSocket();tracker.disconnect();if(!disconnectTimer){disconnectTimer=setTimeout(()=>{disconnectTimer=null;if(tracker.match){tracker.finish('Connection lost');emit();}},60000);disconnectTimer.unref();}if(tracker.match?.ended){clearTimeout(endTimer);endTimer=null;tracker.finish('Connection closed after result');}emit();schedule();}

function detect(){if(process.platform!=='win32')return;execFile('tasklist.exe',['/FI','IMAGENAME eq RocketLeague.exe','/FO','CSV','/NH'],{windowsHide:true,timeout:3000,maxBuffer:32000},(e,out)=>{gameDetected=!e&&/RocketLeague\.exe/i.test(out);emit();});}

function connect(){if(stopped||!settings.tracking||socket)return;if(attempt===0||attempt>=4)detect();

 try{socket=new WebSocket('ws://127.0.0.1:'+settings.port);socket.onopen=()=>{clearTimeout(timeout);attempt=0;connected=true;gameDetected=true;emit();};

 socket.onmessage=event=>{if(typeof event.data!=='string'||event.data.length>262144){tracker.malformed++;return;}try{const msg=JSON.parse(event.data);lastMessage=Date.now();if(msg.Event==='UpdateState'){clearTimeout(disconnectTimer);disconnectTimer=null;}rateCount++;if(lastMessage-rateStart>=1000){rate=rateCount*1000/(lastMessage-rateStart);rateStart=lastMessage;rateCount=0;}

 const accepted=tracker.ingest(msg);lastEvent=typeof msg.Event==='string'?msg.Event:'';if(accepted){lastAccepted=lastMessage;if(localIdentity&&settings.identity!==localIdentity&&tracker.match?.players.some(p=>p.PrimaryId===localIdentity))linkLocalIdentity();if(tracker.match&&!isFreePlay(tracker.match)&&tracker.match.players.length&&!session&&settings.autoSession&&settings.record&&settings.keepHistory&&tracker.match.id!==suppressedSessionMatch)startSession();if(tracker.match?.ended&&!endTimer)endTimer=setTimeout(()=>{endTimer=null;if(tracker.match?.ended)tracker.finish('Match ended');emit();},1500);

 if(tracker.match&&Date.now()-checkpointAt>30000){checkpointAt=Date.now();if(settings.record&&settings.keepHistory&&!isFreePlay(tracker.match)&&tracker.match.players.length)put('pending',tracker.match);}

 emit();}else emit();}catch{tracker.malformed++;emit();}};

 socket.onclose=lost;socket.onerror=lost;timeout=setTimeout(()=>{if(!connected)lost();},4000);timeout.unref();

 }catch{lost();}}

function sinceDays(days){return Date.now()-Math.min(historyDays,[7,14,30,90,180,365].includes(days)?days:historyDays)*86400000;}
function pruneHistory(){const cutoff=sinceDays(historyDays);storage(()=>db.prepare('DELETE FROM matches WHERE started<?').run(cutoff));if(lastMatch?.startedAt<cutoff)lastMatch=null;}

function rows(limit,sessionId,since=0){since=Math.max(since,sinceDays(historyDays));const where=" WHERE "+matchOnly+" AND status='complete' AND EXISTS (SELECT 1 FROM json_each(matches.data,'$.players') WHERE json_extract(value,'$.PrimaryId')=?)"+(sessionId?' AND session=?':'')+' AND started>=?';return db.prepare(`SELECT data FROM (SELECT json_object('id',id,'startedAt',started,'status',status,'winner',json_extract(data,'$.winner'),'overtime',json_extract(data,'$.overtime'),'game',json(json_extract(data,'$.game')),'players',json(json_extract(data,'$.players'))) AS data,started FROM matches${where} ORDER BY started DESC LIMIT ?) ORDER BY started`).iterate(settings.identity,...(sessionId?[sessionId,since,limit]:[since,limit]));}

function command(input){if(!input||typeof input!=='object')throw Error('Invalid tracker request.');

 switch(input.action){

 case 'history-policy':historyDays=input.days===365?365:30;pruneHistory();dataRevision++;emit(true);return state();
 case 'state':return state();

 case 'visible':visible=input.value===true;if(!visible){clearTimeout(flush);flush=null;}else emit(true);return {ok:true};

 case 'settings':{

  const v=input.value||{},next={...settings};for(const k of ['tracking','record','autoSession','eventFeed','keepHistory','diagnostics'])if(typeof v[k]==='boolean')next[k]=v[k];if(['auto','normal','low'].includes(v.mode))next.mode=v.mode;

  if(v.avatar===''||(typeof v.avatar==='string'&&v.avatar.length<200000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v.avatar)))next.avatar=v.avatar;

  if(typeof v.identity==='string'&&v.identity.length<=160)next.identity=v.identity;

  if(v.port!==undefined){if(!Number.isInteger(v.port)||v.port<1024||v.port>65535)throw Error('Use a WebPort between 1024 and 65535.');next.port=v.port;}

  const reconnect=next.port!==settings.port||next.tracking!==settings.tracking;settings=next;put('settings',settings);

  if(!settings.record||!settings.keepHistory){put('pending',null);failedSaves.clear();clearTimeout(saveRetry);saveRetry=null;}

  if(reconnect){clearTimeout(retry);closeSocket();tracker.disconnect();attempt=0;if(settings.tracking)connect();}

  emit(true);return state();}

 case 'session-start':suppressedSessionMatch=null;startSession();emit(true);return state();

 case 'session-end':suppressedSessionMatch=tracker.match?.id||null;endSession();emit(true);return state();

 case 'history':{const since=sinceDays(input.days);const offset=Number.isInteger(input.offset)&&input.offset>=0?Math.min(input.offset,10000000):0;return storage(()=>({total:db.prepare('SELECT count(*) n FROM matches WHERE '+matchOnly+' AND started>=?').get(since).n,matches:db.prepare('SELECT data FROM matches WHERE '+matchOnly+' AND started>=? ORDER BY started DESC LIMIT 25 OFFSET ?').all(since,offset).map(r=>JSON.parse(r.data))}))||{matches:[],total:0,error};}

 case 'local-identity':if(typeof input.identity==='string'&&/^Steam\|[0-9]{17}\|0$/.test(input.identity)){localIdentity=input.identity;linkLocalIdentity();emit(true);}return {ok:true};

 case 'cloud-records':return storage(()=>[...rows(-1,null,sinceDays(365))].map(row=>{const m=JSON.parse(row.data),p=m.players.find(p=>p.PrimaryId===settings.identity);return {match_id:m.id,played_at:new Date(m.startedAt).toISOString(),won:p.TeamNum===m.winner,stats:{...Object.fromEntries(['Score','Goals','Assists','Saves','Shots','Touches','CarTouches','Demos','EpicSaves','CrossbarHits','TimesDemolished'].filter(k=>Number.isFinite(p[k])).map(k=>[k,p[k]])),Overtime:m.overtime?1:0,...Object.fromEntries(Object.entries({TeamScore:m.game?.Teams?.find(t=>t.TeamNum===p.TeamNum)?.Score,OpponentScore:m.game?.Teams?.find(t=>t.TeamNum!==p.TeamNum)?.Score,PlaylistId:m.game?.PlaylistId}).filter(([,v])=>Number.isFinite(v)))}};}))||[];

 case 'players':return storage(()=>db.prepare("SELECT json_extract(p.value,'$.PrimaryId') id,json_extract(p.value,'$.Name') name,COUNT(DISTINCT m.id) matches FROM matches m,json_each(m.data,'$.players') p WHERE json_extract(p.value,'$.PrimaryId') IS NOT NULL AND json_extract(p.value,'$.PrimaryId')!='' GROUP BY json_extract(p.value,'$.PrimaryId') ORDER BY matches DESC,name LIMIT 100").all())||[];

 case 'detail':return storage(()=>{const r=db.prepare('SELECT data FROM matches WHERE '+matchOnly+' AND id=? AND started>=?').get(String(input.id).slice(0,160),sinceDays(historyDays));return r?JSON.parse(r.data):null;});

 case 'analytics':return storage(()=>{const limit=[5,10,25,50,100].includes(input.limit)?input.limit:-1;return {career:aggregate(rows(-1),settings.identity),filtered:aggregate(rows(input.days===undefined?limit:-1,null,sinceDays(input.days)),settings.identity),recent:aggregate(rows(10),settings.identity),session:aggregate(input.sessionId?rows(-1,String(input.sessionId).slice(0,160)):session?rows(-1,session.id):[],settings.identity),sessions:db.prepare('SELECT * FROM sessions ORDER BY started DESC LIMIT 30').all()};})||{error};

 case 'replay':{

  if(!connected||!socket)throw Error('Connect to Rocket League first.');let payload;

  if(input.command==='LoadReplay'){if(tracker.match&&!tracker.match.ended)throw Error('Leave the live match before loading a replay.');if(typeof input.file!=='string'||!input.file.length||input.file.length>160||/[\\/:\x00-\x1f]/.test(input.file))throw Error('Enter a replay filename, not a path.');payload={FileName:input.file};}

  else {if(!tracker.replaying)throw Error('Open a replay in Rocket League first.');if(input.command==='SeekReplay'&&Number.isFinite(input.time)&&input.time>=0&&input.time<=86400)payload={TimeSeconds:input.time};if(input.command==='SetGameSpeed'&&[0,0.5,1,2].includes(input.speed))payload={Speed:input.speed};}

  if(!payload)throw Error('Unsupported replay command.');socket.send(JSON.stringify({Command:input.command,Data:payload}));return {ok:true,sent:true};}

 default:throw Error('Unknown tracker request.');

 }}

parentPort.on('message',({id,input})=>{try{parentPort.postMessage({id,value:command(input)});}catch(e){parentPort.postMessage({id,error:e.message});}});

connect();

