'use strict';
class UpdateService{
  constructor(jobs){this.jobs=jobs;this.rows=jobs.map(({id,name,scope,sourceUrl})=>({id,name,scope,sourceUrl,state:'waiting',attemptedAt:null,checkedAt:null,sourceUpdatedAt:null}));this.running=null;this.finishedAt=null;}
  status(){return structuredClone({running:!!this.running,finishedAt:this.finishedAt,rows:this.rows});}
  check(){
    if(this.running)return this.status();
    this.running=Promise.allSettled(this.jobs.map(async(job,i)=>{
      const row=this.rows[i];Object.assign(row,{state:'checking',attemptedAt:new Date().toISOString(),error:null});
      try{
        const d=await job.run();const error=d.error||d.refreshError||d.official?.error;
        Object.assign(row,{state:error?'offline':d.mapsChanged?.length||d.freshness?.level==='warning'?'review':'checked',checkedAt:d.fetchedAt||d.updatedAt||null,sourceUpdatedAt:d.sourceUpdatedAt||null,patch:d.patch||d.version||d.latest?.patch||null,season:d.season||null,releaseDate:d.releaseDate||null,detail:job.detail?.(d)||null,error:error||null});
      }catch(error){Object.assign(row,{state:'offline',error:error.message});}
    })).finally(()=>{this.finishedAt=new Date().toISOString();this.running=null;});
    return this.status();
  }
}
module.exports={UpdateService};
