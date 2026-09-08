'use strict';
const path=require('node:path');
const {Provider,MODES}=require('./provider.cjs');
const {CodProvider,FEEDS}=require('./cod-provider.cjs');
const {FinalsProvider}=require('./finals-provider.cjs');
const {MediaProvider,CHANNELS}=require('./media-provider.cjs');
const {GameService}=require('./game-service.cjs');
const {UpdateService}=require('./update-service.cjs');
const {releaseProvider}=require('./release-provider.cjs');
const {PatchProvider,SOURCES:PATCH_SOURCES}=require('./patch-provider.cjs');
const {WardogsProvider}=require('./wardogs-provider.cjs');
const {SiegeProvider}=require('./siege-provider.cjs');
function createServices({cacheDir,bundleDir,leagueCacheDir=path.join(cacheDir,'league'),codCacheDir=path.join(cacheDir,'cod')}){
  const provider=new Provider({cacheDir:leagueCacheDir,bundleDir});
  const cod=new CodProvider({cacheDir:codCacheDir,bundleDir:path.join(bundleDir,'cod')});
  const finals=new FinalsProvider({cacheDir:path.join(cacheDir,'finals'),bundleDir:path.join(bundleDir,'finals')});
  const media=new MediaProvider({cacheDir:path.join(cacheDir,'media'),bundleDir:path.join(bundleDir,'media')});
  const games=new GameService({providers:{codmunity:cod,finals}});
  const release=releaseProvider({cacheDir:path.join(cacheDir,'releases'),bundleDir:path.join(bundleDir,'releases')});
  const patches=new PatchProvider({cacheDir:path.join(cacheDir,'patches'),bundleDir:path.join(bundleDir,'patches'),disabledGames:games.list().filter(g=>g.status==='under-construction').map(g=>g.id)});
  const wardogs=new WardogsProvider({cacheDir:path.join(cacheDir,'wardogs'),bundleDir:path.join(bundleDir,'wardogs')});
  const siege=new SiegeProvider({cacheDir:path.join(cacheDir,'siege'),bundleDir:path.join(bundleDir,'siege')});
  const updates=new UpdateService([
    {id:'siege-data',name:'Rainbow Six Siege · official ranked data',scope:'Ubisoft catalog and published ranked charts',sourceUrl:'https://www.ubisoft.com/en-us/game/rainbow-six/siege/news-updates',run:()=>siege.feed.get(true),detail:d=>`${d.operators.length} operators and ${d.maps.length} maps listed as ranked. ${d.analysis.title}. Charts describe their printed data patch, not live match statistics.`},
    {id:'siege-guides',name:'Rainbow Six Siege · map picks',scope:'Dropzone editorial guides',sourceUrl:'https://dropzonecompanion.com/data/siege-ranked.json',run:()=>siege.guides.get(true),detail:d=>`Guides reviewed for ${d.patch}. Recommendations require editorial review after balance changes; the website feed delivers edits without an app rebuild.`},
    {id:'wardogs-data',name:'WARDOGS · calculator',scope:'Community firing tables and map calibration checks',sourceUrl:'https://wardogs-artillery.com/',run:()=>wardogs.get({refresh:true}),detail:d=>d.mapsChanged.length?`Map calibration changed for ${d.mapsChanged.join(', ')}. Install an app update before using firing solutions on those maps.`:'Mortar and SPH-2 tables refresh automatically. Bundled map imagery needs an app update to change. Release-build accuracy has not been tested; terrain and vehicle tilt are not corrected.'},
    ...Object.entries(PATCH_SOURCES).filter(([id])=>patches.feeds.has(id)).map(([id,c])=>({id:'patches-'+id,name:(id==='lol'?'League of Legends':id==='finals'?'THE FINALS':id==='gray-zone'?'Gray Zone Warfare':id.toUpperCase())+' · patch notes',scope:'Official publisher posts',sourceUrl:c.url,run:()=>patches.list({game:id,refresh:true}),detail:d=>`${d.articles.length} official post previews. Full notes open on the publisher’s website.${id==='wardogs'?' Steam announcements are labeled separately from patch notes.':''}`})),
    {id:'league',name:'League of Legends',scope:'Champion and item catalog',sourceUrl:'https://www.leagueoflegends.com/en-us/news/game-updates/',run:()=>provider.getCatalog(true),detail:()=> 'Every selected champion / mode / rank combination checks its build source on first use each session, then after 15 minutes. Guide-only modes have no verified live build feed.'},
    ...Object.entries(FEEDS).map(([id,c])=>({id,name:id==='bo7-public'?'BO7 · public matches':id==='bo7-ranked'?'BO7 · ranked play':id==='warzone-ranked'?'Warzone · ranked':'Warzone · battle royale',scope:'CODMunity attachment recommendations',sourceUrl:c.url,run:()=>cod.getBuilds({feed:id,refresh:true}),detail:d=>`${d.builds.length} attachment sets. The source’s edit date can remain old even after a successful check.`})),
    {id:'finals-ranked',name:'THE FINALS · ranked loadouts',scope:'Community loadout recommendations',sourceUrl:'https://thefinalsloadout.com/loadouts',run:()=>finals.getBuilds({refresh:true}),detail:d=>`${d.builds.length} class builds. ${d.freshness.message} Team-comp choices have a separate, bundled review.`},
    {id:'finals-patches',name:'THE FINALS · official patches',scope:'Embark patch feed',sourceUrl:'https://www.reachthefinals.com/patchnotes',run:()=>finals.patches.get(true),detail:d=>`Latest release ${d.latest.patch}${d.latest.storeOnly?' is a store update':''}. Latest non-store update: ${d.gameplay.patch}. Team compositions need a separate review after new non-store updates.`},
    {id:'mw4-release',name:'Modern Warfare 4',scope:'Official release announcement',sourceUrl:'https://www.callofduty.com/blog/2026/05/call-of-duty-modern-warfare-4-announcement',run:()=>release.get(true),detail:d=>`The linked announcement lists ${d.releaseDate}. Other announcements are not monitored. Build support still requires a future app update.`},
    ...CHANNELS.flatMap(c=>[
      {id:c.id+'-playlists',name:c.name+' · event archives',scope:'Official playlists',sourceUrl:c.url+'/playlists',run:()=>media.archives.playlistFeeds.get(c.id).get(true),detail:d=>`${d.playlists.length} playlists. Open an archive to refresh its match list.`},
      {id:c.id+'-streams',name:c.name+' · broadcasts',scope:'Official broadcast archive',sourceUrl:c.url+'/streams',run:()=>media.archives.streamFeeds.get(c.id).get(true),detail:d=>`${d.videos.length} matching broadcasts from the channel’s public archive page.`}
    ]),
    ...CHANNELS.map(c=>({id:c.id,name:c.name+' · YouTube',scope:'Official channel uploads',sourceUrl:c.url,run:()=>media.feeds.get(c.id).get(true),detail:()=> 'Recent public uploads from the verified official channel. Some uploads are highlights, Shorts, or game announcements.'}))
  ]);
  return {provider,cod,finals,media,games,updates,patches,wardogs,siege,modes:MODES};
}
module.exports={createServices};
