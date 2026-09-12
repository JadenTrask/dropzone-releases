import {workflowData,validatePrerequisites} from './workflow-model.js';
export const CENTER_KEY='dropzone-command-v1';
export const TYPES=['build','strategy','note','goal','routine','practice','clip','settings','event','performance','session','team','feedback'];
export const GAMES=['lol','bo7','warzone','finals','siege','wardogs'];
export const blankState=()=>({version:1,records:[],favorites:[],preferences:{},activeSession:null});
export function text(value,max=1000){return typeof value==='string'?value.trim().slice(0,max):'';}
export function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function recordData(kind,data){
 const out=workflowData(data),strings=['pick','mode','equipment','measurement','metric','binds','audio','resolution','setup','availability','deadline','when','mediaId','mediaName','imageId','backupId','startedAt','endedAt','worked','change','version'];
 for(const key of strings)if(data[key]!==undefined){if(typeof data[key]!=='string')throw Error('Invalid '+key+' field.');out[key]=text(data[key],16000);}
 for(const key of ['current','total','cost','minutes','dpi','sensitivity','start','end','score','durationMinutes','size','sampleCount'])if(data[key]!==undefined){if(typeof data[key]!=='number'||!Number.isFinite(data[key])||data[key]<0)throw Error('Invalid '+key+' number.');out[key]=data[key];}
 if(data.metrics!==undefined){if(!data.metrics||Array.isArray(data.metrics)||typeof data.metrics!=='object'||Object.keys(data.metrics).length>100)throw Error('Invalid build metrics.');out.metrics={};for(const [k,v]of Object.entries(data.metrics)){if(typeof v!=='number'||!Number.isFinite(v))throw Error('Metrics must be finite numbers.');out.metrics[text(k,80)]=v;}}
 if(data.slots!==undefined){if(!Array.isArray(data.slots)||data.slots.length>6)throw Error('A draft supports up to six players.');out.slots=data.slots.map(s=>({name:text(s?.name,80),pick:text(s?.pick,80),role:text(s?.role,80),utility:text(s?.utility,300),ready:s?.ready===true,className:text(s?.className,30),weapon:text(s?.weapon,100),specialization:text(s?.specialization,100),gadgets:Array.isArray(s?.gadgets)?s.gadgets.map(x=>text(x,100)).slice(0,3):[],assignment:text(s?.assignment,500)}));}
 if(data.shapes!==undefined){if(!Array.isArray(data.shapes)||data.shapes.length>100)throw Error('A board supports 100 markers.');out.shapes=data.shapes.map(s=>{if(!['point','arrow','box'].includes(s.type)||[s.x,s.y,s.x2,s.y2].some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1))throw Error('Invalid board coordinates.');return {type:s.type,x:s.x,y:s.y,x2:s.x2,y2:s.y2,label:text(s.label,60),floor:text(s.floor,60),category:['position','reinforcement','utility','rotate'].includes(s.category)?s.category:'position',owner:text(s.owner,80)};});}
 if(data.samples!==undefined){if(!Array.isArray(data.samples)||data.samples.length>5000||data.samples.some(n=>!Number.isFinite(n)||n<=0))throw Error('Invalid saved frame samples.');out.samples=data.samples;}
 if(data.summary!==undefined){const keys=['frames','averageFps','onePercentLow','p99Ms'];if(!data.summary||keys.some(k=>!Number.isFinite(data.summary[k])||data.summary[k]<=0))throw Error('Invalid performance summary.');out.summary=Object.fromEntries(keys.map(k=>[k,data.summary[k]]));}
 if(kind==='goal'&&out.total!==undefined&&out.total<1)throw Error('Goal target must be at least one.');
 if(kind==='routine'&&out.minutes!==undefined&&(out.minutes<1||out.minutes>180))throw Error('Routine duration must be 1–180 minutes.');
 if(out.when&&!Number.isFinite(Date.parse(out.when)))throw Error('Invalid calendar date.');
 return out;
}
export function cleanRecord(value){
 if(!value||!TYPES.includes(value.kind)||![...GAMES,'valorant','rivals'].includes(value.game)||!text(value.title,120))throw Error('Each entry needs a supported game, type and title.');
 const data=value.data??{};if(!data||Array.isArray(data)||typeof data!=='object'||JSON.stringify(data).length>250000)throw Error('Entry details are invalid or too large.');
 const safe=JSON.parse(JSON.stringify(data),(k,v)=>['__proto__','constructor','prototype'].includes(k)?undefined:v);
 return {id:/^[a-zA-Z0-9_-]{1,80}$/.test(value.id||'')?value.id:crypto.randomUUID(),kind:value.kind,game:value.game,title:text(value.title,120),body:text(value.body,16000),tags:text(value.tags,500),source:safeLink(value.source),patch:text(value.patch,80),updatedAt:Number.isFinite(Date.parse(value.updatedAt))?value.updatedAt:new Date().toISOString(),links:Array.isArray(value.links)?value.links.filter(x=>typeof x==='string').slice(0,50):[],data:recordData(value.kind,safe)};
}
export function cleanState(value){
 if(value?.version!==1||!Array.isArray(value.records)||value.records.length>3000)throw Error('Unsupported workspace backup.');
 const records=value.records.map(cleanRecord);if(new Set(records.map(r=>r.id)).size!==records.length)throw Error('Duplicate entry IDs.');for(const r of records)if(r.kind==='goal')validatePrerequisites(r,records);
 return {version:1,records,favorites:(value.favorites||[]).filter(g=>GAMES.includes(g)).slice(0,8),preferences:value.preferences&&typeof value.preferences==='object'?value.preferences:{},activeSession:records.some(r=>r.kind==='session'&&r.id===value.activeSession)?value.activeSession:null};
}
export function pack(records,title='Shared plan'){if(!Array.isArray(records)||records.length>100)throw Error('A pack can contain up to 100 entries.');return {format:'dropzone-content',version:1,title:text(title,120),exportedAt:new Date().toISOString(),records:records.map(cleanRecord)};}
export function unpack(value){if(value?.format!=='dropzone-content'||value.version!==1||!Array.isArray(value.records)||value.records.length>100)throw Error('This is not a supported content pack.');return value.records.map(cleanRecord);}
export function shareCode(value){const s=JSON.stringify(value);if(s.length>90000)throw Error('This pack is too large for a code. Export a file instead.');return 'DZ1.'+btoa(Array.from(new TextEncoder().encode(s),c=>String.fromCharCode(c)).join(''));}
export function readCode(code){if(typeof code!=='string'||!code.startsWith('DZ1.')||code.length>500000)throw Error('Invalid share code.');return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.slice(4).trim()),c=>c.charCodeAt(0))));}
export function mergeRecords(current,items){
 const mapping=new Map(items.map(r=>[r.id,crypto.randomUUID()]));
 return [...current,...items.map(r=>({...r,id:mapping.get(r.id),links:r.links.map(id=>mapping.get(id)||id),updatedAt:new Date().toISOString()}))];
}
export function performanceSummary(samples){
 const values=samples.map(Number);if(!values.length||values.some(n=>!Number.isFinite(n)||n<=0))throw Error('Supply positive frame times in milliseconds.');
 const sorted=[...values].sort((a,b)=>a-b),sum=values.reduce((a,b)=>a+b,0),slow=sorted.slice(-Math.max(1,Math.ceil(sorted.length*.01)));
 return {frames:values.length,averageFps:1000/(sum/values.length),onePercentLow:1000/(slow.reduce((a,b)=>a+b,0)/slow.length),p99Ms:sorted[Math.ceil(sorted.length*.99)-1]};
}
export function sensitivity({dpi,sensitivity,yaw,targetDpi,targetYaw}){const v=[dpi,sensitivity,yaw,targetDpi,targetYaw].map(Number);if(v.some(n=>!Number.isFinite(n)||n<=0))throw Error('All sensitivity inputs must be positive.');return {cm360:360/(v[0]*v[1]*v[2])*2.54,targetSensitivity:v[0]*v[1]*v[2]/(v[3]*v[4])};}
export function goalStatus(goal,records){const n=Number(goal.data.current)||0,total=Number(goal.data.total)||1;const missing=(goal.links||[]).map(id=>records.find(r=>r.id===id)).filter(r=>r?.kind==='goal'&&(Number(r.data.current)||0)<(Number(r.data.total)||1));return {percent:Math.min(100,Math.max(0,n/total*100)),missing};}
export function teamCoverage(game,slots,side){
 const roles=slots.map(s=>s.role).filter(Boolean),wanted=({valorant:['Controller','Initiator','Sentinel','Duelist'],rivals:['Vanguard','Duelist','Strategist'],finals:['Healing','Revive','Movement','Defense'],siege:side==='defense'?['Intel','Support']:['Intel','Breach','Support'],lol:['Top','Jungle','Mid','Bottom','Support']})[game]||[];
 const present=new Set(slots.flatMap(s=>[...String(s.role||'').split(','),...String(s.utility||'').split(',')].map(x=>x.trim().toLowerCase())));
 if(game==='finals')for(const s of slots){const equipment=[s.specialization,...(s.gadgets||[])].map(x=>String(x||'').toLowerCase());for(const [role,items]of Object.entries({Healing:['healing beam'],Revive:['defibrillator'],Movement:['jump pad','zipline','gateway'],Defense:['dome shield','mesh shield','barricade','aps turret','goo grenade']}))if(equipment.some(x=>items.includes(x)))present.add(role.toLowerCase());}
 if(game==='siege'){if([...present].some(x=>x.includes('breach')))present.add('breach');if([...present].some(x=>x.includes('intel')))present.add('intel');}
 return {roles:roles.reduce((a,b)=>(a[b]=(a[b]||0)+1,a),{}),missing:wanted.filter(x=>!present.has(x.toLowerCase())),note:'Planning checklist, not a required composition or win-rate prediction. Revive means a dedicated revive gadget; every player can still attempt a normal revive.'};
}
export function compareMetrics(a,b){return [...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].map(key=>({key,a:a?.[key]??null,b:b?.[key]??null,delta:Number.isFinite(a?.[key])&&Number.isFinite(b?.[key])?b[key]-a[key]:null}));}
export function eligibleBackupKey(key){return /^(dropzone-|tbb-|rift-|forge-|rf-)/.test(key)&&!/(token|secret|credential|squad-room|squad-connection|squad-session|workspace-connection)/i.test(key);}
export function backupStorage(storage){const entries={};for(let i=0;i<storage.length;i++){const k=storage.key(i);if(eligibleBackupKey(k))entries[k]=storage.getItem(k);}return {format:'dropzone-backup',version:1,exportedAt:new Date().toISOString(),entries};}
export function validateBackup(value){if(value?.format!=='dropzone-backup'||value.version!==1||!value.entries||Array.isArray(value.entries)||JSON.stringify(value).length>20000000)throw Error('Invalid or oversized Dropzone backup.');for(const [key,v]of Object.entries(value.entries)){if(!eligibleBackupKey(key)||typeof v!=='string')throw Error('Backup contains unsupported keys.');if(key===CENTER_KEY)cleanState(JSON.parse(v));}return value.entries;}
export function restoreStorage(storage,entries){const previous={};try{for(const [k,v]of Object.entries(entries)){previous[k]=storage.getItem(k);storage.setItem(k,v);}}catch(err){for(const [k,v]of Object.entries(previous)){if(v===null)storage.removeItem(k);else storage.setItem(k,v);}throw err;}}
