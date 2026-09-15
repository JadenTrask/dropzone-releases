const systemTheme=matchMedia('(prefers-color-scheme: light)');
export function appearancePreference(){try{const value=JSON.parse(localStorage.getItem('dropzone-appearance'));return ['light','dark','system'].includes(value)?value:'dark';}catch{return 'dark';}}
export function applyAppearance(){const preference=appearancePreference(),value=preference==='system'?(systemTheme.matches?'light':'dark'):preference;document.documentElement.dataset.appearance=value;document.documentElement.style.colorScheme=value;}
systemTheme.addEventListener('change',()=>{if(appearancePreference()==='system')applyAppearance();});
window.addEventListener('storage',event=>{if(event.key==='dropzone-appearance')applyAppearance();});
applyAppearance();
