'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile),GAMES=['lol','bo7','warzone','finals','siege','wardogs'];
function createCommandService({window,app,dialog,shell}){
 const root=path.join(app.getPath('userData'),'command-center'),configFile=path.join(root,'launchers.json'),room=require('./companion-server.cjs').createCompanionServer();
 let config={},micUntil=0;
 const loaded=fs.mkdir(root,{recursive:true}).then(()=>fs.readFile(configFile,'utf8').then(s=>{config=JSON.parse(s);}).catch(()=>{}));
 async function command(input={}){await loaded;const {action,game}=input;if(game&&!GAMES.includes(game))throw Error('Unsupported game.');if(['configure-launch','launch','settings-backup'].includes(action)&&!GAMES.includes(game))throw Error('Choose a game.');
  if(action==='open-link'){const u=new URL(input.url);if(u.protocol!=='https:'||u.username||u.password)throw Error('Use an HTTPS link without credentials.');await shell.openExternal(u.href);return true;}
  if(action==='configure-launch'){
   const choice=await dialog.showOpenDialog(window,{title:'Choose a game or companion application',properties:['openFile'],filters:[{name:'Windows application or shortcut',extensions:['exe','lnk','url']}]});
   if(choice.canceled)return {canceled:true};const file=choice.filePaths[0];if(!['.exe','.lnk','.url'].includes(path.extname(file).toLowerCase()))throw Error('Choose an application or shortcut.');
   const id=game+(input.companion?'-companion':'');config[id]=file;await fs.writeFile(configFile,JSON.stringify(config));return {name:path.basename(file)};
  }
  if(action==='launch'){const keys=[...(input.launchGame===true?[game]:[]),...(input.companion?[game+'-companion']:[])];const opened=[];for(const key of keys){if(!config[key])throw Error('Choose the '+(key.endsWith('-companion')?'companion':'game')+' launcher in Settings first.');}for(const key of keys){const error=await shell.openPath(config[key]);if(error)throw Error(error);opened.push(path.basename(config[key]));}if(!opened.length)throw Error('Select an application to launch.');return {opened};}
  if(action==='launch-status')return Object.fromEntries(Object.entries(config).map(([k,v])=>[k,path.basename(v)]));
  if(action==='detect'){
   const {stdout}=await run('tasklist.exe',['/FO','CSV','/NH'],{windowsHide:true,timeout:5000,maxBuffer:2000000});
   const processes=new Set(stdout.split('\n').map(s=>s.match(/^"([^"]+)"/)?.[1]?.toLowerCase()));
   const known={lol:['league of legends.exe'],siege:['rainbowsix.exe','rainbowsix_dx12.exe'],finals:['discovery.exe'],wardogs:['wardogs-win64-shipping.exe']};
   return {games:Object.entries(known).filter(([,names])=>names.some(n=>processes.has(n))).map(([id])=>id),checkedAt:new Date().toISOString()};
  }
  if(action==='health')return {platform:process.platform,freeMemory:os.freemem(),totalMemory:os.totalmem(),appMemory:process.memoryUsage().rss,uptime:process.uptime(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length};
  if(action==='microphone'){micUntil=Date.now()+30000;return true;}
  if(action==='settings-backup'){
   const choice=await dialog.showOpenDialog(window,{title:'Back up a game settings file',properties:['openFile'],filters:[{name:'Text settings',extensions:['ini','cfg','json','xml','txt']}]});if(choice.canceled)return {canceled:true};
   const file=choice.filePaths[0],stat=await fs.stat(file);if(stat.size>5000000)throw Error('Settings file exceeds 5 MB.');const bytes=await fs.readFile(file),id=crypto.randomUUID();
   await fs.writeFile(path.join(root,id+'.data'),bytes);await fs.writeFile(path.join(root,id+'.json'),JSON.stringify({id,file,game,size:bytes.length,date:new Date().toISOString()}));return {id,name:path.basename(file),size:bytes.length};
  }
  if(action==='settings-export-all'){const entries=[];for(const name of await fs.readdir(root)){if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;const meta=JSON.parse(await fs.readFile(path.join(root,name),'utf8'));const bytes=await fs.readFile(path.join(root,meta.id+'.data'));entries.push({id:meta.id,name:meta.name||path.basename(meta.file),game:meta.game,date:meta.date,data:bytes.toString('base64')});}return entries;}
  if(action==='settings-import-all'){
   if(!Array.isArray(input.entries)||input.entries.length>100)throw Error('Invalid settings backup collection.');
   const validated=input.entries.map(m=>{if(!/^[a-f0-9-]{36}$/.test(m.id)||!GAMES.includes(m.game)||typeof m.data!=='string'||m.data.length>7000000)throw Error('Invalid settings backup entry.');return {...m,name:path.basename(String(m.name||'settings.txt')),bytes:Buffer.from(m.data,'base64')};});
   for(const m of validated){const exists=await fs.stat(path.join(root,m.id+'.data')).then(()=>true,()=>false);if(exists)continue;await fs.writeFile(path.join(root,m.id+'.data'),m.bytes);await fs.writeFile(path.join(root,m.id+'.json'),JSON.stringify({id:m.id,name:m.name,game:m.game,date:m.date,file:null,size:m.bytes.length}));}return {imported:validated.length};
  }
  if(action==='settings-restore'){
   if(!/^[a-f0-9-]{36}$/.test(input.id))throw Error('Invalid backup.');const meta=JSON.parse(await fs.readFile(path.join(root,input.id+'.json'),'utf8'));
   if(!meta.file){const target=await dialog.showSaveDialog(window,{title:'Choose where to restore this settings file',defaultPath:path.join(app.getPath('documents'),meta.name||'settings.txt'),filters:[{name:'Game settings',extensions:['ini','cfg','json','xml','txt']}]});if(target.canceled)return {canceled:true};meta.file=target.filePath;await fs.writeFile(path.join(root,input.id+'.json'),JSON.stringify(meta));}
   const choice=await dialog.showMessageBox(window,{type:'question',buttons:['Cancel','Restore settings'],defaultId:0,cancelId:0,message:'Restore '+path.basename(meta.file)+'?',detail:'Close the game first. Your current file will be saved beside this backup so you can undo the restore.'});if(choice.response!==1)return {canceled:true};
   const current=await fs.readFile(meta.file).catch(err=>{if(err.code==='ENOENT')return null;throw err;});if(current)await fs.writeFile(path.join(root,input.id+'.before-restore'),current);await fs.writeFile(meta.file,await fs.readFile(path.join(root,input.id+'.data')));meta.beforeRestoreExists=current!==null;await fs.writeFile(path.join(root,input.id+'.json'),JSON.stringify(meta));return {restored:true};
  }
  if(action==='settings-undo'){if(!/^[a-f0-9-]{36}$/.test(input.id))throw Error('Invalid backup.');const meta=JSON.parse(await fs.readFile(path.join(root,input.id+'.json'),'utf8'));if(meta.beforeRestoreExists===false)throw Error('This restore created a new file; there are no earlier contents to restore.');const choice=await dialog.showMessageBox(window,{buttons:['Cancel','Undo restore'],defaultId:0,cancelId:0,message:'Restore the settings from before your last restore?'});if(choice.response!==1)return {canceled:true};await fs.writeFile(meta.file,await fs.readFile(path.join(root,input.id+'.before-restore')));return {restored:true};}
  if(action==='room-start')return room.start(input.snapshot);
  if(action==='room-stop')return room.stop();
  if(action==='room-update')return room.update(input.snapshot);
  if(action==='room-update-cards')return room.update({...room.read().snapshot,cards:input.cards});
  if(action==='room-read')return room.read();
  if(action==='room-status')return room.status();
  throw Error('Unknown command.');
 }
 return {command,stop:()=>room.stop(),microphoneAllowed:()=>Date.now()<micUntil};
}
module.exports={createCommandService};
