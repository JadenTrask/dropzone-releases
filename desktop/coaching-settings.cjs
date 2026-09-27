const DEFAULTS={enabled:true,toggleKey:'Control+Alt+C',clearKey:'Control+Alt+Backspace',tool:'pencil',color:'#ffffff',thickness:4,opacity:1,autoClear:'manual',seconds:15,screenshots:true,lowResource:'auto',toolbar:{x:.02,y:.12},rememberPosition:true};
function validateSettings(input={}){
 const s={...DEFAULTS,...input};
 for(const k of ['toggleKey','clearKey'])if(typeof s[k]!=='string'||! /^(?:(?:Control|Alt|Shift)\+){1,3}(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space|Backspace)$/.test(s[k]))throw Error('Use Control, Alt or Shift with a letter, number, F-key, Space or Backspace.');
 if(s.toggleKey===s.clearKey)throw Error('Drawing and clear shortcuts must be different.');
 if(!['pencil','arrow','line','ellipse','box','text','eraser'].includes(s.tool))throw Error('Unknown drawing tool.');
 if(!/^#[0-9a-f]{6}$/i.test(s.color))throw Error('Choose a valid color.');
 if(!['manual','screenshot','timer'].includes(s.autoClear))throw Error('Invalid auto-clear option.');
 if(!['auto','low'].includes(s.lowResource))throw Error('Invalid resource mode.');
 for(const [k,min,max] of [['thickness',1,24],['opacity',.1,1],['seconds',3,300]]){s[k]=Number(s[k]);if(!Number.isFinite(s[k])||s[k]<min||s[k]>max)throw Error('Invalid '+k);}
 s.toolbar={x:Math.max(0,Math.min(1,Number(s.toolbar?.x)||0)),y:Math.max(0,Math.min(1,Number(s.toolbar?.y)||0))};
 for(const k of ['enabled','screenshots','rememberPosition'])s[k]=!!s[k];
 return Object.fromEntries(Object.keys(DEFAULTS).map(k=>[k,s[k]]));
}
module.exports={DEFAULTS,validateSettings};
function validateAnnotations(value){
 if(!Array.isArray(value)||value.length>300)throw Error('Too many persistent annotations.');let total=0;
 return value.map(o=>{if(!o||!['pencil','arrow','line','ellipse','box','text'].includes(o.tool)||!/^#[0-9a-f]{6}$/i.test(o.color)||!Number.isFinite(o.width)||o.width<=0||o.width>.2||!Number.isFinite(o.opacity)||o.opacity<.1||o.opacity>1||!Array.isArray(o.points)||!o.points.length||o.points.length>4096)throw Error('Invalid persistent drawing.');total+=o.points.length;if(total>100000)throw Error('Persistent drawing limit reached.');const points=o.points.map(p=>{if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)throw Error('Invalid drawing position.');return {x:p.x,y:p.y};});return {tool:o.tool,color:o.color,width:o.width,opacity:o.opacity,points,layer:'persistent',expires:0,...(o.tool==='text'?{text:String(o.text||'').slice(0,80)}:{})};});
}
module.exports.validateAnnotations=validateAnnotations;

// Migrate shipped defaults only; preserve user-selected shortcuts.
module.exports.migrateSettings=input=>validateSettings({...input,...(input.toggleKey==='Control+Shift+D'?{toggleKey:DEFAULTS.toggleKey}:{}),...(input.clearKey==='Control+Shift+Backspace'?{clearKey:DEFAULTS.clearKey}:{})});
