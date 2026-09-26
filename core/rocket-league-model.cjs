'use strict';
const {randomUUID}=require('node:crypto');
const STATS=['Score','Goals','Assists','Saves','Shots','Touches','CarTouches','Demos','EpicSaves','CrossbarHits','TimesDemolished'];
const text=(v,max=160)=>typeof v==='string'?v.slice(0,max):'';
const number=v=>Number.isFinite(v)&&v>=0?v:null;
const isFreePlay=m=>[9,73].includes(m?.game?.PlaylistId);
function player(p){if(!p||typeof p!=='object')return null;return {Name:text(p.Name),PrimaryId:text(p.PrimaryId),Shortcut:number(p.Shortcut),TeamNum:[0,1].includes(p.TeamNum)?p.TeamNum:null,...Object.fromEntries(STATS.map(k=>[k,number(p[k])]))};}
class MatchTracker {
 constructor({save=()=>{},now=Date.now,checkpoint=()=>{}}={}){this.save=save;this.now=now;this.checkpoint=checkpoint;this.match=null;this.replay=null;this.replaying=false;this.recent=new Set();this.revision=0;this.eventsRevision=0;this.messages=0;this.malformed=0;}
 create(guid,complete=false){return {id:guid||'local:'+randomUUID(),guid:guid||'',startedAt:this.now(),updatedAt:this.now(),completeStart:complete,interrupted:false,ended:false,players:[],game:{},events:[],overtime:false};}
 event(type,who='',team=null,extra={}){const m=this.match;if(!m)return;m.events.push({type,who:text(who),team:[0,1].includes(team)?team:null,time:m.game.TimeSeconds??null,at:this.now(),...extra});if(m.events.length>256)m.events.shift();this.eventsRevision++;}
 finish(reason){const m=this.match;if(!m)return;m.updatedAt=this.now();m.status=m.ended?(m.completeStart&&!m.interrupted?'complete':'partial'):'incomplete';m.reason=reason;this.save(structuredClone(m));this.recent.add(m.id);if(this.recent.size>64)this.recent.delete(this.recent.values().next().value);this.match=null;this.revision++;}
 disconnect(){if(this.match){if(!this.match.ended)this.match.interrupted=true;this.match.updatedAt=this.now();this.checkpoint(structuredClone(this.match));}this.revision++;}
 ingest(message){
  this.messages++;if(message&&typeof message.Data==='string'){try{message={...message,Data:JSON.parse(message.Data)};}catch{this.malformed++;return false;}}if(!message||typeof message.Event!=='string'||!message.Data||typeof message.Data!=='object'||Array.isArray(message.Data)){this.malformed++;return false;}
  const e=message.Event,d=message.Data,guid=text(d.MatchGuid,128);
  if(e==='ReplayCreated'){this.finish('Replay opened');this.replaying=true;this.replay={FileName:text(d.FileName),Date:text(d.Date),events:[],game:{},players:[]};this.revision++;return true;}
  if((e==='MatchCreated'||e==='MatchInitialized')&&!this.replaying){
   if(this.match&&guid&&this.match.guid!==guid)this.finish('Next match');
   if(!this.match&&!this.recent.has(guid))this.match=this.create(guid,true);
   if(this.match)this.match.completeStart=true;
  }
  if(this.replaying){
   if(e==='UpdateState'&&d.Game&&Array.isArray(d.Players)){this.replay.game={TimeSeconds:number(d.Game.TimeSeconds),Elapsed:number(d.Game.Elapsed),Frame:number(d.Game.Frame)};this.replay.players=d.Players.slice(0,16).map(player).filter(Boolean);}
   if(e==='GoalScored'&&Number.isFinite(this.replay.game.Elapsed)){this.replay.events.push({who:text(d.Scorer?.Name),time:this.replay.game.Elapsed});if(this.replay.events.length>128)this.replay.events.shift();}
   if(e==='MatchDestroyed'){this.replaying=false;this.replay=null;}
   this.revision++;return true;
  }
  if(e==='UpdateState'){
   if(!d.Game||typeof d.Game!=='object'||!Array.isArray(d.Players)){this.malformed++;return false;}
   if(this.match&&guid&&this.match.guid!==guid)this.finish('Match changed');
   // A replay discovered without ReplayCreated is ambiguous; never record it as a match.
   if(!this.match&&d.Game.bReplay)return false;
   if(!this.match){if(this.recent.has(guid))return false;this.match=this.create(guid,false);}
   const m=this.match;if(guid&&!m.guid){m.guid=guid;m.id=guid;}
   const players=d.Players.slice(0,16).map(player).filter(Boolean);
   // Retain the last known final totals of players who leave the server.
   for(const p of players){const i=m.players.findIndex(q=>p.PrimaryId?q.PrimaryId===p.PrimaryId:q.Name===p.Name&&q.Shortcut===p.Shortcut);if(i<0)m.players.push(p);else {for(const k of ['EpicSaves','CrossbarHits','TimesDemolished'])p[k]=m.players[i][k]??null;m.players[i]=p;}}
   m.players=m.players.slice(-32);const g=d.Game;
   m.game={Teams:(Array.isArray(g.Teams)?g.Teams:[]).filter(t=>t&&typeof t==='object'&&[0,1].includes(t.TeamNum)).slice(0,2).map(t=>({Name:text(t.Name),TeamNum:t.TeamNum,Score:number(t.Score)})),Arena:text(g.Arena),PlaylistId:number(g.PlaylistId)??m.game.PlaylistId??null,TimeSeconds:number(g.TimeSeconds),bOvertime:g.bOvertime===true,bReplay:g.bReplay===true};
   if(g.bOvertime&&!m.overtime){m.overtime=true;this.event('Overtime');}
   if(g.bHasWinner===true){const winner=m.game.Teams.find(t=>t.Name===g.Winner);if(winner&&[0,1].includes(winner.TeamNum)){m.ended=true;m.winner=winner.TeamNum;}}
   m.updatedAt=this.now();this.revision++;return true;
  }
  const m=this.match;if(!m||(guid&&m.guid&&guid!==m.guid))return false;
  const increment=(ref,key)=>{if(!ref)return;const found=m.players.filter(p=>p.TeamNum===ref.TeamNum&&p.Shortcut===ref.Shortcut&&p.Name===ref.Name);if(found.length===1)found[0][key]=(found[0][key]||0)+1;};
  if(e==='CrossbarHit'&&!m.game.bReplay){increment(d.BallLastTouch?.Player,'CrossbarHits');}
  else if(e==='MatchEnded'&&[0,1].includes(d.WinnerTeamNum)){m.ended=true;m.winner=d.WinnerTeamNum;this.event('Match ended');this.checkpoint(structuredClone(m));}
  else if(e==='MatchDestroyed'){this.finish('Match left');}
  else if(e==='PodiumStart'){this.finish('Match ended');}
  else if(e==='GoalScored'&&!m.game.bReplay){this.event('Goal',d.Scorer?.Name,d.Scorer?.TeamNum);if(d.Assister)this.event('Assist',d.Assister.Name,d.Assister.TeamNum);}
  else if(e==='StatfeedEvent'&&!m.game.bReplay){if(d.EventName==='EpicSave')increment(d.MainTarget,'EpicSaves');if(d.EventName==='Demolish')increment(d.SecondaryTarget,'TimesDemolished');const label={Save:'Save',EpicSave:'Epic save',Demolish:'Demo',Shot:'Shot'}[d.EventName];if(label)this.event(label,d.MainTarget?.Name,d.MainTarget?.TeamNum);}
  else if(e==='ClockUpdatedSeconds'){m.game.TimeSeconds=number(d.TimeSeconds);m.game.bOvertime=d.bOvertime===true;if(d.bOvertime&&!m.overtime){m.overtime=true;this.event('Overtime');}}
  else if(e==='GoalReplayStart')m.game.bReplay=true;
  else if(e==='GoalReplayEnd')m.game.bReplay=false;
  else if(e==='MatchPaused')m.paused=true;
  else if(e==='MatchUnpaused')m.paused=false;
  else return false;
  this.revision++;return true;
 }
}
function aggregate(rows,identity){
 const result={matches:0,wins:0,losses:0,overtime:0,overtimeWins:0,currentStreak:0,bestStreak:0,totals:{},samples:{},records:{},recent:[],trend:[]};let streak=0,pairedGoals=0,pairedShots=0;
 for(const row of rows){const m=typeof row.data==='string'?JSON.parse(row.data):row,p=m.players.find(p=>p.PrimaryId===identity);if(isFreePlay(m)||m.status!=='complete'||!p||![0,1].includes(p.TeamNum)||![0,1].includes(m.winner))continue;
  const win=p.TeamNum===m.winner;result.matches++;result[win?'wins':'losses']++;streak=win?streak+1:0;result.bestStreak=Math.max(result.bestStreak,streak);result.currentStreak=streak;
  if(m.overtime){result.overtime++;if(win)result.overtimeWins++;}
  for(const k of STATS)if(Number.isFinite(p[k])){result.totals[k]=(result.totals[k]||0)+p[k];result.samples[k]=(result.samples[k]||0)+1;if(!result.records[k]||p[k]>result.records[k].value)result.records[k]={value:p[k],match:m.id};}
  if(Number.isFinite(p.Goals)&&Number.isFinite(p.Shots)){pairedGoals+=p.Goals;pairedShots+=p.Shots;}
  result.recent.push(win?'W':'L');if(result.recent.length>10)result.recent.shift();
  result.trend.push({id:m.id,date:m.startedAt,win,...Object.fromEntries(STATS.map(k=>[k,p[k]]))});if(result.trend.length>100)result.trend.shift();
 }
 result.winRate=result.matches?100*result.wins/result.matches:null;result.averages=Object.fromEntries(STATS.map(k=>[k,result.samples[k]?result.totals[k]/result.samples[k]:null]));
 result.shooting=pairedShots>0?100*pairedGoals/pairedShots:null;return result;
}
module.exports={MatchTracker,aggregate,STATS,player,isFreePlay};
