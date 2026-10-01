'use strict';
const playlists=require('../app/rocket-league-playlists.json');
const playable=new Set([...playlists.casual,...playlists.ranked,...playlists.private,9,73]);
// Consumes the existing accepted Stats API stream, never process/menu presence.
// A fresh creation event plus two current playable updates establishes an edge.
// State snapshots alone (including joining/reconnecting mid-match) cannot open UI.
function createSessionEdges({now=Date.now}={}){
 let candidate=null;const observed=new Set();
 function remember(id){observed.add(id);if(observed.size>128)observed.delete(observed.values().next().value);}
 function disconnect(){candidate=null;}
 function ingest(message,tracker){
  const event=message?.Event,match=tracker.match;
  if(['ReplayCreated','MatchDestroyed','PodiumStart','MatchEnded'].includes(event)){candidate=null;return null;}
  if(tracker.replaying)return null;
  if(['MatchCreated','MatchInitialized'].includes(event)){
   let data=message.Data;try{if(typeof data==='string')data=JSON.parse(data);}catch{return null;}
   if(!data||typeof data!=='object'||Array.isArray(data)||!match?.completeStart||match.ended||observed.has(match.id)||(data.MatchGuid&&data.MatchGuid!==match.guid))return null;
   remember(match.id);candidate={id:match.id,created:now(),first:null,frame:null};return null;
  }
  if(event!=='UpdateState'||!match)return null;
  // Remember snapshots received without a start, so a late/replayed creation
  // event or a connection recovery cannot masquerade as a new session.
  if(!candidate||candidate.id!==match.id){remember(match.id);return null;}
  const time=now();if(time<candidate.created||time-candidate.created>10000){candidate=null;return null;}
  let data=message.Data;try{if(typeof data==='string')data=JSON.parse(data);}catch{return null;}
  const game=data?.Game,players=data?.Players;
  if(!game||game.bReplay===true||game.bHasWinner===true||match.ended||!playable.has(game.PlaylistId)||!Array.isArray(players)||!players.some(p=>p&&[0,1].includes(p.TeamNum)))return null;
  if(candidate.first===null){candidate.first=time;candidate.frame=Number.isFinite(game.Frame)?game.Frame:null;return null;}
  if(time-candidate.first<100)return null;
  if(candidate.frame!==null&&Number.isFinite(game.Frame)&&game.Frame<=candidate.frame)return null;
  const value={id:match.id,kind:[9,73].includes(game.PlaylistId)?'freeplay':game.PlaylistId===6?'private':'public',startedAt:candidate.created,receivedAt:time};candidate=null;return value;
 }
 return {ingest,disconnect};
}
module.exports={createSessionEdges};
