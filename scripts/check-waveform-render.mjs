import assert from 'node:assert/strict';
const {drawWaveform,waveformBucket,waveformColor}=await import('../src/lib/perform/draw-waveform.ts');
const raster=[];let reads=0;
globalThis.document={createElement(kind){assert.equal(kind,'canvas');const columns=[];const context={fillStyle:'',fillRect(...bounds){columns.push([this.fillStyle,...bounds]);}};const image={width:0,height:0,columns,getContext(){return context;}};raster.push(image);return image;}};
const raw=new Float32Array(48000*5);for(let i=0;i<raw.length;i++)raw[i]=Math.sin(i*.017)*(i%3000<100?.9:.2);
const samples=new Proxy(raw,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(target,key,target);}});
const buffer={sampleRate:48000,duration:5,getChannelData(){return samples;}};
const bands={full:Array(500).fill(1),low:Array.from({length:500},(_,i)=>i%4===0?1:.1),mid:Array(500).fill(.5),high:Array(500).fill(.3)};
const draws=[];const context={clearRect(){},drawImage(...v){draws.push(v);}};
drawWaveform(context,buffer,bands,1,2,'#fff',1000,80,2);
const initialImages=raster.length,initialReads=reads,firstDraws=draws.splice(0);assert.ok(initialReads>0);assert.ok(initialImages>0);
drawWaveform(context,buffer,bands,1.00025,2,'#fff',1000,80,2);
assert.equal(raster.length,initialImages,'scrolling must reuse source-anchored RGB rasters');assert.equal(reads,initialReads,'scrolling must not resample the audio');
assert.equal(draws[0][0],firstDraws[0][0]);assert.ok(Math.abs(draws[0][1]-firstDraws[0][1]+.125)<1e-8,'translation preserves subpixel audio time');
assert.equal(waveformBucket(48000,2,2000),32);assert.equal(waveformColor(1,0,0),'rgb(255,35,40)');
// Scrubbing far away and resizing use bounded tiles without reading outside the file.
for(let i=0;i<100;i++)drawWaveform(context,buffer,bands,(i%40)/10,.2,'#fff',1000,80+i%3,2);
const before=raster.length;drawWaveform(context,buffer,bands,-50,1,'#fff',1000,80,2);assert.equal(raster.length,before);
console.log(`PASS: scrolling reuses ${initialImages} fixed RGB tiles with zero additional PCM reads; fractional translation, sample-aligned LOD, bounds and color checks.`);
