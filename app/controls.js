// Native select values remain the source of truth. A keyboard-accessible
// listbox replaces the OS menu so every theme and text size stays consistent.
const controls=new Map();
let openControl=null;
function labelFor(select){return select.getAttribute('aria-label')||document.querySelector(`label[for="${select.id}"]`)?.textContent.trim()||select.closest('label')?.querySelector('span')?.textContent.trim()||'Choose an option';}
function close(c,focus=false){if(!c)return;if(c.panel.matches(':popover-open'))c.panel.hidePopover();c.button.setAttribute('aria-expanded','false');if(focus&&c.button.isConnected)c.button.focus();if(openControl===c)openControl=null;}
function sync(c){c.button.querySelector('span').textContent=c.select.selectedOptions[0]?.textContent||'Select';c.button.disabled=c.select.disabled;}
function open(c){
  close(openControl);sync(c);c.panel.replaceChildren();
  for(const option of c.select.options){
    const b=document.createElement('button');b.type='button';b.setAttribute('role','option');b.setAttribute('aria-selected',String(option.selected));b.textContent=option.textContent;b.disabled=option.disabled;b.dataset.value=option.value;
    b.addEventListener('click',()=>{c.select.value=option.value;sync(c);close(c,true);c.select.dispatchEvent(new Event('change',{bubbles:true}));});c.panel.append(b);
  }
  const rect=c.button.getBoundingClientRect();const width=Math.min(Math.max(rect.width,210),innerWidth-24);const spaceBelow=innerHeight-rect.bottom-14;const above=spaceBelow<180&&rect.top>spaceBelow;
  c.panel.style.width=width+'px';c.panel.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';c.panel.style.maxHeight=Math.max(80,Math.min(360,above?rect.top-20:spaceBelow))+'px';c.panel.style.top=above?'auto':rect.bottom+7+'px';c.panel.style.bottom=above?innerHeight-rect.top+7+'px':'auto';
  c.panel.showPopover();c.button.setAttribute('aria-expanded','true');openControl=c;
  const selected=c.panel.querySelector('[aria-selected="true"]')||c.panel.querySelector('button:not(:disabled)');selected?.focus();
}
function enhance(select){
  if(controls.has(select)||select.multiple)return;
  const button=document.createElement('button');button.type='button';button.className='select-control';button.id=select.id+'-control';button.innerHTML='<span></span><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.7"/></svg>';
  button.setAttribute('role','combobox');button.setAttribute('aria-label',labelFor(select));button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
  const panel=document.createElement('div');panel.className='select-options';panel.id=select.id+'-options';panel.setAttribute('popover','auto');panel.setAttribute('role','listbox');panel.setAttribute('aria-label',labelFor(select));button.setAttribute('aria-controls',panel.id);
  select.classList.add('enhanced-select');select.setAttribute('aria-hidden','true');select.tabIndex=-1;select.after(button);document.body.append(panel);
  const c={select,button,panel};controls.set(select,c);sync(c);
  button.addEventListener('click',()=>openControl===c?close(c,true):open(c));
  button.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();open(c);if(e.key==='End')panel.lastElementChild?.focus();}});
  let typed='',typedAt=0;
  panel.addEventListener('keydown',e=>{
    const options=[...panel.querySelectorAll('button:not(:disabled)')];let index=options.indexOf(document.activeElement);
    if(['ArrowDown','ArrowUp','Home','End','Escape','Tab'].includes(e.key)){
      if(e.key==='Tab'){close(c,true);return;}
      e.preventDefault();if(e.key==='Escape')return close(c,true);
      if(e.key==='Home')index=0;else if(e.key==='End')index=options.length-1;else index=(index+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
      options[index]?.focus();
    }else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){typed=Date.now()-typedAt>600?'':typed;typed+=e.key.toLowerCase();typedAt=Date.now();options.find(o=>o.textContent.toLowerCase().startsWith(typed))?.focus();}
  });
  panel.addEventListener('toggle',e=>{if(e.newState==='closed'){button.setAttribute('aria-expanded','false');if(openControl===c)openControl=null;}});
  select.addEventListener('change',()=>sync(c));
}
export function syncSelects(){for(const c of controls.values())sync(c);}
function scan(){
  for(const [s,c]of controls)if(!s.isConnected){close(c);c.panel.remove();controls.delete(s);}
  document.querySelectorAll('select[id]').forEach(enhance);
}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
window.addEventListener('resize',()=>close(openControl));
document.addEventListener('scroll',e=>{if(openControl&&!openControl.panel.contains(e.target))close(openControl);},true);
scan();
