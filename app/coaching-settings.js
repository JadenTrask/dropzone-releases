import {e,toast} from './shared.js';

let state={settings:{}};
const call=input=>window.rift?.coaching?window.rift.coaching(input):Promise.reject(Error('Coaching overlay is available in the Windows desktop app.'));
const pencil='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const colors=[['#65bbff','Blue'],['#ff9c40','Orange'],['#ffffff','White'],['#ff657a','Red'],['#39d49a','Green'],['#ffe071','Yellow']];
const displayKey=value=>value.replaceAll('Control','Ctrl').replaceAll('+',' + ');
let captureField=null,captureObserver=null,captureQueue=Promise.resolve();
function setShortcutCapture(field){
 captureField=field;captureObserver?.disconnect();captureObserver=null;
 if(field){captureObserver=new MutationObserver(()=>{if(captureField&&!captureField.isConnected)setShortcutCapture(null);});captureObserver.observe(document.body,{childList:true,subtree:true});}
 if(!window.rift?.coaching)return;
 const active=Boolean(field);
 captureQueue=captureQueue.catch(()=>{}).then(()=>call({action:'shortcut-capture',active})).catch(error=>{if(active&&field===captureField){const help=field.form?.querySelector('#rl-shortcut-help');if(help)help.textContent=error.message;}});
}
const option=(value,label,current)=>`<option value="${value}" ${current===value?'selected':''}>${label}</option>`;
const shortcut=(name,label,value)=>`<label class="rl-setting-row rl-shortcut-row"><span><strong>${label}</strong><small>Click the shortcut, then press your keys.</small></span><span class="rl-hotkey-control"><input type="hidden" name="${name}" value="${e(value)}"><input data-coach-hotkey="${name}" value="${e(displayKey(value))}" aria-label="${label}" aria-describedby="rl-shortcut-help" readonly spellcheck="false"></span></label>`;
const toggle=(name,label,help,checked)=>`<label class="rl-setting-row"><span><strong>${label}</strong><small>${help}</small></span><input name="${name}" type="checkbox" role="switch" ${checked?'checked':''}></label>`;

export async function loadCoaching(){if(window.rift?.coaching)state=await call({action:'state'});}

