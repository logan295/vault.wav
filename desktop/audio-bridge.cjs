/* eslint-disable @typescript-eslint/no-require-imports */
const {spawn,execFile}=require('node:child_process');
const {join}=require('node:path');
module.exports=function registerAudio(ipcMain,root,origin){
 const binary=join(root,'desktop/audio/womp-audio');
 let child=null,owner=null,status={active:false},pending='',timer;
 function stop(){clearTimeout(timer);const current=child;child=null;owner=null;status={active:false};current?.kill('SIGTERM');}
 function authorized(event){if(event.senderFrame?.url!==origin+'/perform')throw Error('Audio access is limited to Perform.');}
 ipcMain.handle('womp:audio:list',event=>{authorized(event);return new Promise((resolve,reject)=>execFile(binary,['--list'],{timeout:5000,maxBuffer:65536},(error,out)=>{if(error)reject(error);else{try{resolve(JSON.parse(out).devices)}catch(e){reject(e)}}}));});
 ipcMain.handle('womp:audio:start',async(event,config)=>{
  authorized(event);stop();
  if(typeof config?.uid!=='string'||config.uid.length>512||![config.master,config.cue].every(n=>Number.isInteger(n)&&n>=0&&n<64)||!Number.isFinite(config.rate)||config.rate<32000||config.rate>96000)throw Error('Invalid audio routing.');
  owner=event.sender.id;pending='';
  return new Promise((resolve,reject)=>{
   let settled=false;
   const fail=error=>{if(!settled){settled=true;reject(Error(String(error)));}if(child===proc){stop();status={active:false,error:String(error)};}};
   event.sender.once('destroyed',()=>{if(owner===event.sender.id)stop();});
   const proc=spawn(binary,[config.uid,String(config.master),String(config.cue),String(config.rate)],{stdio:['pipe','pipe','pipe']});child=proc;
   timer=setTimeout(()=>fail('Audio device did not become ready.'),8000);
   proc.stdout.on('data',data=>{pending+=data.toString();let split;while((split=pending.indexOf('\n'))>=0){const line=pending.slice(0,split);pending=pending.slice(split+1);try{const value=JSON.parse(line);if(value.error){fail(value.error);return;}status={...status,...value,active:true};if(value.ready&&!settled){settled=true;clearTimeout(timer);resolve(status);}}catch{fail('Invalid audio helper response.');}}});
   proc.stderr.on('data',data=>{status.detail=String(data).slice(-1000);});
   proc.on('error',fail);proc.stdin.on('error',fail);proc.on('exit',()=>fail('Audio output stopped. Reconnect the device and enable routing.'));
  });
 });
 ipcMain.on('womp:audio:pcm',(event,bytes)=>{
  if(event.sender.id!==owner||!child||!(bytes instanceof Uint8Array)||bytes.byteLength!==8192)return;
  if(child.stdin.writableLength>32768){status={...status,droppedPackets:(status.droppedPackets||0)+1};return;}
  child.stdin.write(Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength));
 });
 ipcMain.handle('womp:audio:status',event=>{authorized(event);return status;});
 ipcMain.handle('womp:audio:stop',event=>{authorized(event);if(owner===event.sender.id)stop();});
 return stop;
};
