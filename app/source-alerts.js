const KEY='dropzone-muted-source-reviews';
export function readMutedReviews(storage){
  try{const value=JSON.parse(storage.getItem(KEY));return new Set(Array.isArray(value)?value.filter(id=>typeof id==='string'&&id.length<200):[]);}catch{return new Set();}
}
export function saveMutedReviews(storage,ids){storage.setItem(KEY,JSON.stringify([...ids]));}
export function isOldSource(row,now=Date.now()){return !!row.sourceUpdatedAt&&now-Date.parse(row.sourceUpdatedAt)>30*86400000&&!row.id.includes('esports')&&!row.id.includes('league');}
export function needsSourceAttention(row,muted,now=Date.now()){
  return row.state==='offline'||(!muted.has(row.id)&&(row.state==='review'||isOldSource(row,now)));
}
