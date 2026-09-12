'use strict';
const {SourceCache,requestText,text,decode,tag,iso} = require('./source-cache.cjs');
const SOURCES = {
  lol:{name:'Riot Games',url:'https://www.leagueoflegends.com/en-us/news/game-updates/'},
  bo7:{name:'Treyarch / Activision',url:'https://www.callofduty.com/patchnotes'},
  warzone:{name:'Raven Software / Activision',url:'https://www.callofduty.com/patchnotes'},
  mw4:{name:'Infinity Ward / Activision',url:'https://www.callofduty.com/patchnotes'},
  finals:{name:'Embark Studios',url:'https://www.reachthefinals.com/patchnotes',feed:'https://www.reachthefinals.com/patchnotes?format=rss'},
  'gray-zone':{name:'MADFINGER Games',url:'https://store.steampowered.com/news/app/2479810',feed:'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2479810&count=30&maxlength=0&feeds=steam_community_announcements'},
  siege:{name:'Ubisoft',url:'https://www.ubisoft.com/en-us/game/rainbow-six/siege/news-updates',feed:'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=359550&count=30&maxlength=0&feeds=steam_community_announcements'},
  wardogs:{name:'BULKHEAD / Team17',url:'https://store.steampowered.com/news/app/1867240',feed:'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1867240&count=30&maxlength=0&feeds=steam_community_announcements'}
};
function excerpt(s) {
  const clean=text(decode(s).replace(/\[\/?[^\]]+\]/g,' ').replace(/https?:\/\/\S+/g,' '));
  const words=clean.split(/\s+/);
  return words.slice(0,20).join(' ')+(words.length>20?'â€¦':'');
}
function officialUrl(value,origin,prefix) {
  const u=new URL(value,origin);
  if(u.origin!==origin||!u.pathname.startsWith(prefix)||u.username||u.password) throw new Error('Unexpected patch-note source.');
  return u.href;
}
function envelope(game,articles) {
  const all=[...new Map(articles.map(a=>[a.url,a])).values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const unique=all.slice(0,8);
  if(game==='wardogs'){const latestPatch=all.find(a=>a.kind==='Patch notes');if(latestPatch&&!unique.includes(latestPatch))unique[unique.length-1]=latestPatch;}
  if(!unique.length) throw new Error('The official feed did not return any matching posts.');
  return {game,source:SOURCES[game].name,sourceUrl:SOURCES[game].url,sourceUpdatedAt:unique[0].publishedAt,articles:unique};
}
function normalizeLeague(html) {
  const json=html.match(/<script\b[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if(!json) throw new Error('Riotâ€™s patch index changed format.');
  const entries=[];
  function walk(value) {
    if(!value||typeof value!=='object') return;
    if(value.title&&value.publishedAt&&/\bpatch\b.*\bnotes\b/i.test(value.title)) {
      const url=value.action?.payload?.url;
      if(typeof url==='string'&&!/^https?:\/\/(?!www\.leagueoflegends\.com)/i.test(url)&&!/teamfight|tft/i.test(value.title+url)) {
        entries.push({title:text(value.title),publishedAt:iso(value.publishedAt),dateLabel:'Published',url:officialUrl(url,'https://www.leagueoflegends.com','/en-us/news/game-updates/'),excerpt:excerpt(value.description?.body||''),kind:'Patch notes'});
      }
    }
    for(const child of Object.values(value)) if(child&&typeof child==='object') walk(child);
  }
  walk(JSON.parse(json));
  return envelope('lol',entries);
}
function normalizeValorant(html) {
  const json=html.match(/<script\b[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if(!json) throw new Error('Riotâ€™s patch index changed format.');
  const entries=[];
  function walk(value) {
    if(!value||typeof value!=='object') return;
    if(value.title&&value.publishedAt&&/\bpatch\b.*\bnotes\b/i.test(value.title)) {
      const url=value.action?.payload?.url;
      if(typeof url==='string'&&!/^https?:\/\/(?!playvalorant\.com)/i.test(url)&&!/teamfight|tft/i.test(value.title+url)) {
        entries.push({title:text(value.title),publishedAt:iso(value.publishedAt),dateLabel:'Published',url:officialUrl(url,'https://playvalorant.com','/en-us/news/'),excerpt:excerpt(value.description?.body||''),kind:'Patch notes'});
      }
    }
    for(const child of Object.values(value)) if(child&&typeof child==='object') walk(child);
  }
  walk(JSON.parse(json));
  return envelope('valorant',entries);
}
function normalizeCod(html,game) {
  const tagName=game==='warzone'?'warzone':game;
  const entries=[];
  for(const card of html.split(/<div\s+class="card-inner"\s*>/).slice(1)) {
    const body=card.split('<div class="post-grid-accordion"')[0];
    if(!new RegExp('class="game-tile '+tagName+'"').test(body)) continue;
    const date=body.match(/data-date="([^"]+)"[^>]*class="news-published"/)?.[1];
    const title=body.match(/<div class="title"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if(!date||!title||!/patch.*notes/i.test(text(title[2]))) throw new Error('The Call of Duty patch card is incomplete.');
    entries.push({title:text(decode(title[2])),publishedAt:iso(date+' 00:00:00 GMT'),dateLabel:'Updated',url:officialUrl(title[1],'https://www.callofduty.com','/patchnotes/'),excerpt:'',kind:/beta/i.test(title[2])?'Beta patch notes':'Patch notes'});
  }
  return envelope(game,entries);
}
function normalizeFinals(xml) {
  const entries=[];
  for(const [,item] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    const title=text(tag(item,'title'));
    if(!/\b\d+\.\d+\.\d+\b/.test(title)) continue;
    entries.push({title,publishedAt:iso(tag(item,'pubDate')),dateLabel:'Published',url:officialUrl(tag(item,'link'),'https://www.reachthefinals.com','/patchnotes/'),excerpt:excerpt(tag(item,'description')),kind:/^Store Update/i.test(title)?'Store update':'Patch notes'});
  }
  return envelope('finals',entries);
}
function normalizeWardogsNews(json,game='wardogs',appid=1867240) {
  const data=JSON.parse(json).appnews;
  if(data?.appid!==appid||!Array.isArray(data.newsitems)) throw new Error('Unexpected Steam news feed.');
  const entries=[];
  for(const n of data.newsitems) {
    if(n.feedname!=='steam_community_announcements'||n.appid!==appid) continue;
    const url=new URL(n.url);
    if(url.protocol!=='https:'||!['store.steampowered.com','steamcommunity.com','steamstore-a.akamaihd.net'].includes(url.hostname)||url.username||url.password) throw new Error('Unexpected Steam announcement link.');
    entries.push({title:text(n.title),publishedAt:iso(new Date(n.date*1000).toISOString()),dateLabel:'Published',url:url.href,excerpt:excerpt(n.contents),kind:/\b(patch|hotfix|changelog)\b|update\s*(?:\d|notes)/i.test(n.title)?'Patch notes':'Announcement'});
  }
  return envelope(game,entries);
}
class PatchProvider {
  constructor(options) {
    this.feeds=new Map();this.codPending=null;
    const request=options.requestFn||requestText;
    const codRequest=()=>{
      if(!this.codPending) this.codPending=request(SOURCES.bo7.url).finally(()=>{this.codPending=null;});
      return this.codPending;
    };
    for(const [game,source] of Object.entries(SOURCES)) {
      if(options.disabledGames?.includes(game))continue;
      const normalizer=game==='valorant'?normalizeValorant:game==='rivals'?json=>normalizeWardogsNews(json,'rivals',2767030):game==='lol'?normalizeLeague:game==='finals'?normalizeFinals:game==='wardogs'?normalizeWardogsNews:game==='siege'?json=>normalizeWardogsNews(json,'siege',359550):game==='gray-zone'?json=>normalizeWardogsNews(json,'gray-zone',2479810):html=>normalizeCod(html,game);
      this.feeds.set(game,new SourceCache({...options,id:'patches-'+game,url:source.feed||source.url,requestFn:['bo7','warzone','mw4'].includes(game)?codRequest:request,
        normalize:normalizer,validate:d=>d.game===game&&Array.isArray(d.articles)&&d.articles.length>0&&d.articles.every(a=>typeof a.title==='string'&&typeof a.url==='string'&&Number.isFinite(Date.parse(a.publishedAt)))}));
    }
  }
  async list(options={}) {
    if(!options||typeof options!=='object'||Array.isArray(options)||!this.feeds.has(options.game)) throw new Error('Choose a game to see its patch notes.');
    return this.feeds.get(options.game).get(options.refresh===true||options.refresh==='true');
  }
}
module.exports={PatchProvider,SOURCES,normalizeLeague,normalizeCod,normalizeFinals,normalizeWardogsNews,normalizeValorant};
