'use strict';
const playlists=require('../app/rocket-league-playlists.json');
// Observe adjacent telemetry samples, never extrapolate across a disconnect.
class PlaytimeTracker {
 constructor({now=Date.now,save=()=>true}={}){this.now=now;this.save=save;this.previous=null;this.pending=new Map();this.lastFlush=now();}
 reset(){this.previous=null;this.flush();}
 sample(tracker,identity,enabled=true){
  const at=this.now(),m=tracker.match,p=(tracker.presentPlayers||m?.players||[]).find(p=>p.PrimaryId===identity);
  let kind=null;
  if(enabled&&identity&&p&&[0,1].includes(p.TeamNum)&&m&&!tracker.replaying&&!m.ended&&!m.paused&&!m.game.bReplay){
   const id=m.game.PlaylistId;
   kind=[9,73].includes(id)?'freeplay':playlists.ranked.includes(id)?'ranked':playlists.casual.includes(id)?'casual':id===6&&[0,1].every(t=>m.players.some(p=>p.TeamNum===t))?'private':null;
  }
  const previous=this.previous;
  this.previous=kind?{at,id:m.id,identity,kind}:null;
  if(previous&&kind&&previous.id===m.id&&previous.identity===identity&&previous.kind===kind&&at>previous.at&&at-previous.at<=5000){
   // Split at UTC midnight so period totals remain correct.
   let start=previous.at;
   while(start<at){const day=Math.floor(start/86400000)*86400000,end=Math.min(at,day+86400000),key=JSON.stringify([identity,day,kind]);
    const row=this.pending.get(key)||{identity,day,kind,seconds:0};row.seconds+=(end-start)/1000;this.pending.set(key,row);start=end;}
  }
  if(!kind||previous&&(previous.kind!==kind||previous.identity!==identity||previous.id!==m.id)||at-this.lastFlush>=30000)this.flush();
 }
 flush(){if(this.pending.size&&this.save([...this.pending.values()])!==false)this.pending.clear();this.lastFlush=this.now();}
}
module.exports={PlaytimeTracker};
