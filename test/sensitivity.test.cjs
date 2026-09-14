const test=require('node:test'),assert=require('node:assert/strict');
const source={game:'cs2',kind:'preset',dpi:800,sens:2};
const target={game:'valorant',kind:'preset',dpi:800};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('known CS2/VALORANT conversion and round trip preserve physical movement',async()=>{
 const {convertSensitivity}=await import('../app/sensitivity-engine.js');
 const r=convertSensitivity(source,target);close(r.sensitivity,0.6285714285714286);close(r.cm360,25.97727272727273);
 close(convertSensitivity({...target,sens:r.sensitivity},source).sensitivity,source.sens);
 close(convertSensitivity(source,{...target,dpi:1600}).sensitivity,r.sensitivity/2);
});
test('measured and custom calibration agree with presets',async()=>{
 const {convertSensitivity}=await import('../app/sensitivity-engine.js');
 const r=convertSensitivity({...source,kind:'measured',cm:25.97727272727273},{...target,kind:'measured',sens:1,cm:16.32857142857143});
 close(r.sensitivity,0.6285714285714286);
 close(convertSensitivity({...source,kind:'custom',yaw:.022},{...target,kind:'custom',yaw:.07}).sensitivity,r.sensitivity);
});
test('invalid, unknown and non-finite inputs never produce a result',async()=>{
 const {convertSensitivity}=await import('../app/sensitivity-engine.js');
 for(const value of ['',0,-1,Infinity,NaN,'bad'])assert.throws(()=>convertSensitivity({...source,dpi:value},target));
 assert.throws(()=>convertSensitivity({...source,game:'wardogs'},target));
 assert.throws(()=>convertSensitivity(source,{...target,kind:'measured',sens:1,cm:0}));
 assert.throws(()=>convertSensitivity(source,{...target,kind:'custom',yaw:null}));
});
test('percentage, offset and cubic profiles use their actual scales',async()=>{
 const {convertSensitivity,rotation,SENS_GAMES}=await import('../app/sensitivity-engine.js');
 const side=(game,sens)=>({game,kind:'preset',sens,dpi:800});
 close(rotation(side('fortnite',7)),.038885);
 close(rotation(side('minecraft',100)),.15);
 close(rotation(side('battlefield-2042-in-game',10)),.04583662362);
 assert.throws(()=>rotation(side('minecraft',250)));
 for(const g of SENS_GAMES.filter(g=>g.yaw)){
   const a=side(g.id,Math.max(g.min||0,10));
   const converted=convertSensitivity(a,{game:'custom',kind:'custom',yaw:.022,dpi:1600});
   close(convertSensitivity({game:'custom',kind:'custom',yaw:.022,dpi:1600,sens:converted.sensitivity},a).sensitivity,a.sens);
 }
});
