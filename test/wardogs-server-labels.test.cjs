const test=require('node:test'),assert=require('node:assert/strict');
test('Known WARDOGS mode identifiers become readable without losing rule modifiers',async()=>{
  const {serverMapLabel,serverModeLabel,serverRulesLabel}=await import('../app/wardogs-server-labels.js');
  assert.equal(serverMapLabel('Detroit'),'Zestafona');
  assert.equal(serverModeLabel('Zestafona_KOTH_01+KOTH_InfantryOnly'),'King of the hill');
  assert.equal(serverModeLabel('Madrid_KOTH_02'),'King of the hill');
  assert.equal(serverRulesLabel(['infantry-only'],'Zestafona_KOTH_01+KOTH_InfantryOnly'),'Infantry only');
  assert.equal(serverRulesLabel(['hardcore'],'Detroit_KOTH_01+KOTH_InfantryOnly'),'Hardcore · Infantry only');
  assert.equal(serverModeLabel('NewMap_NewMode_02'),'New Map New Mode 02');
  assert.equal(serverModeLabel(null),'Unavailable');
  assert.equal(serverRulesLabel(null,null),'');
});
