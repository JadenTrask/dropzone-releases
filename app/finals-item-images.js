import catalog from './data/finals/item-images.json' with {type:'json'};
import {escapeHtml} from './engine.js';

export function finalsItemImage(name){
  const canonical=catalog.aliases[name]||name;
  return Object.hasOwn(catalog.items,canonical)?catalog.items[canonical]:null;
}

export function itemImagery(name){
  const item=finalsItemImage(name),label='<span class="fn-item-unavailable">Image unavailable</span>';
  if(!item?.path)return `<span class="fn-item-media" data-finals-item="${escapeHtml(name)}">${label}</span>`;
  return `<span class="fn-item-media" data-finals-item="${escapeHtml(name)}"><img src="${escapeHtml(item.path)}" alt="" draggable="false" decoding="async" data-finals-item-image><span class="fn-item-unavailable" hidden>Image unavailable</span></span>`;
}

// Image errors do not bubble. Keep the item name and show an honest fallback
// for future feed entries, unavailable assets, or missing packaged files.
export function itemImageError(event){
  const image=event.target;
  if(!image?.matches?.('img[data-finals-item-image]'))return;
  image.hidden=true;
  image.parentElement.querySelector('.fn-item-unavailable').hidden=false;
}
