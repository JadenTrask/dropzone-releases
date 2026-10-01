// The game-coloured dark appearance is the only supported theme. Migrate only
// this preference; accessibility, account and game settings stay untouched.
export function appearancePreference(){return 'dark';}
export function applyAppearance(){
 document.documentElement.dataset.appearance='dark';document.documentElement.style.colorScheme='dark';
 try{if(localStorage.getItem('dropzone-appearance')!==JSON.stringify('dark'))localStorage.setItem('dropzone-appearance',JSON.stringify('dark'));}catch{}
}
window.addEventListener('storage',event=>{if(event.key==='dropzone-appearance')applyAppearance();});
applyAppearance();
