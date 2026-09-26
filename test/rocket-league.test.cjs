const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MatchTracker,aggregate}=require('../core/rocket-league-model.cjs');
const player={Name:'Truck',PrimaryId:'Epic|123|0',TeamNum:0,Score:612,Goals:2,Assists:1,Saves:3,Shots:5,Touches:14,Demos:1};
const packet=(id='a',overrides={})=>({Event:'UpdateState',Data:{MatchGuid:id,Players:[player],Game:{Teams:[{Name:'Blue',TeamNum:0,Score:3},{Name:'Orange',TeamNum:1,Score:2}],TimeSeconds:102,Arena:'Stadium_P',PlaylistId:11,...overrides}}});
const event=(Event,id='a',data={})=>({Event,Data:{MatchGuid:id,...data}});
test('official events save one complete match, preserve final player totals and compute career',()=>{
 const saved=[],t=new MatchTracker({save:m=>saved.push(m)});t.ingest(event('MatchCreated'));t.ingest(packet());t.ingest(event('GoalScored','a',{Scorer:player}));t.ingest(event('MatchEnded','a',{WinnerTeamNum:0}));t.ingest(event('PodiumStart'));t.ingest(event('MatchDestroyed'));t.ingest(packet());assert.equal(saved.length,1);assert.equal(t.match,null);const a=aggregate(saved,player.PrimaryId);assert.equal(a.matches,1);assert.equal(a.wins,1);assert.equal(a.shooting,40);assert.equal(a.averages.Score,612);assert.equal(a.records.Saves.value,3);
});
test('late join, disconnect, foreign end event and unknown players cannot invent wins',()=>{
 const saved=[],t=new MatchTracker({save:m=>saved.push(m)});t.ingest(packet());t.ingest(event('MatchEnded','wrong',{WinnerTeamNum:0}));assert.equal(t.match.ended,false);t.disconnect();t.ingest(event('MatchEnded','a',{WinnerTeamNum:0}));t.finish('closed');assert.equal(saved[0].status,'partial');assert.equal(aggregate(saved,player.PrimaryId).matches,0);assert.equal(aggregate(saved,'other').matches,0);
});
test('loaded replays never enter career; goal replays do not create duplicate feed events',()=>{
 const saved=[],t=new MatchTracker({save:m=>saved.push(m)});t.ingest(event('ReplayCreated','a',{FileName:'replay'}));t.ingest(event('MatchCreated'));t.ingest(packet('a',{bReplay:true,Elapsed:10}));t.ingest(event('MatchEnded','a',{WinnerTeamNum:0}));t.ingest(event('MatchDestroyed'));assert.equal(saved.length,0);t.ingest(event('MatchCreated','b'));t.ingest(packet('b',{bReplay:true}));t.ingest(event('GoalScored','b',{Scorer:player}));assert.equal(t.match.events.length,0);
});
test('unknown and malformed data stay bounded and absent stats remain unknown',()=>{
 const t=new MatchTracker();assert.equal(t.ingest(null),false);assert.equal(t.ingest({Event:'UpdateState',Data:{Players:[]}}),false);t.ingest(event('MatchCreated'));const p=packet();delete p.Data.Players[0].Touches;t.ingest(p);assert.equal(t.match.players[0].Touches,null);for(let i=0;i<1000;i++)t.ingest(event('StatfeedEvent','a',{EventName:'Save',MainTarget:player}));assert.equal(t.match.events.length,256);assert.equal(t.ingest(event('Unknown')),false);
});
test('win streak and overtime statistics follow chronological complete matches',()=>{
 const matches=[0,0,1,0].map((winner,i)=>({id:String(i),startedAt:i,status:'complete',winner,overtime:i<2,players:[player]}));const a=aggregate(matches,player.PrimaryId);assert.equal(a.bestStreak,2);assert.equal(a.currentStreak,1);assert.equal(a.overtimeWins,2);assert.equal(a.winRate,75);
});

test('actual game JSON-string Data payloads render live stats and reject invalid inner JSON',()=>{
 const t=new MatchTracker();assert.equal(t.ingest({Event:'UpdateState',Data:JSON.stringify({MatchGuid:'actual',Players:[{Name:'Player',PrimaryId:'p',TeamNum:0,Score:10}],Game:{Teams:[{TeamNum:0,Score:1}],TimeSeconds:250,PlaylistId:9}})}),true);assert.equal(t.match.players[0].Score,10);assert.equal(t.match.game.TimeSeconds,250);assert.equal(t.ingest({Event:'UpdateState',Data:'broken'}),false);assert.equal(t.malformed,1);
});
