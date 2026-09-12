'use strict';
const registry = require('./games.json');

// Adding a game is a registry entry plus a provider implementing getBuilds().
// The launcher and generic loadout view read this registry, not a list of hardcoded tabs.
class GameService {
  constructor({games=registry, providers={}}={}) {
    this.providers = new Map(Object.entries(providers));
    this.games = structuredClone(games);
    const ids = new Set();
    for (const game of this.games) {
      if (!/^[a-z0-9-]+$/.test(game.id) || ids.has(game.id)) throw new Error('Invalid or duplicate game ID.');
      if (!['collection','league','loadouts','finals','calculator','tacmap','siege','forest','arena'].includes(game.kind)) throw new Error('Unknown game renderer.');
      ids.add(game.id);
      const modes=new Set();
      for(const mode of game.modes||[]) {
        if(!/^[a-z0-9-]+$/.test(mode.id)||modes.has(mode.id))throw new Error('Invalid or duplicate mode ID.');
        modes.add(mode.id);
      }
    }
    for (const game of this.games) {
      if(game.parent && !ids.has(game.parent))throw new Error('Unknown game parent.');
      const seen=new Set([game.id]);let parent=game.parent;
      while(parent){if(seen.has(parent))throw new Error('Cyclic game registry.');seen.add(parent);parent=this.games.find(g=>g.id===parent)?.parent;}
    }
  }
  list() { return structuredClone(this.games).map(({provider,...game})=>game); }
  async builds(options) {
    if (!options || typeof options!=='object' || Array.isArray(options)) throw new Error('Choose a game and mode.');
    const game=this.games.find(g=>g.id===options.game);
    if(!game)throw new Error('Unknown game.');
    if(game.status!=='active')return {unavailable:true,comingSoon:true,game:game.id,releaseDate:game.releaseDate,sourceUrl:game.releaseSource,builds:[]};
    const mode=game.modes?.find(m=>m.id===options.mode);
    if(!mode || !['loadouts','finals'].includes(game.kind))throw new Error('This game mode is not supported by the loadout provider.');
    const provider=this.providers.get(game.provider);
    if(!provider)throw new Error('This gameâ€™s build provider is not installed.');
    const result=await provider.getBuilds({feed:mode.feed,refresh:options.refresh===true||options.refresh==='true'});
    return {...result,game:game.id,mode:mode.id};
  }
}
module.exports={GameService};
