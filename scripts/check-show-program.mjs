import assert from 'node:assert/strict';
import { programSong, showMotionAt, songCueAt } from '../src/lib/local-audio/song-show.ts';
const duration=64,bpm=120;
const envelope=Array.from({length:640},(_,i)=>i<160?.09:i<240?.2+(i-160)/100:i<400?.95:.25);
const bands={full:envelope,low:envelope.map(x=>x*.9),mid:envelope.map(x=>x*.7),high:envelope.map((x,i)=>x*(i%11/14))};
const cues=programSong(bands,duration,bpm,.13,[24], 'track-a');
assert.deepEqual(cues,programSong(bands,duration,bpm,.13,[24],'track-a'));
assert.notDeepEqual(cues,programSong(bands,duration,bpm,.13,[24],'other-song'));
assert.equal(songCueAt(cues,24).time,24);
assert.equal(songCueAt(cues,24).section,'Drop');
assert.ok(songCueAt(cues,24).rate>songCueAt(cues,22).rate);
assert.ok(cues.some(c=>c.section==='Quiet'&&c.lasers==='none'));
assert.ok(new Set(cues.filter(c=>c.section==='Drop').map(c=>c.rate)).size>2);
for(let i=1;i<cues.length;i++) assert.ok(Math.abs(showMotionAt(cues[i-1],cues[i].time,bpm)-showMotionAt(cues[i],cues[i].time,bpm))<1e-8,'Continuous phase through changes');
for(const time of [45,3,24,15,60,24.5]) {
 const cue=songCueAt(cues,time);
 assert.ok(Number.isFinite(showMotionAt(cue,time,bpm)),'Seeking produces a valid phase');
 assert.equal(showMotionAt(cue,time,bpm),showMotionAt(songCueAt(cues,time),time,bpm),'Phase does not depend on playback history');
}
assert.deepEqual(programSong({full:[],low:[],mid:[],high:[]},duration,bpm,0,[],'empty'),[]);
console.log(`PASS: ${cues.length} song cues; exact drop entry, rests, varied speeds, track identity, continuous phase, arbitrary seeks.`);
