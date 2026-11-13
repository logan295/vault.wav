/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const handlers=new Map(),listeners=new Map();
const ipc={handle:(name,fn)=>handlers.set(name,fn),on:(name,fn)=>listeners.set(name,fn)};
const stop=require('../desktop/audio-bridge.cjs')(ipc,process.cwd(),'http://127.0.0.1:3147');
const sender={id:17,once(){}};
const trusted={sender,senderFrame:{url:'http://127.0.0.1:3147/perform'}};
(async()=>{
 assert.throws(()=>handlers.get('womp:audio:list')({...trusted,senderFrame:{url:'https://example.com/perform'}}),/limited to Perform/);
 const devices=await handlers.get('womp:audio:list')(trusted);assert.ok(Array.isArray(devices));
 await assert.rejects(handlers.get('womp:audio:start')(trusted,{uid:'bogus',master:0,cue:2,rate:NaN}),/Invalid/);
 const stereo=devices.find(d=>d.channels===2);
 if(stereo)await assert.rejects(handlers.get('womp:audio:start')(trusted,{uid:stereo.uid,master:0,cue:2,rate:48000}));
 const state=await handlers.get('womp:audio:status')(trusted);assert.equal(state.active,false);
 listeners.get('womp:audio:pcm')({...trusted,sender:{id:999}},new Uint8Array(8192));stop();
 console.log('PASS: native device enumeration, renderer origin restriction, invalid route rejection and inactive PCM isolation.');
})().catch(e=>{stop();console.error(e);process.exitCode=1;});
