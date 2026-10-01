'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const base={schema:1,identity:{name:'QA player',uid:'123',platform:'PC'}};
test('Apex tracker normalization retains mode and season without merging ambiguous counters',async()=>{
 global.window={};const {playerProfile,trackerLabel,legendSummary,renderPlayerProfile}=await import('../app/apex-profile.js');
 const p=playerProfile({...base,metrics:[{label:'Career kills',value:50},{label:'Season kills',value:900},{label:'Kills',value:200}],legends:[{name:'Wraith',trackers:[{label:'BR Kills',value:40},{label:'BR Kills',value:40},{label:'BR Kills',value:45},{label:'Kills',value:40},{label:'BR Season 9 kills',value:30},{label:'Arenas Wins',value:2},{label:'Portal distance',value:600}]}]});
 assert.deepEqual(p.metrics,[{label:'Career kills',value:50}]);assert.equal(p.legends[0].trackers.length,6);assert.equal(p.legends[0].trackers.filter(t=>t.label==='BR Kills').length,2);
 assert.deepEqual(trackerLabel('BR Season 9 kills'),{label:'Kills',scope:'Battle Royale · Season 9',raw:'BR Season 9 kills'});
 assert.equal(trackerLabel('Arenas Wins').scope,'Arenas');assert.equal(trackerLabel('Portal distance').label,'Portal distance');
 const groups=legendSummary(p.legends[0].trackers);assert.equal(groups.summary.length,3);assert.equal(groups.details.length,3);assert.ok(groups.details.some(t=>t.label==='BR Season 9 kills'));
 const html=renderPlayerProfile(p,{legends:[]});assert.match(html,/Back to Players/);assert.match(html,/<details>/);assert.match(html,/Battle Royale · Season 9/);assert.doesNotMatch(html,/Season kills|200<|Best legend|Main legend|Most played/);
});
test('Apex sparse profiles omit invented rank, career, art and tracker totals',async()=>{
 global.window={};const {playerProfile,renderPlayerProfile}=await import('../app/apex-profile.js');
 const html=renderPlayerProfile(playerProfile({...base,legends:[{name:'Unknown legend',trackers:[{label:'BR Wins',value:0}]}]}),{legends:[]});
 assert.match(html,/No current rank was supplied/);assert.match(html,/Account totals are unavailable/);assert.match(html,/>0<\/dd>/);assert.doesNotMatch(html,/<details>|apex-profile-art|apex-rank-emblem|NaN|undefined/);
});
