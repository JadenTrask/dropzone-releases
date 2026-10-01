'use strict';
// NSIS keeps the installed executable at a stable path across updates.
// Windows owns persistence; querying Settings never creates a startup entry.
function createLoginStartup({app,platform=process.platform,installed=false,execPath=process.execPath}){
 const name='com.dropzone.desktop',options={path:execPath,args:[]};
 function status(){
  if(platform!=='win32'||!app.isPackaged||!installed)return {available:false,enabled:false,message:'Available in the installed Windows app. Development and portable copies do not register startup entries.'};
  try{
   const value=app.getLoginItemSettings(options);
   const item=value.launchItems?.find(row=>row.name===name&&row.scope==='user');
   const enabled=!!value.openAtLogin&&(item?item.enabled!==false:value.executableWillLaunchAtLogin!==false);
   return {available:true,enabled,message:value.openAtLogin&&!enabled?'Disabled in Windows Startup apps. Turn this on to enable it again.':enabled?'Dropzone starts when you sign in to Windows.':'Off. Dropzone will not start with Windows.'};
  }catch{return {available:false,enabled:false,message:'Windows startup settings could not be read. Try again after reopening Dropzone.'};}
 }
 function command(input={}){
  if(input.action===undefined||input.action==='status')return status();
  if(input.action!=='set'||typeof input.enabled!=='boolean')throw Error('Invalid startup setting.');
  const current=status();if(!current.available)return current;
  try{
   app.setLoginItemSettings({...options,name,openAtLogin:input.enabled,enabled:input.enabled});
   const result=status();
   return result.available&&result.enabled===input.enabled?result:{...result,message:'Windows did not apply the startup preference. Check Windows Startup apps and try again.'};
  }catch{return {...status(),message:'Windows could not change this preference. Your current setting is shown.'};}
 }
 return {command};
}
module.exports={createLoginStartup};
