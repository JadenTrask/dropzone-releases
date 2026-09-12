const URL='https://dropzone-app.truck0331.chatgpt.site/api/squad';
async function squadRequest(input){
 if(!input||!['create','get','put','remove','close'].includes(input.action))throw Error('Unsupported squad action.');
 const body=JSON.stringify(input);if(body.length>16000)throw Error('Squad request too large.');
 const response=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(12000),redirect:'error'});
 if(Number(response.headers.get('content-length'))>64000)throw Error('Unexpected squad response.');
 const text=await response.text();if(text.length>64000)throw Error('Unexpected squad response.');
 let data;try{data=JSON.parse(text);}catch{throw Error('Squad service did not respond. Retry shortly.');}
 if(!response.ok||data.error)return {error:data.error||'Squad service is unavailable.',status:response.status};
 return data;
}
module.exports={squadRequest};
