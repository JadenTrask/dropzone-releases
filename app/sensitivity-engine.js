// Horizontal, unscoped rotation. References and assumptions are in docs/2.2.3-data.md.
import {SENS_GAMES} from './sensitivity-profiles.js';
export {SENS_GAMES};
const positive = (value,label) => {
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0)throw Error(`${label} must be a number greater than zero.`);
  return n;
};
export function coefficient(side){
  if(side.kind==='measured')return 914.4/(positive(side.cm,'Measured cm/360')*positive(side.dpi,'DPI')*positive(side.sens,'Calibration sensitivity'));
  if(side.kind==='custom')return positive(side.yaw,'Custom coefficient');
  const preset=SENS_GAMES.find(g=>g.id===side.game);
  if(!preset?.yaw)throw Error('This game needs a measured cm/360 or a verified custom coefficient.');
  return preset.yaw;
}
function profile(side){
  if(side.kind!=='preset')return {yaw:coefficient(side)};
  const game=SENS_GAMES.find(g=>g.id===side.game);
  if(!game?.yaw)throw Error('This game needs a measured cm/360 or a verified custom coefficient.');
  return game;
}
function checkSetting(value,g){
  const n=Number(value);
  if(value===''||!Number.isFinite(n)||n<(g.min??0)||n>(g.max??Infinity))throw Error(`Sensitivity must be ${g.min??0} to ${g.max??'a finite positive number'} for ${g.name||'this setup'}.`);
  return n;
}
export function rotation(side){
  const g=profile(side),s=checkSetting(side.sens,g),x=s*(g.scale??1)+(g.offset??0);
  return positive((g.base?g.base**x:x**(g.power??1))*g.yaw+(g.rotationOffset??0),'Rotation per mouse count');
}
function sensitivityFor(rotation,g){
  const x=(rotation-(g.rotationOffset??0))/g.yaw;
  if(x<0)throw Error('This physical sensitivity is below the destination game’s supported range.');
  const normalized=g.base?Math.log(x)/Math.log(g.base):x**(1/(g.power??1));
  return checkSetting((normalized-(g.offset??0))/(g.scale??1),g);
}
export function convertSensitivity(source,target){
  const increment=rotation(source),destination=profile(target);
  const dpi=positive(source.dpi,'Source DPI'),targetDpi=positive(target.dpi,'Destination DPI');
  const cm360=914.4/(dpi*increment),sensitivity=sensitivityFor(dpi*increment/targetDpi,destination);
  if(!Number.isFinite(cm360)||!Number.isFinite(sensitivity)||cm360<=0||sensitivity<0)throw Error('These values are outside the supported numeric range.');
  return {cm360,sensitivity};
}
