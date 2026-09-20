import {escapeHtml as e} from './engine.js';
export function sourceStatus({id='',label='Source details',detail='',tone='neutral'}={}){
 return `<details ${id?`id="${e(id)}"`:''} class="source-status" data-tone="${e(tone)}"><summary><span class="source-status-dot" aria-hidden="true"></span><span class="source-status-label">${e(label)}</span><span aria-hidden="true">⌄</span></summary><div class="source-status-detail" role="status">${e(detail)}</div></details>`;
}
export function updateSourceStatus(id,{label,detail,tone='neutral'}){const el=document.getElementById(id);if(!el)return;el.dataset.tone=tone;el.querySelector('.source-status-label').textContent=label;el.querySelector('.source-status-detail').textContent=detail;}
