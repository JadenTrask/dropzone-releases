const fs=require('node:fs');
const path=require('node:path');
const {validateFeed}=require('../core/release-config.cjs');
const [provider,a,b]=process.argv.slice(2);
const feed=validateFeed(provider==='github'?{provider,owner:a,repo:b}:provider==='generic'?{provider,url:a}:provider==='off'?null:undefined);
if(!['github','generic','off'].includes(provider))throw new Error('Use: npm run configure:updates -- github OWNER REPO, or generic HTTPS_URL, or off');
fs.writeFileSync(path.join(__dirname,'../release-feed.json'),JSON.stringify({feed},null,2)+'\n');
console.log(feed?'Release destination saved. Build a new installer to apply it.':'App update hosting is not configured.');
