const {requestText,text}=require('./source-cache.cjs');
const {SOURCES}=require('./patch-provider.cjs');
const HOSTS=new Set(['www.leagueoflegends.com','www.callofduty.com','www.reachthefinals.com','store.steampowered.com','steamcommunity.com','www.ubisoft.com']);
function cleanNames(names){if(!Array.isArray(names))throw Error('Choose gear to track.');return [...new Set(names.filter(x=>typeof x==='string'&&x.trim().length>=2&&x.length<=80).map(x=>x.trim()))].slice(0,60);}
function findMentions(body,names){const clean=text(body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' '));return cleanNames(names).filter(name=>new RegExp('(?:^|[^a-z0-9])'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^a-z0-9])','i').test(clean));}
function createPersonalIntel(patches,request=requestText){const cache=new Map();return async input=>{
 const names=cleanNames(input?.names);if(!['lol','bo7','warzone','finals','siege','wardogs'].includes(input?.game))throw Error('Unsupported game.');
 const feed=await patches.list({game:input.game});const article=feed.articles?.find(a=>/patch/i.test(a.kind));if(!article)return {game:input.game,names:[],message:'No patch-note post is available in the current feed.'};
 const url=new URL(article.url),steam=['wardogs','siege'].includes(input.game);if(url.protocol!=='https:'||!(HOSTS.has(url.hostname)||(steam&&url.hostname==='steamstore-a.akamaihd.net'))||url.username||url.password)throw Error('Unexpected publisher link.');
 let content=cache.get(article.url);if(!content||Date.now()-content.time>15*60_000){
  let body;
  if(steam){const source=SOURCES[input.game].feed,appid=Number(new URL(source).searchParams.get('appid')),news=JSON.parse(await request(source)).appnews;if(news?.appid!==appid||!Array.isArray(news.newsitems))throw Error('Unexpected Steam feed.');const item=news.newsitems.find(n=>n.appid===appid&&n.feedname==='steam_community_announcements'&&n.url===article.url);if(typeof item?.contents!=='string')throw Error('The selected patch is no longer in the current Steam feed. Refresh patch notes and try again.');body=item.contents;}
  else body=await request(article.url);
  content={body,time:Date.now()};cache.set(article.url,content);if(cache.size>12)cache.delete(cache.keys().next().value);
 }
 return {game:input.game,article,names:findMentions(content.body,names),checkedAt:new Date(content.time).toISOString(),message:'Publisher-page mentions, not a confirmed balance change. Open the notes for context.'};
};}
module.exports={createPersonalIntel,findMentions,cleanNames};
