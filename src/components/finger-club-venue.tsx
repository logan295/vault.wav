import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ArenaMovingHead, RigRod, type ArenaFrame, type CeilingPattern } from "./circular-arena";

export const FINGER_EYES: [number,number,number][] = [-7.6,7.6].flatMap(x=>[-.4,.4].map(dx=>[x+dx,3.95,-5.33] as [number,number,number]));
export const FINGER_FIXTURES: [number,number,number][] = [...FINGER_EYES,...[-7,-2.4,2.4,7].map(x=>[x,7.3,-4] as [number,number,number]),[-4,.9,-4],[4,.9,-4]];
export const FINGER_SCREENS = [
  {position:[0,4.35,-7.8] as [number,number,number],scale:[1.18,1.18,1] as [number,number,number],shape:"diamond" as const,patternOffset:0},
  ...[-1,1].map(side=>({position:[side*4.65,3.8,-7.7] as [number,number,number],scale:[side*.96,1.02,1] as [number,number,number],shape:"chevron" as const,patternOffset:side+2})),
  ...[-1,1].map(side=>({position:[side*3.05,5.25,-7.65] as [number,number,number],rotation:[0,0,side*Math.PI/4] as [number,number,number],scale:[.07,.65,1] as [number,number,number],shape:"rect" as const,patternOffset:0})),
];
const projectionVertex=`varying vec3 vPosition;varying vec3 vNormal;void main(){vPosition=(modelMatrix*vec4(position,1.)).xyz;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const projectionFragment=`varying vec3 vPosition;varying vec3 vNormal;uniform float uTime,uPower,uMode,uRoom,uScale,uHit;uniform vec3 uBase;
mat2 turn(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
void main(){
 vec2 p=(vPosition.xy-vec2(0.,3.))*uScale;float t=uTime*.25;
 vec2 q=p+vec2(sin(p.y*1.7+t),cos(p.x*1.3-t))*.35;
 float r=length(q),a=atan(q.y,q.x);float field;
 if(uMode<.5)field=sin(r*9.-t*4.+sin(a*6.+t)*1.8);
 else if(uMode<1.5)field=sin(q.x*3.+sin(q.y*3.+t)*2.+sin(q.x*2.-t));
 else if(uMode<2.5){a=abs(mod(a+t*.12,1.0472)-.5236);q=vec2(cos(a),sin(a))*r;field=sin(q.x*7.+sin(q.y*9.-t*2.)*2.+t);}
 else if(uMode<3.5)field=sin(q.y*7.+sin(q.x*4.+t)*3.);
 else if(uMode<4.5){q=turn(t*.12)*q;field=sin(16./(.35+length(q)) + atan(q.y,q.x)*6.-t*3.);}
 else if(uMode<5.5){vec2 cell=abs(fract(q*.65+t*.04)-.5);field=cos(min(cell.x,cell.y)*45.+sin(r*2.-t)*3.);}
 else if(uMode<6.5){for(int i=0;i<4;i++){q=abs(q)/max(dot(q,q),.18)-vec2(.8,.65);q=turn(.6+t*.025)*q;}field=sin(length(q)*4.-t*2.);}
 else {float fold=abs(sin(a*5.+t*.2));field=sin(r*6.+fold*9.-t*3.+sin(r*3.+t));}
 float ink=pow(.5+.5*field,4.);vec3 neon=.5+.5*cos(vec3(0.,2.1,4.2)+field*2.5+t*.3+r*.16);
 neon*=.65+.35*cos(vec3(-.3,0.,.3)*field*8.+r*5.-t);
 float seams=.55+.45*sin(field*12.+r*2.-t);neon=mix(neon,neon.brg,seams*.35);
 float shading=.48+.52*max(0.,dot(normalize(vNormal),normalize(vec3(-.4,.8,1.))));
 vec3 color=uBase*uRoom*shading+neon*ink*uPower*(.6+uHit*.4);gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;

/** Angular LED wings use normalized UVs so video and procedural looks share the same cutout. */
export function FingerWingGeometry(){
 const geometry=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-1.9,-2.4);shape.lineTo(.3,0);shape.lineTo(-1.9,2.4);shape.lineTo(-.7,2.4);shape.lineTo(1.5,0);shape.lineTo(-.7,-2.4);shape.closePath();const g=new THREE.ShapeGeometry(shape);const positions=g.attributes.position;const uv=g.attributes.uv;for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)+1.9)/3.4,(positions.getY(i)+2.4)/4.8);return g;},[]);
 return <primitive object={geometry} attach="geometry"/>;
}
function MappedMaterial({frame,power,ambient,mode,scale,speed,base="#d57663"}:{frame:ArenaFrame;power:number;ambient:number;mode:number;scale:number;speed:number;base?:string}) {
 const material=useRef<THREE.ShaderMaterial>(null);
 const uniforms=useMemo(()=>({uTime:{value:0},uPower:{value:0},uMode:{value:0},uRoom:{value:0},uScale:{value:1},uHit:{value:0},uBase:{value:new THREE.Color(base)}}),[base]);
 useFrame(()=>{if(!material.current)return;const u=material.current.uniforms;u.uTime.value=frame.current.time*speed;u.uPower.value=power*(frame.current.dropBeat===null?1:1+.5*Math.exp(-frame.current.dropBeat*1.5));u.uMode.value=mode;u.uRoom.value=ambient*1.6;u.uScale.value=scale;u.uHit.value=frame.current.hit;});
 return <shaderMaterial ref={material} uniforms={uniforms} vertexShader={projectionVertex} fragmentShader={projectionFragment} toneMapped={false}/>;
}
function Finger({x,frame,power,ambient,mode,scale,speed}:{x:number;frame:ArenaFrame;power:number;ambient:number;mode:number;scale:number;speed:number}) {
 const body=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-.88,0);s.quadraticCurveTo(-1.12,.08,-1.06,.7);s.lineTo(-.92,3.3);s.bezierCurveTo(-1.02,4.85,1.02,4.85,.92,3.3);s.lineTo(1.06,.7);s.quadraticCurveTo(1.12,.08,.88,0);s.closePath();return s;},[]);
 const arm=useMemo(()=>{const s=new THREE.Shape();s.moveTo(.82,1.5);s.quadraticCurveTo(1.12,.75,1.48,.9);s.quadraticCurveTo(1.72,1.1,1.65,2.15);s.lineTo(1.37,2.18);s.lineTo(1.33,1.32);s.quadraticCurveTo(1.2,1.2,1.05,1.67);s.closePath();return s;},[]);
 const smile=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-.65,2.15);s.quadraticCurveTo(0,1.94,.65,2.15);s.lineTo(.61,1.25);s.quadraticCurveTo(0,.57,-.61,1.25);s.closePath();return s;},[]);
 return <group position={[x,.6,-6]}>
  <mesh castShadow><extrudeGeometry args={[body,{depth:.28,bevelEnabled:true,bevelSize:.13,bevelThickness:.1,bevelSegments:4,steps:1,curveSegments:24}]}/><meshStandardMaterial color="#c47969" roughness={.75}/></mesh>
  <mesh position={[0,0,.39]}><shapeGeometry args={[body,24]}/><MappedMaterial frame={frame} power={power} ambient={ambient} mode={mode} scale={scale} speed={speed}/></mesh>
  {[-1,1].map(side=><group key={side}>
   <mesh position={[side*.4,3.35,.43]} scale={[1,1.05,.4]}><sphereGeometry args={[.46,24,16]}/><meshStandardMaterial color="#f3dfc1" roughness={.5}/></mesh>
   <mesh position={[side*.4,3.35,.635]}><circleGeometry args={[.32,32]}/><meshStandardMaterial color="#1a0d18" roughness={.3}/></mesh>
   <mesh position={[side*.4,3.35,.646]}><ringGeometry args={[.29,.32,48]}/><meshBasicMaterial color="#db4169"/></mesh>
   <mesh position={[side*.4,3.35,.656]}><circleGeometry args={[.07,16]}/><meshBasicMaterial color="#140610"/></mesh>
   <mesh position={[side*.4,3.98,.4]} rotation={[0,0,Math.PI/2-side*.2]}><capsuleGeometry args={[.055,.38,4,8]}/><meshStandardMaterial color="#492b28"/></mesh>
   <group scale={[side,1,1]}>
    <mesh position={[0,0,.05]}><extrudeGeometry args={[arm,{depth:.12,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,curveSegments:18}]}/><meshStandardMaterial color="#d48570" roughness={.7}/></mesh>
    <mesh position={[1.5,2.22,.18]} scale={[1.35,.8,.65]}><sphereGeometry args={[.25,20,14]}/><meshStandardMaterial color="#db927a" roughness={.75}/></mesh>
    {[-1,0,1].map(i=><mesh key={i} position={[1.5+i*.17,2.3,.31]}><sphereGeometry args={[.115,14,10]}/><meshStandardMaterial color="#eca88c" roughness={.8}/></mesh>)}
   </group>
  </group>)}
  <mesh position={[0,0,.43]}><shapeGeometry args={[smile,24]}/><meshStandardMaterial color="#100a0e" roughness={1}/></mesh>
  {[-.27,0,.27].map(offset=><mesh key={offset} position={[offset,1.94,.473]}><boxGeometry args={[.012,.22,.008]}/><meshStandardMaterial color="#ad8e7d"/></mesh>)}
  <mesh position={[0,1.92,.45]}><boxGeometry args={[1.08,.24,.03]}/><meshStandardMaterial color="#fff1d4" emissive="#e1b58e" emissiveIntensity={.15} roughness={.8}/></mesh>
  <mesh position={[0,1.12,.45]}><boxGeometry args={[.84,.2,.03]}/><meshStandardMaterial color="#f3d8c1" emissive="#e1b58e" emissiveIntensity={.15}/></mesh>
 </group>;
}
function EyeLens({frame,x}:{frame:ArenaFrame;x:number}){
 const lens=useRef<THREE.MeshBasicMaterial>(null);const halo=useRef<THREE.MeshBasicMaterial>(null);
 useFrame(()=>{if(lens.current)lens.current.opacity=Math.min(1,frame.current.laserLevel)*.95;if(halo.current)halo.current.opacity=Math.min(1,frame.current.laserLevel)*(.18+frame.current.hit*.28);});
 return <group position={[x,3.95,-5.32]}><mesh><circleGeometry args={[.075,24]}/><meshBasicMaterial ref={lens} color="#ff557e" transparent opacity={0} toneMapped={false}/></mesh><mesh position={[0,0,-.005]}><ringGeometry args={[.09,.24,32]}/><meshBasicMaterial ref={halo} color="#ff3063" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh></group>;
}
function MirrorBall() {
 const transform=useMemo(()=>new THREE.Object3D(),[]);const tiles=useRef<THREE.InstancedMesh>(null);const group=useRef<THREE.Group>(null);
 useFrame((_,delta)=>{if(group.current)group.current.rotation.y+=Math.min(delta,.05)*.025;});
 return <group ref={group} position={[0,8.4,2]}>
  <mesh><sphereGeometry args={[.83,32,20]}/><meshStandardMaterial color="#9ea7af" metalness={1} roughness={.13}/></mesh>
  <instancedMesh ref={tiles} args={[undefined,undefined,240]} onUpdate={mesh=>{for(let i=0;i<240;i++){const latitude=Math.acos(1-2*(i+.5)/240);const longitude=i*2.39996;transform.position.set(Math.sin(latitude)*Math.cos(longitude)*.85,Math.cos(latitude)*.85,Math.sin(latitude)*Math.sin(longitude)*.85);transform.lookAt(0,0,0);transform.scale.set(1,1,1);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);}mesh.instanceMatrix.needsUpdate=true;}}><planeGeometry args={[.14,.14]}/><meshStandardMaterial color="#a9b4be" metalness={1} roughness={.1} side={THREE.DoubleSide}/></instancedMesh>
  <RigRod from={[0,.85,0]} to={[0,1.6,0]} radius={.018}/>
 </group>;
}
export function FingerClubVenue({frame,ambient,power,haze,colors,pattern,speed,movement,mapping,mappingMode,mappingScale,mappingSpeed}:{frame:ArenaFrame;ambient:number;power:number;haze:number;colors:string[];pattern:CeilingPattern;speed:number;movement:number;mapping:number;mappingMode:number;mappingScale:number;mappingSpeed:number}) {
 return <group>
  <hemisphereLight args={["#a6b6c2","#161016",ambient*.5]}/>
  <mesh receiveShadow position={[0,-.12,6]}><boxGeometry args={[28,.2,44]}/><meshStandardMaterial color="#15151b" roughness={.78} metalness={.12}/></mesh>
  <mesh position={[0,4.7,-9]}><boxGeometry args={[28,10,.25]}/><meshStandardMaterial color="#101014" roughness={.98}/></mesh>
  {[-1,1].map(side=><group key={side}>
   <mesh position={[side*14,4.5,6]}><boxGeometry args={[.2,9,44]}/><meshStandardMaterial color="#17141a" roughness={.98}/></mesh>
   {[0,6,12,18].map(z=><group key={z} position={[side*13.75,3,z]} rotation={[0,-side*Math.PI/2,0]}><mesh><boxGeometry args={[3.3,5.2,.1]}/><meshStandardMaterial color="#101216" roughness={.9}/></mesh><mesh position={[0,0,.06]}><planeGeometry args={[3.15,5]}/><MappedMaterial frame={frame} power={mapping*.6} ambient={ambient} mode={mappingMode} scale={mappingScale} speed={mappingSpeed} base="#1d1a28"/></mesh></group>)}
   <Finger x={side*7.6} frame={frame} ambient={ambient+power*.18} power={mapping} mode={mappingMode} scale={mappingScale} speed={mappingSpeed}/>
   <group position={[side*11,5,-7]}>{[0,1,2,3,4].map(i=><mesh castShadow key={i} position={[0,-i*.6,i*.05]} rotation={[i*.04,0,0]}><boxGeometry args={[1.1,.55,.9]}/><meshStandardMaterial color="#0b0d11" roughness={.94}/></mesh>)}</group>
   {[0,6,12].map((z,row)=><ArenaMovingHead key={z} position={[side*11.6,6.9,z]} side={side} row={row} color={colors[row%colors.length]} power={power} haze={haze} movement={movement} speed={speed} pattern={pattern} playing={frame.current.hit>0} frame={frame} beamRadius={.65} beamLength={14}/>)}
   {[-1,1].map(i=><RigRod key={i} from={[side*12+i*.12,0,-7]} to={[side*12+i*.12,7.5,-7]} radius={.055}/>)}
  </group>)}
  <mesh position={[0,.35,-6]} castShadow><boxGeometry args={[18,.7,5.4]}/><meshStandardMaterial color="#18191e" roughness={.95}/></mesh>
  <mesh castShadow position={[0,1.25,-4.8]}><boxGeometry args={[4.8,1.1,1.5]}/><meshStandardMaterial color="#12131a" roughness={.8}/></mesh>
  {[-1.2,0,1.2].map(x=><group key={x} position={[x,1.84,-4.8]}><mesh><boxGeometry args={[.9,.12,.65]}/><meshStandardMaterial color="#252934" metalness={.5} roughness={.5}/></mesh><mesh position={[0,.075,0]}><cylinderGeometry args={[.22,.22,.025,24]}/><meshStandardMaterial color="#0a0d13"/></mesh></group>)}
  <mesh position={[0,9,6]}><boxGeometry args={[28,.15,44]}/><meshStandardMaterial color="#090a0d" roughness={1}/></mesh>
  {[-4,4,12,20].map(z=><group key={z}>{[7.4,7.7].map(y=><RigRod key={y} from={[-12,y,z]} to={[12,y,z]} radius={.06}/>)}{[-8,-4,0,4,8].map(x=><RigRod key={x} from={[x,7.4,z]} to={[x+1.5,7.7,z]} radius={.025}/>)}</group>)}
  {FINGER_SCREENS.filter(screen=>screen.shape==="diamond").map((screen,index)=><group key={`led-edge-${index}`} position={[screen.position[0],screen.position[1],screen.position[2]+.05]} rotation={[0,0,Math.PI/4]} scale={screen.scale}>
    {[-1,1].flatMap(side=>[false,true].map(horizontal=><mesh key={`${side}:${horizontal}`} position={horizontal?[0,side*1.93,0]:[side*1.93,0,0]}><boxGeometry args={horizontal?[3.88,.028,.04]:[.028,3.88,.04]}/><meshBasicMaterial color={colors[index%colors.length]} transparent opacity={power*.28} toneMapped={false}/></mesh>))}
  </group>)}
  {[-7.6,7.6].map(x=><pointLight key={`prop-wash-${x}`} position={[x,3.5,-2.3]} color="#ffc5a5" intensity={power*12} distance={7} decay={2}/>)}
  {FINGER_EYES.map(([x])=><EyeLens key={x} frame={frame} x={x}/>)}
  <MirrorBall/>
  <group position={[0,.7,18]}><mesh><boxGeometry args={[4.8,1.4,1.5]}/><meshStandardMaterial color="#11151a" roughness={.85}/></mesh>{[-1.65,-.55,.55,1.65].map((x,i)=><group key={x} position={[x,1,0]} rotation={[-.2,0,0]}><mesh><boxGeometry args={[.9,.55,.06]}/><meshStandardMaterial color="#14191f"/></mesh><mesh position={[0,0,-.035]} rotation={[0,Math.PI,0]}><planeGeometry args={[.8,.45]}/><meshBasicMaterial color={i%2?"#29435c":"#214c3e"}/></mesh></group>)}</group>
 </group>;
}

export function MappedVenueWalls({frame,power,mode,scale,speed,large,shrine}:{frame:ArenaFrame;power:number;mode:number;scale:number;speed:number;large:boolean;shrine:boolean}) {
 const x=shrine?15.15:large?17.5:6.9;
 return <>{[-1,1].flatMap(side=>[0,1,2].map(row=><mesh key={`${side}:${row}`} position={[side*x,large?3.4:2.1,(large?1:-3)+row*(large?7:2.5)]} rotation={[0,-side*Math.PI/2,0]}><planeGeometry args={[large?5.5:2,large?5.4:3.4]}/><MappedMaterial frame={frame} power={power} ambient={0} mode={mode} scale={scale} speed={speed} base="#000000"/></mesh>))}</>;
}
