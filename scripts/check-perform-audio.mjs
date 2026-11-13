import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
let Processor;
const sandbox={sampleRate:48000,console,Float32Array,Float64Array,Math,performance,AudioWorkletProcessor:class{port={postMessage(){},onmessage:null};},registerProcessor(name,type){Processor=type;}};
vm.runInNewContext(await readFile('public/audio/soundtouch-processor.js','utf8'),sandbox);
function render(rate,semitones){const processor=new Processor({processorOptions:{}}),output=[];for(let block=0;block<1200;block++){const input=new Float32Array(128);for(let i=0;i<128;i++)input[i]=.3*Math.sin(2*Math.PI*440*rate*(block*128+i)/48000);const left=new Float32Array(128),right=new Float32Array(128);processor.process([[input,input]],[[left,right]],{pitch:new Float32Array([1]),pitchSemitones:new Float32Array([semitones]),playbackRate:new Float32Array([rate])});if(block>400)output.push(...left);}let crossings=0;for(let i=1;i<output.length;i++)if(output[i-1]<=0&&output[i]>0)crossings++;assert.ok(output.every(Number.isFinite));assert.ok(output.some(v=>Math.abs(v)>.01),'Processor emits audible samples');return crossings/output.length*48000;}
const preserved=render(1.25,0),shifted=render(1.25,2);assert.ok(Math.abs(preserved-440)<4,`Key lock: ${preserved}Hz`);assert.ok(Math.abs(shifted-440*Math.pow(2,2/12))<5,`Key shift: ${shifted}Hz`);console.log(`PASS: bundled DSP key lock ${preserved.toFixed(2)}Hz at +25% tempo; independent +2 semitone pitch ${shifted.toFixed(2)}Hz; finite audible output.`);
