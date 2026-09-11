// Served only by the development preview. Restore the open page after reload.
const prior=sessionStorage.getItem('dropzone-preview-page');
if(prior){sessionStorage.removeItem('dropzone-preview-page');const restore=()=>{const button=document.querySelector(`.app-rail [data-route="${prior}"]`);if(button){button.click();observer.disconnect();}};const observer=new MutationObserver(restore);observer.observe(document.body,{subtree:true,childList:true});restore();}
new EventSource('/__preview_events').onmessage=()=>{
  const route=document.querySelector('.app-rail [aria-current="page"]')?.dataset.route;
  if(route&&/^[a-z0-9-]+$/.test(route))sessionStorage.setItem('dropzone-preview-page',route);
  location.reload();
};
