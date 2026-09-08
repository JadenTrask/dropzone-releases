const {test}=require('node:test');const assert=require('node:assert/strict');
test('muting one review survives reopening and does not mute another source or change its data',async()=>{
 const {readMutedReviews,saveMutedReviews,needsSourceAttention}=await import('../app/source-alerts.js');
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const row={id:'bo7-ranked',state:'review',sourceUpdatedAt:'2020-01-01',detail:'Bundled ranked pool'};const original=structuredClone(row);
 saveMutedReviews(storage,new Set([row.id]));const restored=readMutedReviews(storage);
 assert.equal(needsSourceAttention(row,restored),false);assert.equal(needsSourceAttention({...row,id:'finals'},restored),true);assert.deepEqual(row,original);
 saveMutedReviews(storage,new Set());assert.equal(needsSourceAttention(row,readMutedReviews(storage)),true);
});
test('muted reviews still report refresh failures',async()=>{
 const {needsSourceAttention}=await import('../app/source-alerts.js');
 assert.equal(needsSourceAttention({id:'bo7-ranked',state:'offline'},new Set(['bo7-ranked'])),true);
});
test('broken preferences fail open so warnings are not silently lost',async()=>{
 const {readMutedReviews}=await import('../app/source-alerts.js');
 for(const value of ['oops','{}','null'])assert.equal(readMutedReviews({getItem:()=>value}).size,0);
 assert.equal(readMutedReviews({getItem:()=>{throw Error('unavailable');}}).size,0);
});
