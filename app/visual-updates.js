import {api} from './shared.js';
const names={introBlur:['--visual-intro-blur','px'],introZoom:['--visual-intro-zoom',''],pageGutter:['--visual-page-gutter','px'],settingsGap:['--visual-settings-gap','px'],panelPadding:['--visual-panel-padding','px']};
export async function applyVisualUpdates(){
 if(!api.visualUpdates)return;
 try{const state=await api.visualUpdates();const data=state.active;if(!data)return;
 for(const [key,value] of Object.entries(data.tokens)){const spec=names[key];if(spec)document.documentElement.style.setProperty(spec[0],value+spec[1]);}
 const apply=root=>{for(const image of root.querySelectorAll('img')){const source=image.getAttribute('src');if(data.assets.startupLogo&&source==='assets/startup-original.png')image.src=data.assets.startupLogo;if(data.assets.brandIcon&&source==='assets/brand.svg')image.src=data.assets.brandIcon;}};
 apply(document);if(Object.keys(data.assets).length)new MutationObserver(()=>apply(document)).observe(document.body,{childList:true,subtree:true});
 document.documentElement.dataset.visualRevision=String(data.revision);
 }catch{/* Bundled visuals remain available offline or after an invalid package. */}
}
