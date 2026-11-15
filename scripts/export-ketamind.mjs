import {mkdir,writeFile} from 'node:fs/promises';
import {KETAMIND_VISUALS as ALL_VISUALS} from '../src/lib/visuals/ketamind.ts';
import {KETAMIND_FRAGMENT} from '../src/lib/visuals/ketamind-shader.ts';
const more=process.argv.includes('--more');
const KETAMIND_VISUALS=more?ALL_VISUALS.slice(15):ALL_VISUALS.slice(0,15);
const dir=more?'public/ketamind-2':'public/ketamind';await mkdir(dir,{recursive:true});
await writeFile(`${dir}/beat-pairings.json`,JSON.stringify(KETAMIND_VISUALS,null,2)+'\n');
await writeFile(`${dir}/beat-pairings.csv`,'Visual,Beat pairing\n'+KETAMIND_VISUALS.map(v=>[v.label,v.pairing].map(x=>'"'+x.replaceAll('"','""')+'"').join(',')).join('\n')+'\n');
const motifs=[
 '<path d="M70 155Q85 20 100 155M125 150Q140 0 155 150M180 155Q195 20 210 155M235 150Q250 0 265 150"/>',
 '<ellipse cx="160" cy="90" rx="112" ry="60"/><path d="M65 60l15 45 15-45 15 45 15-45 15 45 15-45 15 45 15-45 15 45 15-45 15 45 15-45"/>',
 '<path d="M160 90Q15 0 40 90T160 90Q230 0 280 40T160 90Q320 150 240 160T160 90Q30 180 20 130T160 90"/>',
 '<path d="M-20 90Q35 0 90 90T200 90T310 90" stroke-width="30"/><path d="M-20 90Q35 0 90 90T200 90T310 90" stroke="#080a0b" stroke-width="12"/>',
 '<circle cx="160" cy="90" r="74"/><path d="M90 110a43 32 0 1 0 86-15a25 25 0 1 0-27-24l-5 16z" fill="currentColor"/><path d="M185 72h25"/><circle cx="172" cy="62" r="3" fill="#000"/>',
 '<path d="M55 105q25-80 50 0zM130 90q30-90 60 0zM215 110q25-70 50 0zM80 105v40M160 90v60M240 110v30"/>',
 '<path d="M30 110Q160-30 290 110" stroke-width="26"/><path d="M40 90v65M70 65v65M100 48v65M130 39v65M160 35v65M190 39v65M220 48v65M250 65v65M280 90v65"/>',
 '<path d="M0 45Q70 110 140 45T320 45M0 90Q70 155 140 90T320 90M0 135Q70 200 140 135T320 135M40 0Q100 90 40 180M100 0Q160 90 100 180M160 0Q220 90 160 180M220 0Q280 90 220 180"/>',
 '<path d="M0 0h320v35l-30 50-30-50-30 50-30-50-30 50-30-50-30 50-30-50-30 50-30-50zM0 180h320v-35l-30-50-30 50-30-50-30 50-30-50-30 50-30-50-30 50-30-50-30 50z"/>',
 '<path d="M40 40l30-17 30 17v34l-30 17-30-17zM100 74l30-17 30 17v34l-30 17-30-17zM160 40l30-17 30 17v34l-30 17-30-17zM220 74l30-17 30 17v34l-30 17-30-17zM40 108l30-17 30 17v34l-30 17-30-17zM160 108l30-17 30 17v34l-30 17-30-17z"/>',
 '<path d="M100 35h120v110H100zM115 65h25v20h-25zM180 65h25v20h-25zM125 115h70"/><path d="M65 75h20M235 40h30M50 130h40M230 115h45"/>',
 '<path d="M215 133Q240 110 220 67Q185 12 130 35Q65 50 90 120Q120 155 150 135Q170 122 200 155"/><path d="M160 90V50M160 90l35 15"/>',
 '<ellipse cx="80" cy="65" rx="40" ry="24"/><ellipse cx="240" cy="65" rx="40" ry="24"/><ellipse cx="160" cy="130" rx="40" ry="24"/><circle cx="80" cy="65" r="12"/><circle cx="240" cy="65" r="12"/><circle cx="160" cy="130" r="12"/>',
 '<path d="M55 75q35-90 70 0zM195 75q35-90 70 0zM65 75q-20 35 0 80M85 75q20 35 0 80M105 75q-10 35 0 80M205 75q20 35 0 80M225 75q-20 35 0 80M245 75q10 35 0 80"/>',
 '<ellipse cx="160" cy="90" rx="120" ry="35" transform="rotate(-20 160 90)"/><ellipse cx="160" cy="90" rx="95" ry="50" transform="rotate(-20 160 90)"/><circle cx="160" cy="90" r="35" fill="#030408"/>',
];
for(const v of KETAMIND_VISUALS){if(v.index>=motifs.length)continue;await writeFile(`${dir}/${v.id}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#05070b"/><g fill="none" stroke="${v.color}" color="${v.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${motifs[v.index]}</g></svg>`);}
const vertex='attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
// Portable, offline audition: no CDN, dependencies, microphone, network or stock media.
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${more?"Wonky 10 · No logo":"Ketamind · Wonky 15"}</title><style>body{margin:0;background:#08090a;color:#f1f1df;font:16px Arial}header,footer{padding:20px}h1{font-size:40px;margin:0 0 16px}canvas{width:100%;aspect-ratio:16/9;display:block;background:#000}select,input,button{font:inherit;background:#242b1b;color:#edffd4;padding:8px;border:1px solid #758653}p{max-width:800px;line-height:1.5}#status{color:#baff28}body.clean header,body.clean footer{display:none}body.clean canvas{width:100vw;height:100vh;object-fit:contain}</style><body class="${more?'clean':''}"><header><h1>${more?"Wonky 10":"Ketamind. Get weird."}</h1><select id="visual" aria-label="Visual"></select> <label>BPM <input id="bpm" type="number" min="60" max="200" value="140" style="width:60px"></label> <button id="toggle">Pause</button> <button id="reset">Reset beat</button> <button id="clean">Hide controls (H)</button><p id="pairing"></p></header><canvas width="1280" height="720" aria-label="Ketamind visual"></canvas><footer><span id="status"></span><p>Preview beat only, no audio. A drop accent is previewed at beat 32. In vault.wav these shaders follow the song transport, beat grid, onsets and detected drops. Space pauses. Left/right switches visuals.</p></footer><script>
const visuals=${JSON.stringify(KETAMIND_VISUALS)},fragment=${JSON.stringify(KETAMIND_FRAGMENT)},vertex=${JSON.stringify(vertex)};
const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl)throw Error('WebGL is unavailable');
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
const select=document.querySelector('#visual'),bpm=document.querySelector('#bpm'),pairing=document.querySelector('#pairing'),status=document.querySelector('#status');for(const [position,v] of visuals.entries()){const o=document.createElement('option');o.value=position;o.textContent=v.label;select.append(o);}select.onchange=()=>pairing.textContent=visuals[Number(select.value)].pairing;const requested=new URLSearchParams(location.search).get('visual');const chosen=visuals.find(v=>v.id===requested);if(chosen)select.value=visuals.indexOf(chosen);select.onchange();
let beat=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,last=performance.now();const toggle=document.querySelector('#toggle');function flip(){playing=!playing;toggle.textContent=playing?'Pause':'Play';}toggle.textContent=playing?'Pause':'Play';toggle.onclick=flip;document.querySelector('#reset').onclick=()=>beat=0;
const clean=()=>document.body.classList.toggle('clean');document.querySelector('#clean').onclick=clean;
document.onkeydown=e=>{if(e.code==='KeyH'){clean();return;}if(e.target.matches('input,select'))return;if(e.code==='Space'){e.preventDefault();flip();}if(e.code==='ArrowRight'||e.code==='ArrowLeft'){select.value=(Number(select.value)+(e.code==='ArrowRight'?1:visuals.length-1))%visuals.length;select.onchange();}};
const phase=x=>x-Math.floor(x),uniforms={};for(const name of ['Beat','Motion','Kick','Snare','Triplet','Hat','Drop','Attack','Index','Aspect','Diamond','Fit','Power'])uniforms[name]=gl.getUniformLocation(program,'u'+name);
function draw(now){if(playing)beat+=Math.min(.1,(now-last)/1000)*Math.max(60,Math.min(200,Number(bpm.value)||140))/60;last=now;const values={Beat:beat,Motion:beat,Kick:Math.exp(-phase(beat)*10),Snare:Math.exp(-phase((beat-2)/4)*32),Triplet:Math.exp(-phase(beat*3)*8),Hat:Math.exp(-phase(beat*4)*12),Drop:beat>=32&&beat<34?Math.exp(-(beat-32)*2):0,Attack:0,Index:visuals[Number(select.value)].index,Aspect:16/9,Diamond:0,Fit:0,Power:1};for(const [key,value]of Object.entries(values))gl.uniform1f(uniforms[key],value);gl.viewport(0,0,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);status.textContent='Beat '+beat.toFixed(2)+' · '+visuals[Number(select.value)].label;requestAnimationFrame(draw);}requestAnimationFrame(draw);
</script></html>`;
await writeFile(`${dir}/${more?'wonky-10.html':'ketamind-wonky-15.html'}`,html);
console.log(`Exported ${KETAMIND_VISUALS.length} visuals with offline player and rhythm pairings. Logo-free canvas; ${more?'clean mode by default':'controls visible by default'}.`);
