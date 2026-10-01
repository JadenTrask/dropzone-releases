'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const context=require('../app/data/apex/meta-context.json'),data=require('../app/data/apex/apex-content.json'),art=require('../app/data/apex/legend-art.json');
const load=async()=>{global.window={};return import('../app/apex-meta.js');};
test('Historical event counts retain exact denominator and pre-patch scope',()=>{
 assert.equal(context.event.denominator,200);assert.equal(context.event.denominator,context.event.teams*context.event.matches);
 assert.deepEqual(context.event.legends.map(r=>[r.name,r.occurrences]),[['Wraith',87],['Mad Maggie',56],['Rampart',56],['Catalyst',52]]);
 assert.deepEqual(context.event.compositions.map(r=>r.occurrences),[18,14,13]);assert.ok(Date.parse(context.event.playedAt)<Date.parse(context.sources.patch.publishedAt));
 assert.match(context.event.method,/not as a share of player slots/);assert.match(context.event.method,/Bans affect availability/);
});
test('Default guide gives a small supported editorial shortlist without competing sections',async()=>{
 const {renderApexMeta}=await load(),html=renderApexMeta({data,art});
 assert.equal((html.match(/class="am-pick"/g)||[]).length,3);assert.match(html,/Editorial picks/);
 assert.doesNotMatch(html,/am-directory-list|am-event|am-balance-list|43.5%|S-tier|ranked win rate/);
 for(const pick of context.recommendations){assert.ok(context.roles.some(r=>r.name===pick.name));assert.ok(pick.reason.split(/\s+/).length<25);assert.ok(pick.sources.every(key=>context.sources[key]));assert.ok(html.includes(pick.reason));}
 assert.match(html,/data-apex-meta-view="teams"/);
});
test('Secondary views separate team ideas and historical evidence',async()=>{
 const {renderApexMeta}=await load(),teams=renderApexMeta({data,art,view:'teams'}),evidence=renderApexMeta({data,art,view:'evidence'});
 assert.equal((teams.match(/class="am-team-idea"/g)||[]).length,3);assert.match(teams,/Editorial team ideas/);assert.doesNotMatch(teams,/43.5%|am-directory-list/);
 assert.match(evidence,/<details class="am-history">/);assert.match(evidence,/before the September 15 balance update/);assert.match(evidence,/87 \/ 200 team-matches/);assert.match(evidence,/43.5%/);assert.match(evidence,/6.5%/);
 assert.match(evidence,/does not determine these picks/);assert.match(evidence,/Bans affect availability/);
});
test('Directory preserves roster, class corrections, ability search and full-banner activation',async()=>{
 const {apexMetaRoster,renderApexMeta}=await load();assert.equal(apexMetaRoster(data,art).length,28);
 assert.equal(apexMetaRoster(data,art,{query:' allfather '})[0].name,'Bloodhound');assert.equal(apexMetaRoster(data,art,{role:'Controller'}).length,4);
 assert.equal(apexMetaRoster(data,art,{query:'Ash'})[0].role,'Skirmisher');assert.equal(apexMetaRoster(data,art,{query:'Revenant'})[0].role,'Assault');
 const html=renderApexMeta({data,art,view:'directory'});assert.equal((html.match(/class="operator-card am-legend-banner"/g)||[]).length,28);
 const filtered=renderApexMeta({data,art,view:'directory',query:'Allfather'});assert.equal((filtered.match(/data-apex-legend-open=/g)||[]).length,1);assert.match(filtered,/View Bloodhound abilities/);
 const detail=renderApexMeta({data,art,view:'directory',selectedLegend:'Bloodhound'});assert.match(detail,/Allfather’s Cloak/);assert.match(detail,/Eye of the Allfather/);assert.match(detail,/data-apex-legend-back/);assert.doesNotMatch(detail,/am-directory-list/);
});
test('Empty/malformed directory keeps controls and escapes supplied text',async()=>{
 const {renderApexMeta}=await load();const empty=renderApexMeta({data:{catalog:{legends:[]}},art:{legends:[]},view:'directory'});assert.match(empty,/No legends match/);assert.match(empty,/0 legends/);assert.doesNotMatch(empty,/undefined|NaN/);
 const filtered=renderApexMeta({data,art,view:'directory',query:'not-a-real-legend'});assert.match(filtered,/No legends match/);assert.match(filtered,/id="apex-query"/);assert.match(filtered,/id="apex-role"/);
 const bad={catalog:{legends:[{name:'<img onerror=alert(1)>',role:'Recon',abilities:[{type:'<script>',name:'<img>'}]}]}};
 const html=renderApexMeta({data:bad,art:{legends:[]},view:'directory',selectedLegend:'<img onerror=alert(1)>'});assert.doesNotMatch(html,/<img onerror|<script>/);assert.match(html,/&lt;img/);
 const query=renderApexMeta({data,art,view:'directory',query:'" autofocus onfocus="alert(1)'});assert.match(query,/value="&quot; autofocus/);
});
test('Editorial roles and teams retain traceable documented source keys',()=>{
 const names=new Set(data.catalog.legends.map(r=>r.name));for(const role of context.roles){assert.ok(names.has(role.name));assert.ok(context.sources[role.source]);assert.ok(role.strength&&role.tradeoff);}
 for(const team of context.compositions){assert.equal(new Set(team.legends).size,3);assert.ok(team.legends.every(n=>names.has(n)));assert.ok(team.sources.every(k=>context.sources[k]));}
});
