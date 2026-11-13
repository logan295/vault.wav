import dgram from 'node:dgram';
import http from 'node:http';
import { networkInterfaces } from 'node:os';
import { decodePacket,optIn,requestData } from './lib/tcnet.mjs';
const localAddresses=new Set(['127.0.0.1',...Object.values(networkInterfaces()).flat().filter(Boolean).map(n=>n.address)]);
const decks=Array.from({length:8},(_,i)=>({number:i+1,time:0,duration:0,state:0,playing:false,rate:1,bpm:0,beat:0,trackId:0,title:'',artist:'',master:false,onAir:null,beatAnchorTime:null,beatAnchor:null,receivedAt:0}));
const clients=new Set(),sockets=[],publishers=new Map(),errors=[];
let lastPacketAt=0,packets=0;
const state=()=>({version:1,protocol:'TCNet',receivedAt:lastPacketAt,packets,errors,decks,generatedAt:Date.now()});
function update(data){const deck=decks[data.number-1];if(data.trackId!==undefined && deck.trackId!==data.trackId){deck.title='';deck.artist='';deck.beatAnchorTime=null;deck.beatAnchor=null;}if(data.beat>=1&&data.beat<=4&&data.beat!==deck.beat&&typeof data.time==='number'&&[3,4].includes(data.state??deck.state)){deck.beatAnchorTime=data.time;deck.beatAnchor=data.beat;}Object.assign(deck,data);deck.playing=[3,4].includes(deck.state);if('time'in data)deck.receivedAt=Date.now();}
let listener;
function receive(buffer,remote){
 if(!localAddresses.has(remote.address))return;
 const data=decodePacket(buffer);if(!data || data.nodeId===0x7657)return;
 packets++;lastPacketAt=Date.now();
 if(data.port){publishers.set(remote.address,{port:data.port,seen:Date.now()});}
 if(data.ids)data.ids.forEach((trackId,i)=>{if(trackId!==decks[i].trackId)update({number:i+1,trackId});});
 data.decks?.forEach(update);
 if(data.metrics)update(data.metrics);
 if(data.metadata){const deck=decks[data.metadata.number-1];if(!deck.trackId || deck.trackId===data.metadata.trackId)Object.assign(deck,data.metadata);}
}
function socket(port){const s=dgram.createSocket({type:'udp4',reuseAddr:true});sockets.push(s);s.on('message',receive);s.on('error',error=>{const message=`UDP ${port}: ${error.code??error.message}`;if(!errors.includes(message))errors.push(message);console.error(message);});s.bind(port,'0.0.0.0',()=>{if(port===65024)listener=s;});return s;}
socket(60000);socket(60001);socket(65024);
const discovery=setInterval(()=>{
 if(!listener)return;
 for(const [ip,publisher]of publishers){if(Date.now()-publisher.seen>10000){publishers.delete(ip);continue;}listener.send(optIn(),publisher.port,ip);for(let layer=1;layer<=4;layer++){listener.send(requestData(2,layer),publisher.port,ip);if(!decks[layer-1].title)listener.send(requestData(4,layer),publisher.port,ip);}}
 // Localhost publishers can discover us even before their first broadcast.
 listener.send(optIn(),60000,'127.0.0.1');
},1000);
const publish=setInterval(()=>{const payload=`data: ${JSON.stringify(state())}\n\n`;for(const client of clients)if(!client.write(payload)){clients.delete(client);client.end();}},50);
const server=http.createServer((request,response)=>{
 const hostname=(request.headers.host??'').split(':')[0];
 if(!['127.0.0.1','localhost'].includes(hostname)){response.writeHead(403).end();return;}
 if(request.method!=='GET'){response.writeHead(405).end();return;}
 if(request.url==='/events'){response.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});response.write(`data: ${JSON.stringify(state())}\n\n`);clients.add(response);request.on('close',()=>clients.delete(response));}
 else if(request.url==='/state'){response.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(state()));}
 else response.writeHead(404).end();
});
server.on('error',error=>{console.error(`Live bridge: ${error.message}`);process.exit(1);});
server.listen(3148,'127.0.0.1',()=>console.log('vault.wav live receiver: 127.0.0.1:3148 • TCNet UDP 60000/60001/65024'));
function stop(){clearInterval(discovery);clearInterval(publish);for(const client of clients)client.end();for(const s of sockets)s.close();server.close(()=>process.exit(0));}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
