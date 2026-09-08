// Release destinations are publisher configuration, never renderer input.
function validateFeed(value){
  if(value==null)return null;
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid release destination.');
  if(value.provider==='github'){
    if(typeof value.owner!=='string'||!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(value.owner)||typeof value.repo!=='string'||!/^[a-zA-Z0-9_.-]{1,100}$/.test(value.repo)||['.','..'].includes(value.repo))throw new Error('Enter a valid GitHub owner and repository.');
    return {provider:'github',owner:value.owner,repo:value.repo,private:false,channel:'latest',releaseType:'release'};
  }
  if(value.provider==='generic'){
    let u;try{u=new URL(value.url);}catch{throw new Error('Enter a valid HTTPS release URL.');}
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw new Error('The release URL must use HTTPS with no credentials, query, or fragment.');
    u.pathname=u.pathname.replace(/\/?$/,'/');return {provider:'generic',url:u.href,channel:'latest'};
  }
  throw new Error('Use GitHub Releases or an HTTPS release directory.');
}
module.exports={validateFeed};