export function coachingSettings(){
 const s=state.settings,opacity=s.opacity??1,thickness=s.thickness||4,color=s.color||'#ffffff';
 return `<section class="rl-coaching-settings" aria-labelledby="rl-coaching-title">
  <header class="rl-coach-intro"><span class="rl-coach-icon">${pencil}</span><div><h3 id="rl-coaching-title">Coaching overlay</h3><p>Draw over the game. Press Esc to return to play.</p></div><button class="hub-button rl-coach-open" data-coach="toggle" aria-pressed="${Boolean(state.active)}">${pencil}<span data-coach-label>${state.suspended?'Coaching ready':state.active?'Drawing active':'Open overlay'}</span></button></header>
  <form id="rl-coaching-settings">
   <section class="rl-preference-group" aria-labelledby="rl-coach-shortcuts"><h4 id="rl-coach-shortcuts">Overlay & shortcuts</h4>
    ${toggle('enabled','Enable coaching overlay','Available over Rocket League in Borderless or Windowed mode.',s.enabled!==false)}
    ${shortcut('toggleKey','Drawing mode',s.toggleKey||'Control+Alt+C')}
    ${shortcut('clearKey','Clear drawing',s.clearKey||'Control+Alt+Backspace')}
    <p id="rl-shortcut-help" class="rl-setting-hint" aria-live="polite">Use Ctrl, Alt or Shift with another key. Your shortcuts are saved below.</p>
   </section>
   <section class="rl-preference-group" aria-labelledby="rl-coach-drawing"><h4 id="rl-coach-drawing">Drawing</h4>
    <label class="rl-setting-row"><span><strong>Default tool</strong><small>Ready when you enter drawing mode.</small></span><select id="rl-coach-tool" name="tool" aria-label="Default drawing tool">${[['pencil','Pencil'],['arrow','Arrow'],['line','Line'],['ellipse','Circle / ellipse'],['box','Rectangle'],['text','Text'],['eraser','Eraser']].map(([v,l])=>option(v,l,s.tool||'pencil')).join('')}</select></label>
    <div class="rl-setting-row rl-color-row"><span><strong>Default color</strong><small>Team colors or a color of your own.</small></span><div class="rl-color-palette" role="group" aria-label="Default drawing color">${colors.map(([v,l])=>`<button type="button" data-coach-color="${v}" class="rl-color-swatch" style="--swatch:${v}" aria-label="${l}" aria-pressed="${color.toLowerCase()===v}"></button>`).join('')}<label class="rl-custom-color" title="Custom color"><span>Custom color</span><input name="color" type="color" aria-label="Custom drawing color" value="${e(color)}"></label></div></div>
    <label class="rl-setting-row"><span><strong>Thickness</strong><small>Weight of lines and shapes.</small></span><span class="rl-range-control"><input name="thickness" type="range" min="1" max="24" step="1" value="${thickness}" style="--range-fill:${(thickness-1)/23*100}%"><output data-coach-value="thickness">${thickness} px</output></span></label>
    <label class="rl-setting-row"><span><strong>Opacity</strong><small>Keep the field visible beneath your drawing.</small></span><span class="rl-range-control"><input name="opacity" type="range" min="0.1" max="1" step="0.05" value="${opacity}" style="--range-fill:${(opacity-.1)/.9*100}%"><output data-coach-value="opacity">${Math.round(opacity*100)}%</output></span></label>
   </section>
   <section class="rl-preference-group" aria-labelledby="rl-coach-behavior"><h4 id="rl-coach-behavior">Behavior</h4>
    <label class="rl-setting-row"><span><strong>Clear temporary drawings</strong><small>Persistent drawings always stay until you clear them.</small></span><select id="rl-coach-auto-clear" name="autoClear" aria-label="Clear temporary drawings">${[['manual','Manually'],['screenshot','After a screenshot'],['timer','After a delay']].map(([v,l])=>option(v,l,s.autoClear||'manual')).join('')}</select></label>
    <label class="rl-setting-row" data-coach-delay ${s.autoClear==='timer'?'':'hidden'}><span><strong>Clear after</strong><small>Time since the drawing was placed.</small></span><span class="rl-number-control"><input name="seconds" type="number" min="3" max="300" value="${s.seconds||15}"><span>seconds</span></span></label>
    ${toggle('rememberPosition','Remember toolbar position','Keep your tools where you left them.',s.rememberPosition!==false)}
    <label class="rl-setting-row"><span><strong>Resource mode</strong><small>Drawing renders only when something changes.</small></span><select id="rl-coach-resource-mode" name="lowResource" aria-label="Resource mode">${option('auto','Auto · balanced',s.lowResource||'auto')}${option('low','Low · 1× resolution',s.lowResource)}</select></label>
   </section>
   <section class="rl-preference-group" aria-labelledby="rl-coach-captures"><h4 id="rl-coach-captures">Captures</h4>
    ${toggle('screenshots','Annotated screenshots','Save the game frame together with your annotations.',s.screenshots!==false)}
    <div class="rl-setting-row"><span><strong>Saved screenshots</strong><small>Stored in your Dropzone Rocket League folder.</small></span><button class="hub-button secondary" type="button" data-coach="captures">Open folder <span aria-hidden="true">↗</span></button></div>
   </section>
   <div class="rl-settings-save"><p id="rl-coaching-status" role="status">${e(state.error||'')}</p><button class="hub-button" type="submit">Save coaching settings</button></div>
  </form>
 </section>`;
}

// Only the focused shortcut field captures keys. Game and normal app input stay untouched.
export function hotkeyFromEvent(event){
 if(['Control','Alt','Shift','Meta'].includes(event.key))return null;
 if(event.metaKey||!(event.ctrlKey||event.altKey||event.shiftKey))return null;
 const key=/^Key[A-Z]$/.test(event.code)?event.code.slice(3):/^Digit[0-9]$/.test(event.code)?event.code.slice(5):event.key===' '?'Space':event.key.length===1?event.key.toUpperCase():event.key;
 if(!/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space|Backspace)$/.test(key))return null;
 return [event.ctrlKey&&'Control',event.altKey&&'Alt',event.shiftKey&&'Shift',key].filter(Boolean).join('+');
}

