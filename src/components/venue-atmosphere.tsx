import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ArenaFrame } from "./circular-arena";

export function VenueAtmosphere({exposure,fogDensity}:{exposure:number;fogDensity:number}) {
  useFrame(({gl,scene})=>{
    gl.toneMappingExposure=exposure;
    if(scene.fog instanceof THREE.FogExp2)scene.fog.density=fogDensity;
  });
  return null;
}
const vertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`varying vec2 vUv;uniform vec3 tint;uniform float power;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float pool=exp(-r*r*5.)*smoothstep(1.,.45,r);float grain=.92+.08*sin(vUv.x*1400.)*sin(vUv.y*900.);gl_FragColor=vec4(tint,power*pool*grain);}`;
/** Soft screen spill on the floor; deliberately diffuse rather than a mirror. */
export function FloorSpill({frame,power,color,large,shrine}:{frame:ArenaFrame;power:number;color:string;large:boolean;shrine:boolean}) {
  const material=useRef<THREE.ShaderMaterial>(null);
  const uniforms=useMemo(()=>({tint:{value:new THREE.Color("#ffffff")},power:{value:0}}),[]);
  useFrame(()=>{if(material.current){material.current.uniforms.tint.value.set(color);material.current.uniforms.power.value=power*(.12+frame.current.hit*.045);}});
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,shrine?-7:large?-4:-2]} scale={[large?21:11,large?25:12,1]}>
    <planeGeometry args={[1,1]} /><shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/>
  </mesh>;
}
