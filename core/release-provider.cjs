'use strict';
const {SourceCache,text,decode}=require('./source-cache.cjs');
const SOURCE='https://www.callofduty.com/blog/2026/05/call-of-duty-modern-warfare-4-announcement';
function normalizeRelease(html){
  const headings=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>text(decode(m[1])));
  const heading=headings.find(h=>/Modern Warfare.?\s*4/i.test(h));
  const date=heading?.match(/(?:releases?|launches?) on\s+([A-Za-z]+ \d{1,2}, \d{4})/i)?.[1];
  if(!date)throw new Error('The official announcement no longer has a recognized release date. Open it to verify the schedule.');
  const time=Date.parse(date+' 00:00:00 GMT');
  if(!Number.isFinite(time)||time<Date.UTC(2020,0,1)||time>Date.UTC(2100,0,1))throw new Error('Invalid announced release date.');
  const releaseDate=new Date(time).toISOString().slice(0,10);
  return {source:'Call of Duty',sourceUrl:SOURCE,sourceUpdatedAt:null,releaseDate};
}
function releaseProvider(options){return new SourceCache({...options,id:'mw4-release',url:SOURCE,normalize:normalizeRelease,validate:d=>/^\d{4}-\d{2}-\d{2}$/.test(d.releaseDate||'')});}
module.exports={releaseProvider,normalizeRelease};
