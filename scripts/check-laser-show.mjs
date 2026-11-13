import { dropLookAt, dropShutterAt, eyeDropTarget } from '../src/lib/local-audio/drop-choreography.ts';
import { arenaDrops } from '../src/lib/local-audio/arena-drops.ts';
import assert from 'node:assert/strict';
import { laserReleaseAt } from '../src/lib/local-audio/laser-policy.ts';
import { programSong, songCueAt, showMotionAt } from '../src/lib/local-audio/song-show.ts';
const drops=[32,96];
assert.equal(laserReleaseAt('drops',31.999,120,drops,'Build'),0);
assert.equal(laserReleaseAt('drops',32,120,drops,'Drop'),1);
assert.equal(laserReleaseAt('drops',39.9,120,drops),1);
assert.equal(laserReleaseAt('drops',40,120,drops),0);
assert.equal(laserReleaseAt('drops',0,120,[]),0);
assert.equal(laserReleaseAt('drops',34,120,[32],undefined,1),0);
assert.equal(laserReleaseAt('drops',47.9,120,[32],undefined,8),1);
assert.equal(laserReleaseAt('off',32,120,drops,'Drop'),0);
assert.equal(laserReleaseAt('open',0,120,[]),1);
assert.equal(laserReleaseAt('arrangement',0,120,[]),1);
const values=Array.from({length:1280},(_,i)=>i<320?.2:i<400?.95:.4);
const cues=programSong({full:values,low:values,mid:values,high:values},128,120,0,drops,'test');
assert.equal(songCueAt(cues,31.999).section,'Build');
assert.equal(songCueAt(cues,32).section,'Drop');
assert.ok(songCueAt(cues,32).rate>songCueAt(cues,30).rate);
for(let i=1;i<cues.length;i++){
 const prior=cues[i-1],current=cues[i];
 assert.ok(Math.abs(showMotionAt(prior,current.time,120)-showMotionAt(current,current.time,120))<1e-8,'continuous motion across cue boundaries');
}
console.log('Laser release boundaries, seeks, modes, buildup/drop contrast and motion continuity passed.');

assert.equal(dropShutterAt(null,false,1),false);
assert.equal(dropShutterAt(0,false,1),true);
assert.equal(dropShutterAt(.8,false,1),false);
assert.notEqual(dropShutterAt(2.1,false,1),dropShutterAt(2.1,true,1));
assert.equal(dropLookAt(.2,5),31);assert.equal(dropLookAt(2,5),1);assert.equal(dropLookAt(6,5),20);assert.equal(dropLookAt(12,5),32);assert.equal(dropLookAt(20,5),34);
console.log('Drop reveal, negative space, alternating banks and multi-bar pattern progression passed.');

const duration=60, bins=2400;
const sustained=Array.from({length:bins},(_,i)=>i<1280?.1:.8);
const dropTimes=arenaDrops(sustained,sustained,duration,120);
assert.ok(dropTimes.some(at=>Math.abs(at-32)<.11),'sustained bass return lands at the leading edge');
const kicks=Array.from({length:bins},(_,i)=>i%20<4?.8:.12);
assert.equal(arenaDrops(kicks,kicks,duration,120).length,0,'ordinary repeating kicks do not trigger drops');
const oneShot=Array.from({length:bins},(_,i)=>i>=1280&&i<1288?.9:.1);
assert.equal(arenaDrops(oneShot,oneShot,duration,120).length,0,'isolated hits do not trigger drops');
console.log('Sustained drop detection rejects repeating kicks and isolated hits.');

for(const age of [0,.5,1,3,4,7,8,16])for(const side of [-1,1])for(const fan of [-1,0,1]){const target=eyeDropTarget(age,side,0,fan,2);assert.ok(target.every(Number.isFinite));assert.ok(Math.abs(target[0])<=13);assert.ok(target[1]>=2&&target[1]<=9);}
assert.notDeepEqual(eyeDropTarget(2,-1,0,.5,0),eyeDropTarget(2,1,0,.5,0));
console.log("Eye drop targets stay bounded and mirror across the room.");

const {dropPreviewAt}=await import('../src/lib/local-audio/drop-preview.ts');
assert.equal(dropPreviewAt(null,0,120),null);
assert.equal(dropPreviewAt(1000,2999,120).dropBeat,null);
assert.equal(dropPreviewAt(1000,3000,120).dropBeat,0);
assert.equal(dropPreviewAt(1000,11000,120),null);
assert.equal(dropPreviewAt(1000,5000,60).dropBeat,0);
console.log('Silent preview build, drop boundary, tempo and automatic end passed.');
