// Wire offsets cross-checked against TCNetOutput.h (MIT),
// https://github.com/fiverecords/SuperTimecodeConverter/blob/main/TCNetOutput.h
export function decodePacket(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length<24 || buffer.toString('ascii',4,7)!=='TCN') return null;
  const type=buffer[7],nodeId=buffer.readUInt16LE(0);
  const header={type,nodeId,name:buffer.toString('utf8',8,16).replace(/\0.*$/s,'')};
  if ((type===2 || type===5) && buffer.length>=28) {
    const result={...header,port:buffer.readUInt16LE(26)};
    if(type===5 && buffer.length>=300) result.ids=Array.from({length:8},(_,i)=>buffer.readUInt32LE(50+i*4));
    return result;
  }
  if(type===254 && buffer.length>=154) return {...header,decks:Array.from({length:8},(_,i)=>({
    number:i+1,time:buffer.readUInt32LE(24+i*4)/1000,duration:buffer.readUInt32LE(56+i*4)/1000,
    beat:buffer[88+i],state:buffer[96+i],onAir:buffer.length>=162 ? buffer[154+i] : null,
  }))};
  if(type===200 && buffer.length>=26) {
    const number=buffer[25]; if(number<1 || number>8)return null;
    if(buffer[24]===2 && buffer.length>=122)return {...header,metrics:{number,state:buffer[27],master:buffer[29]>0,beat:buffer[31],duration:buffer.readUInt32LE(32)/1000,time:buffer.readUInt32LE(36)/1000,rate:buffer.readUInt32LE(40)/1048576,bpm:buffer.readUInt32LE(112)/100,trackId:buffer.readUInt32LE(118)}};
    if(buffer[24]===4 && buffer.length>=548) {
      const readText=(offset)=>{let result='';for(let i=0;i<64;i++){const cp=buffer.readUInt32LE(offset+i*4);if(!cp)break;if(cp>0x10ffff || (cp>=0xd800&&cp<=0xdfff))return '';result+=String.fromCodePoint(cp);}return result.trim();};
      return {...header,metadata:{number,artist:readText(29),title:readText(285),trackId:buffer.readUInt32LE(543)}};
    }
  }
  return null;
}
export function header(type,size,nodeId=0x7657) {
  const b=Buffer.alloc(size);b.writeUInt16LE(nodeId,0);b[2]=3;b[3]=5;b.write('TCN',4);b[7]=type;b.write('VAULT',8);b[17]=4;b.writeUInt32LE((Date.now()%1000)*1000,20);return b;
}
export function optIn(port=65024) {const b=header(2,68);b.writeUInt16LE(1,24);b.writeUInt16LE(port,26);b.write('vault.wav',32);b.write('Live receiver',48);b[64]=1;return b;}
export function requestData(dataType,layer) {const b=header(20,28);b[24]=dataType;b[25]=layer;return b;}
export function selectDeck(decks,mode='auto',previous=null) {
  const available=decks.filter(d=>d.trackId || d.title || d.duration>0);
  if(mode!=='auto')return available.find(d=>d.number===Number(mode))??null;
  return available.find(d=>d.master) ?? available.filter(d=>d.playing && d.onAir>0).sort((a,b)=>b.onAir-a.onAir)[0]
    ?? available.find(d=>d.number===previous && d.playing) ?? available.find(d=>d.playing) ?? available.find(d=>d.number===previous) ?? available[0] ?? null;
}
