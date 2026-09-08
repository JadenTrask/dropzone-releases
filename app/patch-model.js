// Date order is shared by the feature card and the list, including store releases.
export function patchPresentation(articles=[]){
  const ordered=[...articles].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const featured=ordered[0]||null;
  return {featured,rest:ordered.slice(1),heading:featured?.kind==='Announcement'?'LATEST DEVELOPER NEWS':'LATEST UPDATE',action:featured?.kind==='Announcement'?'Read announcement':featured?.kind==='Store update'?'Read update':'Read full patch notes'};
}