document.addEventListener('focusin',event=>{const field=event.target.closest('[data-coach-hotkey]');if(field){field.dataset.original=field.value;field.value='Press shortcut…';field.classList.add('is-recording');setShortcutCapture(field);}});
document.addEventListener('focusout',event=>{const field=event.target.closest('[data-coach-hotkey]');if(field){field.value=displayKey(field.form.elements[field.dataset.coachHotkey].value);field.classList.remove('is-recording');if(captureField===field)setShortcutCapture(null);}});
window.addEventListener('blur',()=>{if(captureField){captureField.blur();if(captureField)setShortcutCapture(null);}});
window.addEventListener('pagehide',()=>{if(captureField)setShortcutCapture(null);});
document.addEventListener('keydown',event=>{
 const field=event.target.closest?.('[data-coach-hotkey]');if(!field||event.key==='Tab')return;
 event.preventDefault();event.stopImmediatePropagation();
 if(event.key==='Escape'){field.blur();return;}
 const key=hotkeyFromEvent(event),help=field.form.querySelector('#rl-shortcut-help');
 if(!key){if(!['Control','Alt','Shift','Meta'].includes(event.key))help.textContent='Include Ctrl, Alt or Shift with a letter, number, F-key, Space or Backspace.';return;}
 field.form.elements[field.dataset.coachHotkey].value=key;field.value=displayKey(key);help.textContent='Shortcut captured. Save coaching settings to apply it.';field.blur();
},true);

document.addEventListener('input',event=>{
 const form=event.target.closest('#rl-coaching-settings');if(!form)return;
 const {name,value}=event.target;
 if(name==='thickness'||name==='opacity'){form.querySelector(`[data-coach-value="${name}"]`).textContent=name==='opacity'?`${Math.round(Number(value)*100)}%`:`${value} px`;event.target.style.setProperty('--range-fill',`${(Number(value)-Number(event.target.min))/(Number(event.target.max)-Number(event.target.min))*100}%`);}
 if(name==='color')for(const button of form.querySelectorAll('[data-coach-color]'))button.setAttribute('aria-pressed',String(button.dataset.coachColor.toLowerCase()===value.toLowerCase()));
 if(name==='autoClear')form.querySelector('[data-coach-delay]').hidden=value!=='timer';
});
document.addEventListener('change',event=>{if(event.target.matches('#rl-coaching-settings [name=autoClear]'))event.target.form.querySelector('[data-coach-delay]').hidden=event.target.value!=='timer';});
document.addEventListener('click',async event=>{
 const swatch=event.target.closest('[data-coach-color]');if(swatch){const input=swatch.closest('form').elements.color;input.value=swatch.dataset.coachColor;input.dispatchEvent(new Event('input',{bubbles:true}));return;}
 const b=event.target.closest('[data-coach]');if(!b)return;
 try{if(b.dataset.coach==='captures')await call({action:'captures'});else state=await call({action:'toggle'});}catch(err){toast(err.message);}
});
document.addEventListener('submit',async event=>{
 if(event.target.id!=='rl-coaching-settings')return;event.preventDefault();
 const form=event.target,settings=Object.fromEntries(new FormData(form)),button=event.submitter||form.querySelector('[type=submit]');
 for(const key of ['enabled','rememberPosition','screenshots'])settings[key]=form.elements[key].checked;
 button.disabled=true;
 try{state=await call({action:'settings',settings});form.querySelector('[role=status]').textContent='Coaching settings saved.';}catch(err){form.querySelector('[role=status]').textContent=err.message;}finally{button.disabled=false;}
});
window.rift?.onCoaching?.(value=>{
 state=value;
 for(const b of document.querySelectorAll('[data-coach=toggle]')){const label=value.suspended?'Coaching ready':value.active?'Drawing active':value.starting?'Opening overlay…':'Coaching overlay';const text=b.querySelector('[data-coach-label]');if(text)text.textContent=label;else b.textContent='✎ '+label;b.classList.toggle('is-active',Boolean(value.active));b.setAttribute('aria-pressed',String(Boolean(value.active)));}
 const error=document.querySelector('#rl-coaching-status');if(error)error.textContent=value.error||'';
});
