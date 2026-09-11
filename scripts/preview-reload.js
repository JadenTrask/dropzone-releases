// The hub restores the saved route before its first render.
new EventSource('/__preview_events').onmessage=()=>{
  const route=document.querySelector('.app-rail [aria-current="page"]')?.dataset.route;
  if(route&&/^[a-z0-9-]+$/.test(route))sessionStorage.setItem('dropzone-preview-page',route);
  location.reload();
};
