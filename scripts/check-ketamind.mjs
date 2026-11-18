import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {KETAMIND_VISUALS,ketamindAutoSrc,ketamindIndex,ketamindRhythm} from '../src/lib/visuals/ketamind.ts';
assert.equal(KETAMIND_VISUALS.length,25);
assert.equal(new Set(KETAMIND_VISUALS.map(v=>v.src)).size,25);
for(const visual of KETAMIND_VISUALS){assert.equal(ketamindIndex(visual.src),visual.index);await access(`public${visual.poster}`);assert.ok(visual.pairing.length>30);}
assert.equal(ketamindIndex('/vj-loops/apex.mp4'),-1);
assert.equal(ketamindRhythm(4).kick,1);
assert.ok(ketamindRhythm(4.5).kick<.01);
assert.equal(ketamindRhythm(2).snare,1);
assert.ok(ketamindRhythm(0).snare<.01);
assert.ok(ketamindRhythm(1/3).triplet>.99);
assert.ok(ketamindRhythm(.25).hat>.99);
assert.equal(ketamindRhythm(32,0,0).drop,1);
assert.equal(ketamindRhythm(32).drop,0);
const seek=ketamindRhythm(43.375,.4,.6);assert.deepEqual(ketamindRhythm(43.375,.4,.6),seek,'Pausing at or seeking back to a beat must reproduce its envelopes');
for(const beat of [-10,NaN,Infinity,0,512.23])for(const value of Object.values(ketamindRhythm(beat)))assert.ok(Number.isFinite(value));
const exported=JSON.parse(await readFile('public/ketamind/beat-pairings.json','utf8'));assert.deepEqual(exported,KETAMIND_VISUALS.slice(0,15));
const more=JSON.parse(await readFile('public/ketamind-2/beat-pairings.json','utf8'));assert.deepEqual(more,KETAMIND_VISUALS.slice(15));
assert.equal(KETAMIND_VISUALS.filter(v=>v.group==='Ketamind · Wonky 15').length,15);
assert.equal(more.length,10);
assert.ok(more.every(v=>v.logoFree===true));
const cleanPlayer=await readFile('public/ketamind-2/wonky-10.html','utf8');assert.ok(cleanPlayer.includes('<body class="clean">'),'The new player must open without labels or branding');
console.log('PASS: 25 unique visuals, original 15 preserved plus 10 logo-free scenes, assets/export parity, exact quarter/half-time/triplet/sixteenth accents, drop decay, deterministic pause/seeks and invalid-clock handling.');

assert.equal(new Set(Array.from({length:25},(_,i)=>ketamindAutoSrc(i*32))).size,25);
assert.equal(ketamindAutoSrc(31.999),KETAMIND_VISUALS[0].src);
assert.equal(ketamindAutoSrc(32),KETAMIND_VISUALS[1].src);
assert.equal(ketamindAutoSrc(800),KETAMIND_VISUALS[0].src);
