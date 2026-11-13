import { spawn } from 'node:child_process';
const args=process.argv.slice(2),mode=args.shift()??'dev';
const bridge=spawn(process.execPath,['scripts/live-sync-bridge.mjs'],{stdio:'inherit'});
const web=spawn(process.execPath,['node_modules/next/dist/bin/next',mode,...args],{stdio:'inherit'});
let closing=false;
function stop(){if(closing)return;closing=true;bridge.kill('SIGTERM');web.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
web.on('exit',code=>{stop();process.exitCode=code??0;});
