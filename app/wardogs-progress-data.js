export const ROLES=['assault','medic','recon','support','driver','pilot'];
const finite=(v,label,max)=>{if(v===null||v===undefined||v==='')return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw Error(`${label} must be a number from 0 to ${max}.`);return v;};
export function validateProgress(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Choose a progression JSON file containing an object.');
 const raw=input.roles;if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('The file needs a roles object. Download the template for the supported format.');
 const roles={};let count=0;
 for(const role of ROLES){const value=raw[role];const level=finite(typeof value==='number'?value:value?.level,`${role} level`,10000),xp=finite(typeof value==='object'&&value!==null?value.xp:null,`${role} XP`,1e12);if(level!==null&&!Number.isInteger(level))throw Error(`${role} level must be a whole number.`);roles[role]={level,xp};if(level!==null||xp!==null)count++;}
 if(!count)throw Error('No role levels or XP were supplied. Unknown values should be null, not made-up zeros.');
 const name=typeof input.playerName==='string'?input.playerName.trim().slice(0,80):'';
 const capturedAt=typeof input.capturedAt==='string'&&Number.isFinite(Date.parse(input.capturedAt))?new Date(input.capturedAt).toISOString():null;
 const unlocks=input.unlocks??[];if(!Array.isArray(unlocks)||unlocks.length>5000||unlocks.some(s=>typeof s!=='string'||s.length>160))throw Error('Unlocks must be a list of item names, with at most 5000 entries.');
 return {schemaVersion:1,playerName:name,roles,cash:finite(input.cash,'Cash',1e15),gold:finite(input.gold,'Gold',1e15),capturedAt,unlocks:[...new Set(unlocks.map(s=>s.trim()).filter(Boolean))]};
}
export function parseProgress(text){if(typeof text!=='string'||text.length>1000000)throw Error('Choose a JSON file smaller than 1 MB.');let data;try{data=JSON.parse(text);}catch{throw Error('This is not valid JSON. Use an exported Dropzone snapshot or the template.');}return validateProgress(data);}
export function careerLevel(snapshot){const levels=ROLES.map(r=>snapshot?.roles?.[r]?.level);return levels.every(n=>Number.isInteger(n)&&n>=0)?levels.reduce((a,b)=>a+b,0):null;}
