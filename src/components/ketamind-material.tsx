"use client";
import { useMemo,useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ketamindRhythm } from "@/lib/visuals/ketamind";
import { KETAMIND_FRAGMENT,KETAMIND_VERTEX } from "@/lib/visuals/ketamind-shader";
import { showMotionAt,type SongCue } from "@/lib/local-audio/song-show";
export type KetamindClock={beat:number;time:number;bpm:number;attack?:number;dropBeat?:number|null;cue?:SongCue};
export function KetamindMaterial({index,clock,aspect,diamond=false,fit='fit',power=1,depthTest=true,screenSpace=false}:{
 index:number;clock:()=>KetamindClock;aspect:number;diamond?:boolean;fit?:'fit'|'fill';power?:number;depthTest?:boolean;screenSpace?:boolean;
}) {
 const material=useRef<THREE.ShaderMaterial>(null);
 const uniforms=useMemo(()=>Object.fromEntries(['Beat','Motion','Kick','Snare','Triplet','Hat','Drop','Attack','Index','Aspect','Diamond','Fit','Power'].map(key=>[`u${key}`,{value:key==='Power'?1:key==='Aspect'?16/9:0}])),[]);
 useFrame(()=>{
  const m=material.current;if(!m)return;
  const transport=clock(),r=ketamindRhythm(transport.beat,transport.attack,transport.dropBeat);
  const values={Beat:r.beat,Motion:showMotionAt(transport.cue,transport.time,transport.bpm),Kick:r.kick,Snare:r.snare,Triplet:r.triplet,Hat:r.hat,Drop:r.drop,Attack:r.attack,Index:index,Aspect:aspect,Diamond:Number(diamond),Fit:Number(fit==='fill'),Power:power};
  for(const [key,value]of Object.entries(values))m.uniforms[`u${key}`].value=value;
 });
 return <shaderMaterial ref={material} uniforms={uniforms} vertexShader={screenSpace ? "varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}" : KETAMIND_VERTEX} fragmentShader={KETAMIND_FRAGMENT} toneMapped={false} depthTest={depthTest} />;
}
