'use strict';
module.exports=async({boot,run,win,pause,capture,report})=>{
 const check=async(name,fn)=>{const passed=await run(fn);report.flows.push({name,passed});if(!passed)throw Error(name);};
 await boot('?game=settings');
 for(const previous of ['light','system','dark']){
  await run(previous=>{localStorage.setItem('dropzone-appearance',JSON.stringify(previous));localStorage.setItem('qa-retained-setting','retain');localStorage.setItem('dropzone-accessibility-v1',JSON.stringify({contrast:true,reducedMotion:true}));},previous);
  const url=await run(()=>location.href);await win.loadURL(url);
  await check('Cold HTML starts dark with saved '+previous,()=>document.documentElement.dataset.appearance==='dark'&&getComputedStyle(document.documentElement).colorScheme==='dark');
  await run(async()=>{await import('/appearance.js');});
  await check('Saved '+previous+' migrates without losing other settings',()=>localStorage.getItem('dropzone-appearance')==='"dark"'&&localStorage.getItem('qa-retained-setting')==='retain'&&JSON.parse(localStorage.getItem('dropzone-accessibility-v1')).contrast===true);
 }
 await run(()=>localStorage.setItem('dropzone-accessibility-v1',JSON.stringify({contrast:false,reducedMotion:false})));
 await boot('?game=settings');await pause(200);
 await check('Settings removes appearance choices and retains accessibility',()=>!document.querySelector('#appearance-theme')&&!!document.querySelector('#text-size-select')&&!!document.querySelector('[data-access="contrast"]')&&!!document.querySelector('[data-access="reducedMotion"]'));
 for(const [w,h]of[[1920,1080],[2560,1440],[3840,2160],[1000,900]])await capture('settings-dark-only',w,h);
 await run(()=>{document.querySelector('[data-access="contrast"]').click();document.querySelector('[data-access="reducedMotion"]').click();});
 await check('Accessibility switches still apply',()=>document.body.classList.contains('app-high-contrast')&&document.body.classList.contains('app-reduced-motion'));
 await capture('settings-dark-accessibility',1920,1080);
 await run(()=>{document.querySelector('[data-access="contrast"]').click();document.querySelector('[data-access="reducedMotion"]').click();localStorage.setItem('dropzone-appearance','"light"');window.dispatchEvent(new StorageEvent('storage',{key:'dropzone-appearance',newValue:'"light"'}));});
 await check('Old preference writes cannot reactivate light',()=>document.documentElement.dataset.appearance==='dark'&&localStorage.getItem('dropzone-appearance')==='"dark"');
};
