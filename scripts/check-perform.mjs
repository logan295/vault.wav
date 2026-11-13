import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,next){if(['./clock','./key'].includes(s)&&c.parentURL?.endsWith('/perform/engine.ts'))return next(s+'.ts',c);return next(s,c);}});
const {beatAt,changeTempo,nextBoundary}=await import('../src/lib/perform/clock.ts');
const clock={bpm:120,anchorBeat:0,anchorTime:0,owner:'header',locked:false};
assert.equal(beatAt(clock,3),6);
assert.equal(nextBoundary(clock,.1,1),.5);
assert.equal(nextBoundary(clock,.49,1),1);
const changed=changeTempo(clock,150,3.25);assert.equal(beatAt(changed,3.25),6.5);assert.equal(beatAt(changed,4.25),9);
assert.equal(changeTempo(clock,NaN,2),clock);
class Param{value=0;setValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node{gain=new Param();delayTime=new Param();frequency=new Param();Q=new Param();threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();playbackRate=new Param();connect(n){return n;}disconnect(){}start(time,offset){this.startTime=time;this.startOffset=offset;}stop(){}}
class Context{currentTime=0;destination=new Node();createGain(){return new Node();}createDelay(){return new Node();}createDynamicsCompressor(){return new Node();}createAnalyser(){return new Node();}createBiquadFilter(){return new Node();}createBufferSource(){return new Node();}async resume(){}async close(){}}
globalThis.AudioContext=Context;
const {PerformEngine}=await import('../src/lib/perform/engine.ts');
const e=new PerformEngine(()=>{});e.setTempo(120);
for(const d of e.decks){d.buffer={duration:120};d.track={bpm:120};}
e.context.currentTime=.1;await Promise.all([e.play(0),e.play(1)]);assert.equal(e.decks[0].startedAt,.5);assert.equal(e.decks[1].startedAt,.5);
e.context.currentTime=1;assert.equal(e.position(0),.5);
e.setTempo(150);assert.equal(e.position(0),.5);e.context.currentTime=2;assert.equal(e.position(0),1.75);
e.set(0,{loop:true,loopBars:1,cue:0,loopStart:0});assert.equal(e.decks[0].source.loopEnd,2);
e.set(0,{muted:true});assert.equal(e.channels[0].level.gain.value,0);
e.set(1,{solo:true});assert.equal(e.channels[2].level.gain.value,0);assert.equal(e.channels[1].level.gain.value,.75);
e.setOwner(0);e.setLocked(true);e.setOwner(1);assert.equal(e.clock.owner,'header');
e.setLocked(false);e.setOwner(0);e.setTempo(132);assert.equal(e.decks[0].rate,1.1);assert.ok(Math.abs(e.decks[0].settings.pitch-10)<1e-8);
e.decks[0].settings.cue=4;e.cue(0);assert.equal(e.decks[0].playing,false);assert.equal(e.position(0),4);
e.cueDown(0);e.cueUp(0);await Promise.resolve();assert.equal(e.decks[0].playing,false);assert.equal(e.position(0),4);
e.decks[0].hotCues[0]=null;e.hotCue(0,0);assert.equal(e.decks[0].hotCues[0],4);e.hotCue(0,0);await Promise.resolve();assert.equal(e.decks[0].playing,true);e.hotCue(0,0,true);assert.equal(e.decks[0].hotCues[0],null);
e.set(0,{muted:false,solo:false});e.set(1,{solo:false});e.setDjMode(true);e.setCrossfader(-1);assert.equal(e.channels[0].level.gain.value,.75);assert.equal(e.channels[1].level.gain.value,0);e.setCrossfader(1);assert.ok(e.channels[0].level.gain.value<1e-10);assert.equal(e.channels[1].level.gain.value,.75);
const {keyShift}=await import('../src/lib/perform/key.ts');assert.equal(keyShift('Dm','Em'),2);assert.equal(keyShift('8A','9A'),-5);assert.equal(keyShift('C major','Am'),null);
e.context.state='running';e.setDjMode(false);e.set(0,{muted:false,solo:false});e.setQuantum(8);await e.play(0);const shifter={playbackRate:new Param(),pitch:new Param(),pitchSemitones:new Param(),disconnect(){},port:{close(){}}};e.decks[0].shifter=shifter;e.beginScrub(0);for(let i=0;i<60;i++){e.scrubTo(0,20+i*.1);assert.ok(e.decks[0].startedAt<=e.context.currentTime+.006);assert.equal(e.decks[0].shifter,shifter);}e.endScrub(0);assert.ok(e.decks[0].playing);e.cue(0);assert.equal(e.channels[0].level.gain.value,0);e.beginScrub(0);e.scrubTo(0,9);e.endScrub(0);assert.equal(e.position(0),9);assert.equal(e.decks[0].playing,false);e.decks[0].hotCues=Array(8).fill(null);e.decks[0].hotCues[0]=3;e.phraseCues(0);assert.equal(e.decks[0].hotCues[0],3);assert.ok(e.decks[0].hotCues.every(v=>v!==null&&v<120));
e.set(0,{level:0,muted:true,solo:false,headphoneCue:true});await e.play(0,0,false);e.setDjMode(true);e.setCrossfader(1);assert.equal(e.channels[0].level.gain.value,0);assert.equal(e.channels[0].cue.gain.value,1);e.setHeadphones({mix:0,level:.7});assert.equal(e.cueMix.gain.value,1);assert.equal(e.headphones.gain.value,.7);assert.equal(e.masterToPhones.gain.value,0);e.setHeadphones({mix:1,masterCue:true});assert.equal(e.cueMix.gain.value,0);assert.equal(e.masterToPhones.gain.value,1);e.cue(0);assert.equal(e.channels[0].cue.gain.value,0);
// Beat-aware controls preserve loop length and musical position, including manual loops.
e.stopAll();e.decks[0].track={bpm:120,performance:{firstBeatSecs:.1}};e.decks[0].offset=10.22;e.set(0,{quantize:true,loop:false});
assert.ok(Math.abs(e.snapPosition(0,10.22)-10.1)<1e-8);
e.autoLoop(0,4);assert.ok(Math.abs(e.decks[0].settings.loopStart-10.1)<1e-8);assert.ok(Math.abs(e.decks[0].settings.loopEnd-12.1)<1e-8);
e.resizeLoop(0,.5);assert.ok(Math.abs(e.decks[0].settings.loopEnd-11.1)<1e-8);
e.beatJump(0,8);assert.ok(Math.abs(e.decks[0].settings.loopStart-14.1)<1e-8);assert.ok(Math.abs(e.decks[0].settings.loopEnd-15.1)<1e-8);
e.set(0,{loop:false,quantize:false});e.seek(0,8.23);e.setCue(0);assert.equal(e.decks[0].settings.cue,8.23);
e.beatJump(0,-64);assert.equal(e.position(0),0);
e.autoLoop(0,.25);assert.equal(e.decks[0].settings.loopEnd-e.decks[0].settings.loopStart,.125);
console.log('PASS: quantized cues, fractional auto loops, manual loop resizing and beat-jump loop movement.');
e.stopAll();assert.ok(e.decks.every(d=>!d.playing));e.setMaster(-1);assert.equal(e.master.gain.value,0);await e.close();
console.log('PASS: cue return/preview cancellation, writable hot cues, master-deck BPM, crossfader, key parsing;  clock phase, quantized deck launches, continuous tempo changes, loop duration, mute/solo, owner lock, stop and output limits.');
