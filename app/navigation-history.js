// Electron's file URL stays fixed; route identity belongs to each history entry.
export function recordRoute(history,location,{id,context=null,view=null,replace=false,preserveState=false}){
 const route={id,context,view};
 const state={...(preserveState?history.state:{}),dropzone:true,route};
 const previous=history.state?.route;
 const same=previous?.id===id&&previous?.context===context&&previous?.view===view;
 const method=replace||same?'replaceState':'pushState';
 if(location.protocol==='file:'){history[method](state,'');return;}
 const url=new URL(location.href);
 url.searchParams.set('game',id);
 if(context)url.searchParams.set('context',context);else url.searchParams.delete('context');
 if(view)url.searchParams.set('view',view);else url.searchParams.delete('view');
 history[method](state,'',url);
}

export function restoredRoute(history,location){
 const saved=history.state?.route;
 if(saved&&typeof saved.id==='string')return [saved.id,typeof saved.context==='string'?saved.context:null,typeof saved.view==='string'?saved.view:null];
 const params=new URL(location.href).searchParams;
 return [params.get('game')||'home',params.get('context'),params.get('view')];
}
