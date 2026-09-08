'use strict';
const {SourceCache,text}=require('./source-cache.cjs');
const isVideoId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{11}$/.test(v);
const isPlaylistId=v=>typeof v==='string'&&/^PL[A-Za-z0-9_-]{10,80}$/.test(v);
function nodes(value,key,out=[]){
  if(Array.isArray(value)){for(const x of value)nodes(x,key,out);}
  else if(value&&typeof value==='object'){if(Object.hasOwn(value,key))out.push(value[key]);for(const x of Object.values(value))nodes(x,key,out);}
  return out;
}
function pageData(html){
  const match=html.match(/(?:var\s+ytInitialData\s*=\s*|window\["ytInitialData"\]\s*=\s*)(\{[^]*?\});\s*<\/script>/);
  if(!match)throw new Error('YouTube changed its public archive format.');
  return JSON.parse(match[1]);
}
function verifyChannel(d,c){if(d.metadata?.channelMetadataRenderer?.externalId!==c.channelId)throw new Error('The archive returned a different channel.');}
function relevant(title,c){
  if(c.id==='warzone-esports')return /warzone|resurgence|wsow/i.test(title);
  if(c.id==='finals-esports')return /grand major|tgm\d|tgm\s|esport|tournament/i.test(title);
  if(c.id==='cod-league')return !/resurgence|warzone/i.test(title);
  return true;
}
function normalizePlaylists(html,c){
  const d=pageData(html);verifyChannel(d,c);const playlists=[],seen=new Set();
  for(const v of nodes(d.contents,'lockupViewModel')){
    const id=v.contentId,title=text(v.metadata?.lockupMetadataViewModel?.title?.content).slice(0,200);
    if(v.contentType!=='LOCKUP_CONTENT_TYPE_PLAYLIST'||!isPlaylistId(id)||!title||seen.has(id)||!relevant(title,c)||/shorts|top 5|highlights/i.test(title))continue;
    const thumb=nodes(v.contentImage,'url').find(x=>typeof x==='string'&&/^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\//.test(x));
    const videoId=thumb?.match(/\/vi\/([^/]+)\//)?.[1];
    const countText=nodes(v.contentImage,'thumbnailBadgeViewModel').map(x=>x.text).find(x=>/videos/i.test(x||''));
    playlists.push({id,title,url:'https://www.youtube.com/playlist?list='+id,thumbnail:videoId?'https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg':null,countText:text(countText||'Playlist'),channelId:c.channelId});seen.add(id);
  }
  return {channelId:c.channelId,source:c.name,sourceUrl:c.url+'/playlists',sourceUpdatedAt:null,playlists};
}
function videoRows(d,c,playlistId=null){
  const videos=[],seen=new Set();
  for(const v of nodes(d.contents,'lockupViewModel')){
    const id=v.contentId,title=text(v.metadata?.lockupMetadataViewModel?.title?.content).slice(0,200);
    if(v.contentType!=='LOCKUP_CONTENT_TYPE_VIDEO'||!isVideoId(id)||!title||seen.has(id))continue;
    if(playlistId&&!nodes(v.metadata,'browseId').includes(c.channelId))continue;
    if(!playlistId&&!relevant(title,c))continue;
    const duration=nodes(v.contentImage,'thumbnailBadgeViewModel').map(x=>text(x.text)).find(x=>/^(?:\d+:)+\d+$/.test(x))||'';
    videos.push({id,title,duration,playlistId,channelId:c.channelId,publishedAt:null,url:'https://www.youtube.com/watch?v='+id+(playlistId?'&list='+playlistId:''),thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',archive:true});seen.add(id);
  }
  return videos;
}
function normalizeStreams(html,c){const d=pageData(html);verifyChannel(d,c);return {channelId:c.channelId,source:c.name,sourceUrl:c.url+'/streams',sourceUpdatedAt:null,videos:videoRows(d,c)};}
function normalizePlaylistVideos(html,c,playlist){
  const d=pageData(html),owner=nodes(d.sidebar,'videoOwnerRenderer');
  if(!isPlaylistId(playlist.id)||!owner.some(x=>x.navigationEndpoint?.browseEndpoint?.browseId===c.channelId))throw new Error('Playlist ownership could not be verified.');
  const videos=videoRows(d,c,playlist.id);if(!videos.length)throw new Error('No official-channel matches were found in this playlist.');
  return {...playlist,channelId:c.channelId,source:c.name,sourceUrl:playlist.url,sourceUpdatedAt:null,videos,partial:nodes(d.contents,'continuationItemViewModel').length>0||nodes(d.contents,'continuationItemRenderer').length>0};
}
class VideoArchives{
  constructor(options,channels){
    this.options=options;this.playlistFeeds=new Map();this.streamFeeds=new Map();this.matches=new Map();
    for(const c of channels){
      this.playlistFeeds.set(c.id,new SourceCache({...options,id:c.id+'-playlists',url:c.url+'/playlists',normalize:h=>normalizePlaylists(h,c),validate:d=>d.channelId===c.channelId&&Array.isArray(d.playlists)&&d.playlists.every(p=>isPlaylistId(p.id)&&p.channelId===c.channelId)}));
      this.streamFeeds.set(c.id,new SourceCache({...options,id:c.id+'-streams',url:c.url+'/streams',normalize:h=>normalizeStreams(h,c),validate:d=>d.channelId===c.channelId&&Array.isArray(d.videos)&&d.videos.every(v=>isVideoId(v.id)&&v.channelId===c.channelId)}));
    }
  }
  async list(c,refresh){
    const fallback=error=>({cacheState:'offline',error:error.message});
    const [catalog,broadcasts]=await Promise.all([this.playlistFeeds.get(c.id).get(refresh).catch(fallback),this.streamFeeds.get(c.id).get(refresh).catch(fallback)]);
    return {catalog,broadcasts};
  }
  async playlist(c,id,refresh){
    if(!isPlaylistId(id))throw new Error('Invalid playlist.');
    const catalog=await this.playlistFeeds.get(c.id).get();const p=catalog.playlists.find(p=>p.id===id);if(!p)throw new Error('This playlist is not in the game’s official channel archive.');
    const key=c.id+'-'+id;if(!this.matches.has(key))this.matches.set(key,new SourceCache({...this.options,id:key,url:p.url,normalize:h=>normalizePlaylistVideos(h,c,p),validate:d=>d.id===id&&d.channelId===c.channelId&&d.videos?.length>0&&d.videos.every(v=>isVideoId(v.id)&&v.channelId===c.channelId&&v.playlistId===id)}));
    return this.matches.get(key).get(refresh);
  }
}
module.exports={VideoArchives,normalizePlaylists,normalizeStreams,normalizePlaylistVideos,isPlaylistId};
