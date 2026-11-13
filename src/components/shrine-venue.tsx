import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ArenaMovingHead, RigRod, type ArenaFrame, type CeilingPattern } from "./circular-arena";

const ROWS = [-5, 5, 15];
const SIDES = [-5.6, 5.6];
export const SHRINE_LASERS: [number,number,number][] = [
  ...ROWS.flatMap((z) => SIDES.flatMap((x): [number,number,number][] => [[x-2,8.12,z],[x+2,8.12,z]])),
  ...[-9,-3,3,9,15,21].flatMap((z): [number,number,number][] => [[-11.5,4.55,z],[11.5,4.55,z]]),
  ...Array.from({length:8},(_,i): [number,number,number] => [(i-3.5)*1.85,1.35,-9.5]),
];

function TrussRun({length}: {length:number}) {
  return <group>
    {[-.2,.2].flatMap(y=>[-.22,.22].map(z=><RigRod key={`${y}:${z}`} from={[-length/2,y,z]} to={[length/2,y,z]} radius={.045} />))}
    <mesh><boxGeometry args={[length,.4,.44,Math.ceil(length/.65),1,1]} /><meshStandardMaterial wireframe color="#60676b" metalness={.7} roughness={.4} /></mesh>
  </group>;
}

function woodTexture() {
  const canvas = document.createElement("canvas"); canvas.width=1024; canvas.height=1024;
  const ctx=canvas.getContext("2d")!;
  let seed=931; const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let plank=0;plank<24;plank++) {
    const x=plank*1024/24; const w=1024/24;
    const tone=83+random()*38; ctx.fillStyle=`rgb(${tone+45},${tone+22},${tone})`;ctx.fillRect(x,0,w,1024);
    for(let grain=0;grain<45;grain++){ctx.strokeStyle=`rgba(45,28,15,${random()*.14})`;ctx.lineWidth=.3+random();ctx.beginPath();const gx=x+random()*w;ctx.moveTo(gx,0);ctx.bezierCurveTo(gx+random()*4,340,gx-random()*4,700,gx,1024);ctx.stroke();}
    ctx.fillStyle="rgba(22,15,9,.6)";ctx.fillRect(x,0,.7,1024);
    for(let joint=0;joint<3;joint++){const y=(joint*350+plank%3*110)%1024;ctx.fillRect(x,y,w,.9);}
  }
  const texture=new THREE.CanvasTexture(canvas); texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,4);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function venueTexture(pattern=false) {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=256;
  const ctx=canvas.getContext("2d")!;
  ctx.fillStyle=pattern ? "#000" : "#bdb9ad";ctx.fillRect(0,0,256,256);
  if(pattern){
    ctx.strokeStyle="#fff";ctx.lineWidth=5;
    for(let row=0;row<2;row++)for(let col=0;col<2;col++){
      const cx=64+col*128,cy=64+row*128;ctx.beginPath();
      for(let point=0;point<16;point++){const a=point*Math.PI/8;const r=point%2 ? 27 : 53;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;if(!point)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
      ctx.closePath();ctx.stroke();ctx.strokeRect(cx-58,cy-58,116,116);
    }
  } else {
    let seed=817;for(let i=0;i<14000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%256;seed=(seed*1664525+1013904223)>>>0;const y=seed%256;ctx.fillStyle=i%2 ? "rgba(255,255,255,.12)" : "rgba(35,29,23,.09)";ctx.fillRect(x,y,1+i%3,1);}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(pattern ? 18 : 8,pattern ? 1 : 4);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function Balcony({ side, grille }: {side:number;grille:THREE.Texture}) {
  return <group position={[side*13.8,0,6]}>
    <mesh position={[0,5.2,0]}><boxGeometry args={[3.1,.45,43]} /><meshStandardMaterial color="#8b7961" roughness={.78} /></mesh>
    <mesh position={[-side*1.45,5.9,0]}><boxGeometry args={[.18,1.25,43]} /><meshStandardMaterial color="#d4c4a8" roughness={.88} /></mesh>
    <mesh position={[-side*1.56,5.88,0]}><boxGeometry args={[.035,.77,42.7]} /><meshStandardMaterial color="#211d1b" roughness={.85} /></mesh>
    <mesh position={[-side*1.595,5.9,0]} rotation={[0,side*Math.PI/2,0]}><planeGeometry args={[42.7,.77]} /><meshStandardMaterial color="#c1ab86" alphaMap={grille} transparent alphaTest={.3} side={THREE.DoubleSide} metalness={.3} roughness={.66} /></mesh>
    {[5.35,6.62].map(y=><mesh key={y} position={[-side*1.5,y,0]}><boxGeometry args={[.33,.12,43]} /><meshStandardMaterial color="#b5a084" roughness={.7} /></mesh>)}
    {[0,1,2,3,4,5,6,7,8,9,10].map((bay)=><group key={bay} position={[0,0,bay*3.9-19.5]}>
      <mesh position={[-side*.65,2.5,0]}><cylinderGeometry args={[.22,.29,5,12]} /><meshStandardMaterial color="#cbb898" roughness={.9} /></mesh>
      {[4.5,4.64,4.78].map((y,index)=><mesh key={y} position={[-side*.65,y,0]}><cylinderGeometry args={[.28+index*.065,.26+index*.065,.12,12]} /><meshStandardMaterial color="#c5b398" roughness={.88} /></mesh>)}
      <mesh position={[-side*.65,4.8,0]}><boxGeometry args={[.8,.35,.7]} /><meshStandardMaterial color="#c9bda6" roughness={.8} /></mesh>
      <mesh position={[-side*1.6,5.9,0]}><boxGeometry args={[.055,1.2,.2]} /><meshStandardMaterial color="#d6c4a1" /></mesh>
      <mesh position={[side*.45,8.4,0]}><boxGeometry args={[.3,5.8,.35]} /><meshStandardMaterial color="#d4c1a0" roughness={.85} /></mesh>
      {[0,1,2,3,4].map((rail)=><mesh key={rail} position={[-side*1.61,5.89,-1.5+rail*.65]}><boxGeometry args={[.025,.68,.035]} /><meshStandardMaterial color="#8d806b" metalness={.5} roughness={.4} /></mesh>)}
    </group>)}
    <mesh position={[-side*1.6,6.59,0]}><boxGeometry args={[.17,.1,43]} /><meshStandardMaterial color="#b09b77" metalness={.35} roughness={.5} /></mesh>
  </group>;
}
function CrossRig({x,z,row,power,colors,pattern,speed,movement,haze,playing,frame}: {x:number;z:number;row:number;power:number;colors:string[];pattern:CeilingPattern;speed:number;movement:number;haze:number;playing:boolean;frame:ArenaFrame}) {
  const fixture = (slot:number, position:[number,number,number], rotation:[number,number,number]) => <group key={slot} position={position} rotation={rotation}>
    <ArenaMovingHead position={[0,0,0]} side={Math.sign(x)} row={row} slot={slot} referenceRig beamRadius={.28} beamLength={14} color={colors[(row+slot)%colors.length]} power={power} haze={haze} movement={movement} speed={speed} pattern={pattern} playing={playing} frame={frame} />
  </group>;
  return <group position={[x,7.9,z]}>
    {[-1,1].map(side=><group key={side}>
      <RigRod from={[0,.2,side*1.55]} to={[0,5.3,side*1.55]} radius={.018} />
      <mesh position={[0,4.97,side*1.55]}><boxGeometry args={[.28,.38,.25]} /><meshStandardMaterial color="#11161a" roughness={.58} /></mesh>
    </group>)}
    {[0,1].map(axis=><group key={axis} rotation={[0,axis*Math.PI/2,0]}>
      <TrussRun length={4.8} />
      <mesh><boxGeometry args={[4.65,.31,.48]} /><meshStandardMaterial color="#111619" metalness={.45} roughness={.52} /></mesh>
    </group>)}
    {[-1.8,0,1.8].map((offset,slot)=>fixture(slot,[offset,-.35,0],[0,0,0]))}
    {[-1.8,0,1.8].map(offset=><group key={`clamp-${offset}`} position={[offset,-.24,0]}><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[.075,.018,6,10]} /><meshStandardMaterial color="#7a8287" metalness={.8} roughness={.35} /></mesh><RigRod from={[0,0,-.12]} to={[.25,.2,-.12]} radius={.012} /></group>)}
    <RigRod from={[-2.2,.2,.2]} to={[2.2,.2,.2]} radius={.022} />
    {fixture(3,[0,.42,0],[Math.PI,0,0])}
    {fixture(4,[-2.48,0,0],[0,0,-Math.PI/2])}
    {fixture(5,[2.48,0,0],[0,0,Math.PI/2])}
  </group>;
}

export function ShrineVenue({ambient = .12,power,colors,pattern,speed,movement,haze,playing,frame}: {ambient?:number;power:number;colors:string[];pattern:CeilingPattern;speed:number;movement:number;haze:number;playing:boolean;frame:ArenaFrame}) {
  const roomLights=useRef<THREE.PointLight[]>([]);
  useFrame(()=>{
    roomLights.current.forEach((light,index)=>{light.color.set(colors[index%colors.length]);light.intensity=ambient*power*(playing ? .18+frame.current.hit*.32 : .3)*24;});
  });
  const roof=useMemo(()=>{
    const positions:number[]=[]; const indices:number[]=[];
    for(let i=0;i<=40;i++){const t=i/40*Math.PI;for(const z of [-16,31])positions.push(Math.cos(t)*15.3,10.5+Math.sin(t)*5.55,z);if(i<40){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  },[]);
  useEffect(()=>()=>roof.dispose(),[roof]);
  const plaster=useMemo(()=>venueTexture(),[]);
  const grille=useMemo(()=>venueTexture(true),[]);
  useEffect(()=>()=>{plaster.dispose();grille.dispose();},[plaster,grille]);
  const wood=useMemo(()=>woodTexture(),[]);
  useEffect(()=>()=>wood.dispose(),[wood]);
  const arch=useMemo(()=>{const curve=new THREE.EllipseCurve(0,0,15.2,5.5,0,Math.PI,false,0);return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(40).map(p=>new THREE.Vector3(p.x,p.y,0))),48,.12,8,false);},[]);
  useEffect(()=>()=>arch.dispose(),[arch]);
  return <group>
    <hemisphereLight args={["#a5b0bd","#312c29",ambient*.7]} />
    <pointLight position={[0,10,1]} color="#ffe1a4" intensity={ambient*24} distance={40} decay={2} />
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,6]} receiveShadow><planeGeometry args={[31,49]} /><meshStandardMaterial map={wood} bumpMap={wood} bumpScale={.012} color="#b7a18a" roughness={.67} metalness={.08} /></mesh>
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*15.4,7,6]}><boxGeometry args={[.35,14,49]} /><meshStandardMaterial color="#8c8271" map={plaster} bumpMap={plaster} bumpScale={.045} roughness={.92} /></mesh>
      <Balcony side={side} grille={grille} />
      {ROWS.map((z,row)=><pointLight key={z} ref={light=>{if(light)roomLights.current[row+(side<0 ? 0 : 3)]=light;}} position={[side*10.5,6,z]} color={colors[row%colors.length]} intensity={40} distance={22} decay={2} />)}
    </group>)}
    {Array.from({length:9},(_,i)=><group key={i} position={[0,10.5,-14+i*5.6]}>
      <mesh geometry={arch}><meshStandardMaterial color="#9b896e" metalness={.25} roughness={.72} /></mesh>
      {[-1,1].map(side=><mesh key={side} position={[side*14.9,-1.1,0]}><boxGeometry args={[.25,2.4,.34]} /><meshStandardMaterial color="#baa88b" /></mesh>)}
      <mesh position={[0,3.7,0]}><boxGeometry args={[.12,.1,5.6]} /><meshStandardMaterial color="#39332a" /></mesh>
      <mesh position={[0,3.3,0]}><sphereGeometry args={[.055,8,6]} /><meshBasicMaterial color="#ffe4a9" /></mesh>
    </group>)}
    <mesh geometry={roof}><meshStandardMaterial color="#252b2b" side={THREE.DoubleSide} roughness={.94} /></mesh>
    <mesh position={[0,6.9,-15.9]}><boxGeometry args={[31,14,.4]} /><meshStandardMaterial color="#73695c" map={plaster} bumpMap={plaster} bumpScale={.045} roughness={.94} /></mesh>
    <mesh castShadow receiveShadow position={[0,.55,-12]}><boxGeometry args={[19,1.1,6]} /><meshStandardMaterial color="#1d2227" roughness={.9} /></mesh>
    <mesh position={[0,1.105,-12]}><boxGeometry args={[19,.035,6]} /><meshStandardMaterial color="#272c30" roughness={.8} /></mesh>
    <mesh castShadow receiveShadow position={[0,1.75,-11]}><boxGeometry args={[3.7,1.3,1.2]} /><meshStandardMaterial color="#14181b" roughness={.65} metalness={.3} /></mesh>
    {[-1.15,0,1.15].map(x=><group key={x} position={[x,2.45,-11]}>
      <mesh><boxGeometry args={[.9,.12,.65]} /><meshStandardMaterial color="#3d4349" roughness={.4} metalness={.55} /></mesh>
      <mesh position={[0,.072,0]}><cylinderGeometry args={[.21,.21,.025,20]} /><meshStandardMaterial color="#111820" metalness={.6} roughness={.3} /></mesh>
    </group>)}
    {[-1,1].map(side=><group key={side} position={[side*8.4,8,-12]}>
      <RigRod from={[0,0,0]} to={[0,5,0]} radius={.018} />
      {[0,1,2,3,4,5].map(i=><mesh key={i} position={[0,-i*.53,i*.04]} rotation={[i*.025,0,0]}><boxGeometry args={[.9,.48,.7]} /><meshStandardMaterial color="#0d1115" roughness={.8} /><mesh position={[0,0,.36]}><boxGeometry args={[.78,.36,.02]} /><meshStandardMaterial color="#30353a" wireframe /></mesh></mesh>)}
    </group>)}
    {SIDES.map(x=><group key={`spine-${x}`} position={[x,13.2,5.5]} rotation={[0,Math.PI/2,0]}><TrussRun length={41} /></group>)}
    {[-1,1].map(side=><group key={`lower-rail-${side}`}>
      <group position={[side*11.5,4.55,5.5]} rotation={[0,Math.PI/2,0]}><TrussRun length={35} /></group>
      {[-7,1,9,17].map((z,row)=><ArenaMovingHead key={z} position={[side*11.5,4.25,z]} side={side} row={row} slot={row} referenceRig beamRadius={.2} beamLength={17} color={colors[row%colors.length]} power={power} haze={haze} movement={movement} speed={speed} pattern={pattern} playing={playing} frame={frame} />)}
    </group>)}
    <group position={[0,0,20]}>
      <mesh position={[0,.65,0]}><boxGeometry args={[4.8,1.3,1.7]} /><meshStandardMaterial color="#151a1f" roughness={.8} /></mesh>
      {[-1.65,-.55,.55,1.65].map((x,i)=><group key={x} position={[x,1.45,0]} rotation={[-.35,0,0]}><mesh><boxGeometry args={[.8,.5,.06]} /><meshStandardMaterial color="#171d25" /></mesh><mesh position={[0,0,.034]}><planeGeometry args={[.7,.4]} /><meshBasicMaterial color={i%2 ? "#335577" : "#4b6d61"} toneMapped={false} /></mesh></group>)}
    </group>
    {ROWS.flatMap((z,row)=>SIDES.map(x=><CrossRig key={`${x}:${z}`} x={x} z={z} row={row} power={power} colors={colors} pattern={pattern} speed={speed} movement={movement} haze={haze} playing={playing} frame={frame} />))}
    {SHRINE_LASERS.map(([x,y,z],i)=><group key={i} position={[x,y,z]}><mesh><boxGeometry args={[.34,.19,.35]} /><meshStandardMaterial color="#282e34" metalness={.6} roughness={.4} /></mesh><mesh position={[0,0,.181]}><circleGeometry args={[.025,8]} /><meshBasicMaterial color="#66a9a2" /></mesh></group>)}
    {[-1,1].map(side=><group key={side} position={[side*11,0,-10]}>{[0,1,2,3].map(i=><mesh key={i} position={[0,i*.22,-i*.3]}><boxGeometry args={[1,.22,2-i*.3]} /><meshStandardMaterial color="#60584b" roughness={.8} /></mesh>)}</group>)}
  </group>;
}
