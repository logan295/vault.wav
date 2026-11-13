import type { PerformEngine } from './engine';
// Pioneer DJ DDJ-FLX10 MIDI Message List E1, pp. 1–4. Channels here are zero based.
export class Flx10Mapping {
 private msb = new Map<number,number>();
 private held = new Set<number>();
 private engine:PerformEngine;
 private browser:(delta:number,deck?:number)=>void;
 private select:(deck:number)=>void;
 constructor(engine:PerformEngine,browser:(delta:number,deck?:number)=>void,select:(deck:number)=>void){this.engine=engine;this.browser=browser;this.select=select;}
 release(){this.held.clear();this.msb.clear();this.engine.releaseCues();}
 receive(data:Uint8Array){
  if(data.length!==3)return;
  const [status,key,value]=data,kind=status&0xf0,ch=status&15,e=this.engine;
  if(kind===0xb0){
   if(ch===6&&(key===0x40||key===0x64)){this.browser(value<64?value:value-128);return;}
   if(ch<4&&[0x21,0x22,0x23,0x26,0x29,0x1f].includes(key)){
    const delta=value-64;if(delta) e.jog(ch,delta*(key===0x29||key===0x1f?0.2:0.008));return;
   }
   const base=key>=32?key-32:key;
   const allowed=ch<4?[0,4,7,11,15,19]:ch===6?[8,12,13,23,24,25,26,31]:[];
   if(!allowed.includes(base))return;
   const id=ch*128+base;
   if(key<32){this.msb.set(id,value);return;}
   const high=this.msb.get(id);if(high===undefined)return;
   const v=((high<<7)|value)/16383;
   // Bipolar pots must have exact unity at the physical centre (0x2000).
   const bipolar=Math.abs(v-.5)<.0001?0:v*2-1;
   if(ch<4){
    if(base===0)e.set(ch,{sync:false,pitch:bipolar*16});
    if(base===19)e.set(ch,{level:v});
    if(base===4)e.set(ch,{trim:bipolar*(bipolar<0?12:6)});
    const band=base===7?'high':base===11?'mid':base===15?'low':null;
    if(band)e.set(ch,{[band]:bipolar*(bipolar<0?24:6)});
   }else{
    if(base===31){e.hardwareCrossfader=true;e.setCrossfader(bipolar);}
    if(base===8)e.setMaster(v);
    if(base===12)e.setHeadphones({mix:v});
    if(base===13)e.setHeadphones({level:v});
    if(base>=23&&base<=26)e.set(base-23,{filter:bipolar});
   }
   return;
  }
  if(kind!==0x90&&kind!==0x80)return;
  const down=kind===0x90&&value>0,id=ch*128+key;
  if(!down){this.held.delete(id);if(ch<4&&key===12)e.cueUp(ch);return;}
  if(this.held.has(id))return;this.held.add(id);
  if(ch===6){
   if(key>=0x46&&key<=0x49){this.select(key-0x46);this.browser(0,key-0x46);return;}
   if(key===0x63)e.setHeadphones({masterCue:!e.masterCue});
   return;
  }
  if(ch>=7&&ch<=14&&key<8){const deck=Math.floor((ch-7)/2);this.select(deck);e.hotCue(deck,key,ch%2===0);return;}
  if(ch>3)return;
  // Mixer movement on decks 3/4 should not force the deck display to change.
  if([11,12,0x3c].includes(key))this.select(ch);
  if(key===11)e.toggle(ch);
  if(key===12)e.cueDown(ch);
  if(key===0x48)e.setCue(ch);
  if(key===0x54)e.set(ch,{headphoneCue:!e.decks[ch].settings.headphoneCue});
  if(key===0x58)e.beatSync(ch);
  if(key===0x78)e.set(ch,{sync:false});
  if(key===0x5c)e.setOwner(ch);
  if(key===0x41)e.set(ch,{sync:false,pitch:0});
  if(key===0x65)e.keySync(ch);
  if(key===0x1a)e.set(ch,{keyLock:!e.decks[ch].settings.keyLock});
  if(key===0x64)e.set(ch,{keyShift:0});
  if(key===0x10)e.loopIn(ch);
  if(key===0x11)e.loopOut(ch);
  if(key===0x14)e.set(ch,{loop:!e.decks[ch].settings.loop,loopBars:1});
  if(key===0x4c)e.set(ch,{loopBars:Math.max(.25,e.decks[ch].settings.loopBars/2),loopEnd:null});
  if(key===0x4d)e.set(ch,{loopBars:Math.min(64,e.decks[ch].settings.loopBars*2),loopEnd:null});
  if(key===0x35)e.setQuantum(e.quantum?0:1);
  if([0x5e,0x5f,0x61,0x62].includes(key))e.jog(ch,(key===0x5e?-4:key===0x5f?4:key===0x61?-16:16)*60/(e.decks[ch].track?.bpm||e.clock.bpm));
  if([0x16,0x18,0x1d].includes(key)){e.hardwareCrossfader=true;e.set(ch,{crossfade:key===0x16?'A':key===0x18?'B':'thru'});}
 }
 leds():number[][]{
  return this.engine.decks.flatMap((d,i)=>[
   [0x90+i,11,d.playing?127:0],[0x90+i,12,d.buffer&&!d.playing?127:0],
   [0x90+i,0x54,d.settings.headphoneCue?127:0],[0x90+i,0x58,d.settings.sync?127:0],
   [0x90+i,0x14,d.settings.loop?127:0],
   ...d.hotCues.map((cue,slot)=>[0x97+i*2,slot,cue===null?0:0x15])
  ]);
 }
}
