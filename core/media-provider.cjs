'use strict';
const {SourceCache,tag,text,iso}=require('./source-cache.cjs');
const {VideoArchives}=require('./video-archives.cjs');
const CHANNELS=Object.freeze([
  {id:'lol-esports',games:['lol'],name:'LoL Esports',channelId:'UCvqRdlKsE5Q8mf8YXbdIJLw',url:'https://www.youtube.com/@lolesports',description:'Riot’s official League of Legends esports channel.',officialUrl:'https://lolesports.com/en-US/news'},
  {id:'cod-league',games:['bo7','mw4'],name:'Call of Duty League',channelId:'UCbLIqv9Puhyp9_ZjVtfOy7w',url:'https://www.youtube.com/@CODLeague',description:'Official CDL matches, highlights, and competitive coverage. MW4 competition is not available yet.',officialUrl:'https://www.callofdutyleague.com/en-us'},
  {id:'warzone-esports',games:['warzone'],name:'Call of Duty',channelId:'UC9YydG57epLqxA9cTzZXSeQ',url:'https://www.youtube.com/@CallofDuty',description:'Official Warzone Resurgence Series broadcasts appear on the main Call of Duty channel. Other uploads cover the wider game.',officialUrl:'https://callofduty.worldseriesofwarzone.com/',featured:[{id:'Qt-Adw1sspY',title:'Call of Duty Warzone: Resurgence Series | DreamHack Atlanta',publishedAt:'2026-05-16T00:00:00.000Z',url:'https://www.youtube.com/watch?v=Qt-Adw1sspY',thumbnail:'https://i.ytimg.com/vi/Qt-Adw1sspY/hqdefault.jpg',archive:true}]},
  {id:'finals-esports',games:['finals'],name:'THE FINALS',channelId:'UCEqzN3PRSCrxYq5tUwYJaPw',url:'https://www.youtube.com/@reachthefinals',description:'Embark’s official channel, including The Grand Major broadcasts and game updates.',officialUrl:'https://www.reachthefinals.com/tgm'},
  {id:'siege-esports',games:['siege'],name:'Rainbow Six Esports',channelId:'UCWKHac5bjhsUtSnMDFCT-7A',url:'https://www.youtube.com/@RainbowSixEsports',description:'Official Rainbow Six Esports broadcasts, events and highlights.',officialUrl:'https://www.ubisoft.com/en-us/esports/rainbow-six/siege'}
]);
const isVideoId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{11}$/.test(v);
function normalizeVideos(xml,channel){
  const header=xml.split(/<entry\b/)[0],headerId=tag(header,'yt:channelId');
  if(![channel.channelId,channel.channelId.slice(2)].includes(headerId)||!header.includes('https://www.youtube.com/channel/'+channel.channelId))throw new Error('The video feed returned a different channel.');
  const videos=[],seen=new Set();
  for(const m of xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)){
    const row=m[1],id=tag(row,'yt:videoId');if(!isVideoId(id)||tag(row,'yt:channelId')!==channel.channelId||seen.has(id))throw new Error('Invalid official-channel video.');
    const title=text(tag(row,'title')).slice(0,200);if(!title)throw new Error('Video title missing.');
    videos.push({id,title,publishedAt:iso(tag(row,'published')),short:/href="https:\/\/www.youtube.com\/shorts\//.test(row),url:'https://www.youtube.com/watch?v='+id,thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'});seen.add(id);
  }
  if(!videos.length)throw new Error('No public uploads were returned.');
  videos.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  return {source:channel.name,sourceUrl:channel.url,channelId:channel.channelId,sourceUpdatedAt:videos[0].publishedAt,videos:videos.slice(0,15)};
}
class MediaProvider{
  constructor(options){this.archives=new VideoArchives(options,CHANNELS);this.feeds=new Map(CHANNELS.map(c=>[c.id,new SourceCache({...options,id:c.id,url:'https://www.youtube.com/feeds/videos.xml?channel_id='+c.channelId,normalize:x=>normalizeVideos(x,c),validate:d=>d.channelId===c.channelId&&d.videos?.length>0&&d.videos.every(v=>isVideoId(v.id))})]));}
  async list({game,refresh=false,playlist=null}={}){
    if(typeof game!=='string'||!CHANNELS.some(c=>c.games.includes(game)))throw new Error('Choose a game to view its official videos.');
    if(playlist!==null){const c=CHANNELS.find(c=>c.games.includes(game));return {game,playlist:await this.archives.playlist(c,playlist,refresh===true||refresh==='true')};}
    const channels=await Promise.all(CHANNELS.filter(c=>c.games.includes(game)).map(async c=>{
      const data=await this.feeds.get(c.id).get(refresh===true||refresh==='true').catch(error=>({videos:[],cacheState:'offline',error:error.message}));
      const archive=await this.archives.list(c,refresh===true||refresh==='true');
      return {...c,...data,...archive};
    }));
    return {game,channels};
  }
}
module.exports={MediaProvider,CHANNELS,normalizeVideos,isVideoId};
