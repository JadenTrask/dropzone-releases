const {scrypt, timingSafeEqual}=require('node:crypto');
const {promisify}=require('node:util');
const derive=promisify(scrypt);
class AdminAccess{
 constructor(config=require('./admin-password.json')){this.config=config;this.failures=0;this.retryAt=0;this.busy=false;}
 async verify(password){
  if(this.busy||Date.now()<this.retryAt)return {ok:false,message:'Please wait before trying again.'};
  if(typeof password!=='string'||password.length>256)return {ok:false,message:'Incorrect password.'};
  this.busy=true;
  try{const actual=await derive(password,Buffer.from(this.config.salt,'hex'),32,{N:32768,r:8,p:1,maxmem:64*1024*1024});const ok=timingSafeEqual(actual,Buffer.from(this.config.hash,'hex'));
   if(ok){this.failures=0;return {ok:true};}
   if(++this.failures>=5)this.retryAt=Date.now()+30000;
   return {ok:false,message:this.failures>=5?'Too many attempts. Try again in 30 seconds.':'Incorrect password.'};
  }finally{this.busy=false;}
 }
}
module.exports={AdminAccess};
