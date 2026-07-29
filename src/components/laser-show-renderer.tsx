"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerspectiveCamera, Sparkles, useVideoTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, Film, Gauge, Lightbulb, Maximize2, Minimize2, Monitor, Pause, Play, Radio, ScanLine, Sparkles as SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";

type Bands = { full: number[]; low: number[]; mid: number[]; high: number[] };
type CameraPreset = "arena" | "booth" | "overhead";
type RigLayout = "truss" | "ring" | "wings" | "floor";
type RigChoice = "auto" | RigLayout;
type ScreenLayout = "cinema" | "totems" | "mosaic" | "diamonds" | "orbit";
type ScreenChoice = "auto" | ScreenLayout;
type ScreenContent = "auto" | "generative" | "vj-pack";
type ShowLayer = "all" | "lasers" | "lights" | "screens";
type StagePreset = "festival" | "portal" | "cathedral" | "warehouse" | "prism" | "bunker" | "halo";
type RhythmStyle = "auto" | "banks" | "chase" | "strobe" | "open";
type BeamShape = "straight" | "sine" | "helix" | "zigzag";
type FloorPattern = "grid" | "rings" | "chevrons" | "circuit";
type RenderQuality = "balanced" | "crisp" | "ultra";
type LaserZone = "left" | "right" | "floor";
type ScreenShape = "rect" | "circle" | "diamond";
type ScreenSpec = { position: [number, number, number]; rotation?: [number, number, number]; scale: [number, number, number]; shape?: ScreenShape; patternOffset: number };
type MusicFeatures = { energy: number; bass: number; mids: number; highs: number; transient: number; drop: number };
const EMPTY: Bands = { full: [], low: [], mid: [], high: [] };
const PATTERN_NAMES = ["Prism fan", "Crossfire X", "Laser tunnel", "Kinetic burst", "Cross lattice", "Horizon sweep", "Helix bloom", "Split-cross chase", "Diamond cut", "Star forge", "Cross crown", "Orbital cage", "Wobble web", "Alien iris", "Bass zipper", "Chaos braid", "Subwoofer sway", "Cathedral vault", "Shockwave fan", "Mirror vortex", "Serpent sweep", "Portal collapse"];
const CROSS_PATTERNS = [1, 4, 7, 10, 14];
const LASER_COLOR_OPTIONS = ["#45ffe2", "#2a8cff", "#ff3d98", "#9a70ff", "#ff5b3d", "#ffd84a", "#78ff4d", "#ffffff", "#ff1744", "#00e5ff", "#ff9100", "#b6ff00"];
const STAGE_PRESETS: Record<StagePreset, { label: string; rig: RigLayout; screens: ScreenLayout; camera: CameraPreset }> = {
  festival: { label: "Festival mainstage", rig: "truss", screens: "cinema", camera: "arena" },
  portal: { label: "Orbital portal", rig: "ring", screens: "orbit", camera: "booth" },
  cathedral: { label: "Laser cathedral", rig: "wings", screens: "diamonds", camera: "arena" },
  warehouse: { label: "Warehouse floor", rig: "floor", screens: "mosaic", camera: "booth" },
  prism: { label: "Prism temple", rig: "wings", screens: "diamonds", camera: "overhead" },
  bunker: { label: "Bass bunker", rig: "floor", screens: "totems", camera: "arena" },
  halo: { label: "Halo arena", rig: "ring", screens: "orbit", camera: "arena" },
};
const VJ_LOOPS = [
  ["dirty-heads", "Dirty Heads"], ["escape-velocity", "Escape Velocity"], ["trash-circle", "Particle Ring"], ["hd-tunnel", "Monochrome Tunnel"], ["vhs-dimension", "VHS Dimension"], ["stoners-odyssey", "Stoner’s Odyssey"],
  ["bw-kaledia", "B/W Kaledia"], ["glitch-color", "Chromatic Glitch"], ["glitch-bw", "Monochrome Glitch"], ["liquid-grid", "Liquid Grid"], ["neon-hexagons", "Neon Hexagons"], ["square-kaledia", "Square Kaledia"], ["full-kaledia", "Full Kaledia"], ["sunset-kaledia", "Sunset Kaledia"],
  ["kaleidoscope-lights", "Kaleidoscope Lights"], ["abstract-figures", "Abstract Figures"], ["kaleidoscope-texture", "Prismatic Texture"], ["blue-triangle-tunnel", "Blue Triangle Tunnel"], ["red-line-tunnels", "Red Line Tunnels"], ["triangle-vj-loop", "Triangle Flight"], ["neon-shapes", "Neon Shapes"], ["red-neon-tunnel", "Red Neon Tunnel"], ["violet-rhombus", "Violet Rhombus"], ["mono-compositions", "Monochrome Forms"], ["strange-kaleidoscope", "Strange Kaleidoscope"], ["varied-compositions", "Varied Compositions"], ["mirror-shapes", "Mirror Shapes"], ["abstract-sequence", "Abstract Sequence"],
  ["alien-lab", "Alien Laboratory"], ["psychedelic-ink", "Psychedelic Ink"], ["wormhole", "Deep Space Wormhole"], ["space-nebula", "Bass Nebula"], ["orange-liquid", "Orange Hypnosis"], ["blue-liquid", "Blue Hypnosis"], ["motion-kaleidoscope", "Motion Kaleidoscope"], ["pink-light-tunnel", "Pink Light Tunnel"],
  ["exploring-cosmos", "Exploring the Cosmos"], ["fractal-space-tunnel", "Fractal Space Tunnel"], ["fluorescent-nebula", "Fluorescent Nebula"], ["liquid-galaxy", "Liquid Galaxy"], ["intergalactic-journey", "Intergalactic Journey"], ["night-city-drive", "Night City Drive"], ["night-highway-drive", "Night Highway Rush"], ["surreal-dancer", "Surreal Dancer"], ["dark-driving-tunnel", "Dark Driving Tunnel"], ["starry-sky-travel", "Starry Sky Travel"], ["moonlight-alien", "Moonlight Alien"],
].map(([id, label]) => ({ id, label, src: `/vj-loops/${id}.mp4`, poster: `/vj-loops/thumbs/${id}.jpg` }));
const LASER_BODY = new THREE.CylinderGeometry(.13, .17, .3, 12);
const LASER_LENS = new THREE.CircleGeometry(.075, 16);
const LASER_VOLUME = new THREE.ConeGeometry(.105, 8.1, 16, 1, true);
const LASER_LINE = new THREE.CylinderGeometry(.008, .008, 8.6, 8);
const LASER_CORE = new THREE.CylinderGeometry(.0028, .0028, 8.64, 6);
const WASH_BODY = new THREE.SphereGeometry(.12, 12, 8);
const WASH_VOLUME = new THREE.ConeGeometry(.92, 6.4, 24, 1, true);

const LED_VERTEX = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const LED_FRAGMENT = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime, uEnergy, uBass, uMids, uHighs, uPattern, uPower, uImpact;
  uniform vec3 uA, uB, uC;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.48;}return v;}
  void main(){
    vec2 uv=vUv-.5; uv.x*=1.8;
    float t=uTime*(.09+uEnergy*.16); float a=atan(uv.y,uv.x); float r=length(uv);
    float petals=5.+mod(uPattern,5.);
    float warp=sin(a*petals+t*3.+sin(r*18.-t*4.))*(.06+.12*uMids);
    vec2 q=uv; q*=mat2(cos(t*.35),-sin(t*.35),sin(t*.35),cos(t*.35));
    float tunnel=sin(22.*(r+warp)-t*(2.2+uBass*3.));
    float lattice=sin(q.x*(13.+uPattern))+cos(q.y*(16.+uPattern*.7)+t*1.3);
    float mandala=cos((a+sin(r*7.-t)*.3)*(8.+mod(uPattern,6.)))*sin(r*(24.+uMids*15.)-t*2.);
    float fluid=sin((q.x+sin(q.y*5.+t)*.22)*9.)*cos((q.y+sin(q.x*4.-t*.8)*.18)*11.);
    float interference=sin(q.x*25.+sin(q.y*8.+t)*5.)+sin(q.y*22.-t*1.4);
    float checker=sin((q.x+sin(q.y*4.+t*.4)*.2)*18.)*sin((q.y+cos(q.x*5.-t*.3)*.2)*18.);
    float spiral=sin(r*38.-a*(5.+mod(uPattern,4.))-t*2.2);
    float cellular=sin(fbm(q*5.+t*.08)*18.+r*12.-t);
    float ribbons=sin((q.y+sin(q.x*5.+t)*(.18+uMids*.18))*32.);
    float stars=step(.965,hash(floor((q/(.12+r*.08)+t*.015)*34.)))*2.-.6;
    vec2 hex=abs(fract(q*vec2(9.,15.)+vec2(t*.04,0.))-.5); float honey=sin((max(hex.x*.866+hex.y*.5,hex.y))*35.);
    float fractal=sin((fbm(q*4.+vec2(t*.05,-t*.03))+r)*24.-t*1.5);
    vec2 eyeUv=uv; eyeUv.x+=sin(t*.7)*.08; float iris=sin(length(eyeUv)*52.-t*3.)+smoothstep(.2,.02,length(eyeUv));
    float wobble=sin((r+sin(a*7.+t*2.)*.12)*31.-t*4.)*cos(a*3.-t);
    float zipper=sin((abs(q.x)+sin(q.y*7.-t)*.16)*42.-t*5.)+cos(q.y*13.+t);
    float silly=sin((q.y+sin(q.x*4.+t)*(.28+uBass*.22))*23.)+cos(a*5.+t*2.)*.65;
    float mode=mod(floor(uPattern),16.); float form=tunnel;
    if(mode>0.5) form=lattice*.55; if(mode>1.5) form=mandala; if(mode>2.5) form=fluid;
    if(mode>3.5) form=interference*.5; if(mode>4.5) form=checker; if(mode>5.5) form=spiral;
    if(mode>6.5) form=cellular; if(mode>7.5) form=ribbons; if(mode>8.5) form=stars;
    if(mode>9.5) form=honey; if(mode>10.5) form=fractal; if(mode>11.5) form=wobble;
    if(mode>12.5) form=iris; if(mode>13.5) form=zipper*.55; if(mode>14.5) form=silly*.58;
    float pulse=smoothstep(.82,-.18,abs(form*.72+mandala*.18));
    float bloom=exp(-4.2*r)*(1.+uBass*1.8);
    float spokes=.5+.5*cos(a*(6.+mod(uPattern,7.))+t*2.5+r*10.);
    vec3 col=mix(uA,uB,.5+.5*sin(tunnel+a*2.)); col=mix(col,uC,spokes*(.2+.55*uHighs));
    float background=.08+.22*fbm(q*3.+vec2(t*.03,-t*.02))+.14*(.5+.5*cos(r*13.-t));
    col*=background+pulse*(.85+uEnergy*1.05)+bloom*.72+uImpact*.45;
    float scan=.88+.12*sin(vUv.y*950.); float pixels=.9+.1*step(.42,hash(floor(vUv*vec2(420.,190.))));
    float edge=smoothstep(.72,.28,length(vec2(uv.x*.58,uv.y)));
    gl_FragColor=vec4(col*scan*pixels*(.22+.78*edge)*uPower,1.);
  }`;

function screensFor(layout: ScreenLayout): ScreenSpec[] {
  if (layout === "totems") return [-4.8, -2.4, 0, 2.4, 4.8].map((x, index) => ({ position: [x, 2.45 + (index % 2) * .2, -5.18], scale: [.34, 1.25, 1], patternOffset: index * 2 }));
  if (layout === "mosaic") return Array.from({ length: 8 }, (_, index) => ({ position: [((index % 4) - 1.5) * 2.65, 1.45 + Math.floor(index / 4) * 2.05, -5.18], scale: [.48, .64, 1], patternOffset: index }));
  if (layout === "diamonds") return [{ position: [0, 2.55, -5.2], scale: [.92, .92, 1], shape: "diamond" as const, patternOffset: 0 }, ...[-4.6, -2.3, 2.3, 4.6].map((x, index) => ({ position: [x, 2.3 + index % 2 * .5, -5.12] as [number, number, number], scale: [.48, .48, 1] as [number, number, number], shape: "diamond" as const, patternOffset: index + 3 }))];
  if (layout === "orbit") return [{ position: [0, 2.55, -5.2], scale: [1.05, 1.05, 1], shape: "circle" as const, patternOffset: 0 }, ...Array.from({ length: 6 }, (_, index) => { const angle = index / 6 * Math.PI * 2; return { position: [Math.cos(angle) * 4.7, 2.55 + Math.sin(angle) * 1.65, -5.08] as [number, number, number], scale: [.42, .42, 1] as [number, number, number], shape: "circle" as const, patternOffset: index + 2 }; })];
  return [{ position: [0, 2.55, -5.31], scale: [1.55, 1.48, 1], patternOffset: 0 }, { position: [-5.35, 2.15, -4.92], rotation: [0, .34, 0], scale: [.52, .9, 1], patternOffset: 4 }, { position: [5.35, 2.15, -4.92], rotation: [0, -.34, 0], scale: [.52, .9, 1], patternOffset: 8 }];
}

function average(values: number[], start: number, end: number) {
  if (!values.length) return 0; const first = Math.max(0, Math.floor(start)); const last = Math.min(values.length, Math.ceil(end)); let total = 0;
  for (let index = first; index < last; index++) total += values[index]; return total / Math.max(1, last - first);
}

function featuresAt(bands: Bands, progress: number): MusicFeatures {
  const length = bands.full.length; if (!length) return { energy: 0, bass: 0, mids: 0, highs: 0, transient: 0, drop: 0 };
  const index = progress * (length - 1); const fast = Math.max(6, length * .00045); const pre = Math.max(40, length * .006); const bed = Math.max(120, length * .022);
  const energy = average(bands.full, index - fast, index + fast); const bass = average(bands.low, index - fast, index + fast); const mids = average(bands.mid, index - fast, index + fast); const highs = average(bands.high, index - fast, index + fast);
  const previousEnergy = average(bands.full, index - pre, index - fast); const previousBass = average(bands.low, index - pre, index - fast); const previousHighs = average(bands.high, index - pre, index - fast); const energyBed = average(bands.full, index - bed, index - pre);
  const transient = THREE.MathUtils.clamp(Math.max(0, energy - previousEnergy) * 2.2 + Math.max(0, highs - previousHighs) * 1.2, 0, 1);
  const drop = THREE.MathUtils.clamp(Math.max(0, bass - previousBass) * 3.4 + Math.max(0, energy - previousEnergy) * 2.1 + transient * .45 + Math.max(0, energy - energyBed - .28) * .35, 0, 1);
  return { energy, bass, mids, highs, transient, drop };
}

function isSubDrop({ bass, mids, energy, drop }: MusicFeatures) {
  return drop > .46 && bass > .61 && energy > .38 && bass > mids * 1.16;
}

function cueFor(progress: number, duration: number, bpm: number, energy: number, bass: number, mids: number, highs: number, drop = 0, beatOffset = 0) {
  const beat = Math.max(0, progress * duration - beatOffset) * bpm / 60; const scene = Math.floor(beat / 32); let pattern = [1, 12, 4, 7, 13, 10, 14, 3, 4, 1, 7, 15, 10, 5, 14, 0][scene % 16]; let speed = .08; let section = "Intro";
  if (progress > .92) { pattern = 0; speed = .045 + energy * .08; section = "Outro"; }
  else if (drop > .52) { speed = .3 + energy * .2; section = "Impact"; }
  else if (energy > .64 || bass > .68) { speed = .22 + energy * .24 + highs * .08; section = progress < .58 ? "Drop I" : "Final drop"; }
  else if (energy < .26) { speed = .035 + energy * .09 + mids * .025; section = progress < .12 ? "Intro" : "Breakdown"; }
  else if (energy < .48) { speed = .09 + energy * .13; section = "Build"; }
  else { speed = .15 + energy * .17 + highs * .045; section = "Lift"; }
  return { pattern, speed, section, label: PATTERN_NAMES[pattern] };
}

function fixtureGate(showBeat: number, index: number, count: number, pattern: number, lights = false, style: RhythmStyle = "auto") {
  if (style === "open") return 1;
  const division = style === "strobe" ? 8 : lights ? 2 : 4; const step = Math.floor(showBeat * division); const beat = Math.floor(showBeat); const automatic = (pattern + Math.floor(showBeat / 8) + (lights ? 2 : 0)) % 6; const scene = style === "banks" ? 0 : style === "chase" ? 2 : style === "strobe" ? 5 : automatic; const mirror = Math.min(index, count - 1 - index);
  if (scene === 0) return (index < count / 2) === (step % 2 === 0) ? 1 : 0;
  if (scene === 1) return mirror % 4 === step % 4 ? 1 : 0;
  if (scene === 2) return index % 4 === step % 4 || (beat % 4 === 0 && index % 4 === (step + 2) % 4) ? 1 : 0;
  if (scene === 3) return (index + step) % 3 !== 0 && step % 4 !== 3 ? 1 : 0;
  if (scene === 4) return index % 2 === step % 2 || mirror === step % Math.max(1, Math.ceil(count / 2)) ? 1 : 0;
  return step % 8 < 5 ? 1 : 0;
}

function fixtureDensityGate(index: number, count: number, density: number) {
  const distance = Math.abs(index - (count - 1) / 2); return distance <= Math.max(.5, count * density * .5) ? 1 : 0;
}

function fixtureOrigin(index: number, count: number, layout: RigLayout, wash = false): [number, number, number] {
  const lane = index - (count - 1) / 2; const unit = index / count * Math.PI * 2;
  if (layout === "ring") return [Math.cos(unit) * (wash ? 3.2 : 3.8), 2.5 + Math.sin(unit) * (wash ? 1.15 : 1.55), -4.35 + Math.sin(unit) * .45];
  if (layout === "wings") { const side = index < count / 2 ? -1 : 1; const row = index % Math.ceil(count / 2); return [side * (4.15 + row * .2), 1.05 + row * .58, -2.8 - row * .48]; }
  if (layout === "floor") return [lane * (wash ? 1.05 : .72), .28 + (index % 2) * .16, -1.2 - (index % 3) * .72];
  const center = Math.max(0, 1 - Math.abs(lane) / Math.max(1, count * .24)); const depthBand = index % 3;
  return [lane * (wash ? 1.14 : .72), wash ? 4.42 : 4.08 + center * .7 + depthBand * .08, wash ? -4.48 : -2.38 - center * .82 - depthBand * .18];
}

function CameraRig({ preset }: { preset: CameraPreset }) {
  const { camera } = useThree();
  const target = useMemo(() => preset === "booth" ? new THREE.Vector3(0, 2.2, 7.2) : preset === "overhead" ? new THREE.Vector3(0, 10.5, 1.2) : new THREE.Vector3(0, 3.25, 9.2), [preset]);
  useFrame(() => { camera.position.lerp(target, .055); camera.lookAt(0, preset === "overhead" ? .2 : 2.05, -3.05); });
  return null;
}

function paletteFor(pattern: number) {
  const palettes = [
    ["#45ffe2", "#2a8cff", "#f5fbff"],
    ["#ff3d98", "#7458ff", "#44e9ff"],
    ["#ff5b3d", "#ffd84a", "#ff3b8d"],
    ["#55ffd0", "#ff4dc4", "#9a70ff"],
  ];
  return palettes[Math.floor(pattern / 3) % palettes.length];
}

function laserPathGeometry(shape: BeamShape, core = false) {
  if (shape === "straight") return core ? LASER_CORE : LASER_LINE;
  const points = Array.from({ length: 33 }, (_, index) => {
    const progress = index / 32; const distance = progress * 8.64; const fadeIn = Math.min(1, progress * 5); let x = 0; let z = 0;
    if (shape === "sine") x = Math.sin(progress * Math.PI * 5) * .19 * fadeIn;
    else if (shape === "helix") { const angle = progress * Math.PI * 8; x = Math.sin(angle) * .15 * fadeIn; z = Math.cos(angle) * .15 * fadeIn; }
    else { const phase = (progress * 8) % 2; x = ((phase < 1 ? phase : 2 - phase) * .38 - .19) * fadeIn; }
    return new THREE.Vector3(x, -distance, z);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, core ? .0028 : .008, core ? 5 : 7, false);
}

function LedWall({ position, rotation = [0, 0, 0], scale = [1, 1, 1], shape = "rect", energy, bass, mids, highs, impact, pattern, time, power }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number]; shape?: ScreenShape; energy: number; bass: number; mids: number; highs: number; impact: number; pattern: number; time: number; power: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const palette = paletteFor(pattern);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uEnergy: { value: 0 }, uBass: { value: 0 }, uMids: { value: 0 }, uHighs: { value: 0 }, uPattern: { value: 0 }, uPower: { value: 0 }, uImpact: { value: 0 },
    uA: { value: new THREE.Color("#45ffe2") }, uB: { value: new THREE.Color("#2a8cff") }, uC: { value: new THREE.Color("#f5fbff") },
  }), []);
  useFrame((_, delta) => {
    if (!material.current) return;
    const u = material.current.uniforms; const ease = 1 - Math.exp(-delta * 4.2);
    u.uTime.value = THREE.MathUtils.lerp(u.uTime.value, time, ease * .42);
    u.uEnergy.value = THREE.MathUtils.lerp(u.uEnergy.value, energy, ease);
    u.uBass.value = THREE.MathUtils.lerp(u.uBass.value, bass, ease);
    u.uMids.value = THREE.MathUtils.lerp(u.uMids.value, mids, ease);
    u.uHighs.value = THREE.MathUtils.lerp(u.uHighs.value, highs, ease);
    u.uImpact.value = THREE.MathUtils.lerp(u.uImpact.value, impact, 1 - Math.exp(-delta * 12));
    u.uPattern.value = THREE.MathUtils.lerp(u.uPattern.value, pattern, ease * .25);
    u.uPower.value = THREE.MathUtils.lerp(u.uPower.value, power, ease);
    u.uA.value.lerp(new THREE.Color(palette[0]), ease * .35); u.uB.value.lerp(new THREE.Color(palette[1]), ease * .35); u.uC.value.lerp(new THREE.Color(palette[2]), ease * .35);
  });
  return <group position={position} rotation={rotation} scale={scale}>
    <group rotation={shape === "diamond" ? [0, 0, Math.PI / 4] : undefined}>
      {shape === "circle" ? <><mesh position={[0, 0, -.08]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.36, 1.36, .18, 48]} /><meshStandardMaterial color="#111719" metalness={.78} roughness={.24} /></mesh><mesh renderOrder={3} position={[0, 0, .025]}><circleGeometry args={[1.23, 64]} /><shaderMaterial ref={material} uniforms={uniforms} vertexShader={LED_VERTEX} fragmentShader={LED_FRAGMENT} toneMapped={false} depthTest={false} /></mesh></> : <><mesh position={[0, 0, -.08]}><boxGeometry args={[5.08, 2.68, .18]} /><meshStandardMaterial color="#111719" metalness={.78} roughness={.24} /></mesh><mesh renderOrder={3} position={[0, 0, .025]}><planeGeometry args={[4.82, 2.42, 1, 1]} /><shaderMaterial ref={material} uniforms={uniforms} vertexShader={LED_VERTEX} fragmentShader={LED_FRAGMENT} toneMapped={false} depthTest={false} /></mesh><mesh position={[0, -1.4, -.02]}><boxGeometry args={[5.18, .08, .22]} /><meshStandardMaterial color="#252e30" metalness={.92} roughness={.18} /></mesh></>}
    </group>
  </group>;
}

function VjWall({ src, position, rotation = [0, 0, 0], scale = [1, 1, 1], shape = "rect", playing, speed, impact, power }: { src: string; position: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number]; shape?: ScreenShape; playing: boolean; speed: number; impact: number; power: number }) {
  const texture = useVideoTexture(src, { muted: true, loop: true, playsInline: true, start: playing }); const surface = useRef<THREE.MeshBasicMaterial>(null); const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => { const video = texture.image as HTMLVideoElement; videoRef.current = video; if (playing) void video.play().catch(() => undefined); else video.pause(); return () => { videoRef.current = null; }; }, [playing, texture]);
  useFrame((_, delta) => { if (videoRef.current) videoRef.current.playbackRate = THREE.MathUtils.clamp(.55 + speed * 1.8 + impact * .35, .5, 1.5); if (surface.current) { const target = Math.min(1, .72 + power * .18 + impact * .25); surface.current.opacity = THREE.MathUtils.lerp(surface.current.opacity, target, 1 - Math.exp(-delta * 9)); } });
  return <group position={position} rotation={rotation} scale={scale}><group rotation={shape === "diamond" ? [0, 0, Math.PI / 4] : undefined}>
    {shape === "circle" ? <><mesh position={[0, 0, -.08]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.36, 1.36, .18, 48]} /><meshStandardMaterial color="#111719" metalness={.78} roughness={.24} /></mesh><mesh renderOrder={3} position={[0, 0, .025]}><circleGeometry args={[1.23, 64]} /><meshBasicMaterial ref={surface} map={texture} color="#ffffff" transparent opacity={.85} toneMapped={false} depthTest={false} /></mesh></> : <><mesh position={[0, 0, -.08]}><boxGeometry args={[5.08, 2.68, .18]} /><meshStandardMaterial color="#111719" metalness={.78} roughness={.24} /></mesh><mesh renderOrder={3} position={[0, 0, .025]}><planeGeometry args={[4.82, 2.42]} /><meshBasicMaterial ref={surface} map={texture} color="#ffffff" transparent opacity={.85} toneMapped={false} depthTest={false} /></mesh></>}
  </group></group>;
}

function ScreenPracticalLights({ screen, color, energy, impact, power }: { screen: ScreenSpec; color: string; energy: number; impact: number; power: number }) {
  const intensity = Math.min(1, (.24 + energy * .62 + impact * .45) * power);
  const points = useMemo(() => {
    if (screen.shape === "circle") return Array.from({ length: 18 }, (_, index) => { const angle = index / 18 * Math.PI * 2; return [Math.cos(angle) * 1.48, Math.sin(angle) * 1.48, .13] as [number, number, number]; });
    const topBottom = Array.from({ length: 10 }, (_, index) => -2.28 + index * .507).flatMap((x) => [[x, 1.34, .13], [x, -1.34, .13]] as [number, number, number][]);
    const sides = [-.72, 0, .72].flatMap((y) => [[-2.48, y, .13], [2.48, y, .13]] as [number, number, number][]);
    return [...topBottom, ...sides];
  }, [screen.shape]);
  return <group position={screen.position} rotation={screen.rotation} scale={screen.scale}><group rotation={screen.shape === "diamond" ? [0, 0, Math.PI / 4] : undefined}>
    {screen.shape === "circle" ? <><mesh position={[0, 0, .035]}><torusGeometry args={[1.48, .026, 8, 64]} /><meshStandardMaterial color="#242b2d" metalness={.92} roughness={.18} /></mesh><mesh position={[0, 0, .055]}><torusGeometry args={[1.48, .008, 6, 64]} /><meshBasicMaterial color={color} transparent opacity={.25 + intensity * .38} toneMapped={false} /></mesh></> : <><mesh position={[0, 1.34, .035]}><boxGeometry args={[5.02, .065, .09]} /><meshStandardMaterial color="#242b2d" metalness={.92} roughness={.18} /></mesh><mesh position={[0, -1.34, .035]}><boxGeometry args={[5.02, .065, .09]} /><meshStandardMaterial color="#242b2d" metalness={.92} roughness={.18} /></mesh><mesh position={[-2.48, 0, .035]}><boxGeometry args={[.065, 2.62, .09]} /><meshStandardMaterial color="#242b2d" metalness={.92} roughness={.18} /></mesh><mesh position={[2.48, 0, .035]}><boxGeometry args={[.065, 2.62, .09]} /><meshStandardMaterial color="#242b2d" metalness={.92} roughness={.18} /></mesh></>}
    {points.map((point, index) => <group key={index} position={point}><mesh position={[0, 0, -.025]}><cylinderGeometry args={[.062, .072, .055, 10]} /><meshStandardMaterial color="#0a0d0e" metalness={.9} roughness={.2} /></mesh><mesh position={[0, 0, .018]}><sphereGeometry args={[.038, 10, 8]} /><meshBasicMaterial color={index % 3 === 0 ? "#ffffff" : color} transparent opacity={.38 + intensity * .62} toneMapped={false} /></mesh></group>)}
    <pointLight position={[0, 0, .7]} color={color} intensity={intensity * .42} distance={4.2} decay={2.25} />
  </group></group>;
}

function LaserCone({ color, index, origin, energy, bass, mids, highs, impact, spread, intensity, motion, time, songTime, pattern, speed, gate, beamWidth, beamShape, upward = false }: { color: string; index: number; origin: [number, number, number]; energy: number; bass: number; mids: number; highs: number; impact: number; spread: number; intensity: number; motion: number; time: number; songTime: number; pattern: number; speed: number; gate: number; beamWidth: number; beamShape: BeamShape; upward?: boolean }) {
  const group = useRef<THREE.Group>(null); const beamPath = useRef<THREE.Group>(null); const beam = useRef<THREE.Mesh>(null); const line = useRef<THREE.Mesh>(null); const core = useRef<THREE.Mesh>(null);
  const lineGeometry = useMemo(() => laserPathGeometry(beamShape), [beamShape]); const coreGeometry = useMemo(() => laserPathGeometry(beamShape, true), [beamShape]);
  useEffect(() => () => { if (beamShape !== "straight") { lineGeometry.dispose(); coreGeometry.dispose(); } }, [beamShape, lineGeometry, coreGeometry]);
  const smooth = useRef({ energy: 0, bass: 0, mids: 0, highs: 0 });
  const phase = useRef(time); const easedSpeed = useRef(0); const easedGate = useRef(gate); const previousTime = useRef(time);
  useFrame((_, delta) => {
    if (!group.current || !beam.current || !line.current || !core.current) return;
    const audioEase = 1 - Math.exp(-delta * 6); smooth.current.energy = THREE.MathUtils.lerp(smooth.current.energy, energy, audioEase); smooth.current.bass = THREE.MathUtils.lerp(smooth.current.bass, bass, audioEase); smooth.current.mids = THREE.MathUtils.lerp(smooth.current.mids, mids, audioEase); smooth.current.highs = THREE.MathUtils.lerp(smooth.current.highs, highs, audioEase); const se = smooth.current.energy; const sb = smooth.current.bass; const sm = smooth.current.mids; const sh = smooth.current.highs;
    if (Math.abs(time - previousTime.current) > 1.2) phase.current = time; previousTime.current = time;
    easedSpeed.current = THREE.MathUtils.lerp(easedSpeed.current, speed, 1 - Math.exp(-delta * 1.65)); phase.current += Math.min(delta, .05) * easedSpeed.current;
    const motionPhase = phase.current; const side = index % 2 ? 1 : -1; const lane = (index - 5.5) / 5.5; let tx = -.25; let ty = 0; let tz = 0;
    if (beamPath.current) beamPath.current.rotation.y = beamShape === "straight" ? 0 : motionPhase * (beamShape === "helix" ? .72 : .34) + index * .22;
    const layoutEase = 1 - Math.exp(-delta * 2.4); group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, origin[0], layoutEase); group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, origin[1], layoutEase); group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, origin[2], layoutEase);
    if (pattern === 0) { tz = lane * spread * .7; tx = -.16 - Math.abs(lane) * .18; ty = Math.sin(motionPhase * .28) * .08; }
    else if (pattern === 1) { tz = -lane * spread * .84 + Math.sin(motionPhase * .62 + index * .3) * .07; tx = -.32 + side * .1; ty = lane * .2; }
    else if (pattern === 2) { tz = side * (.38 + Math.sin(motionPhase * .34) * .23); tx = -.2 + Math.cos(motionPhase * .44 + index) * .12; ty = lane * .36; }
    else if (pattern === 3) { tz = side * (.16 + Math.sin(motionPhase * (1.1 + sh) + index * .72) * (.15 + spread * .3)); tx = -.28 + Math.cos(motionPhase * (.66 + sm) + index * .43) * (.1 + spread * .17); ty = lane * .18 + Math.sin(motionPhase * .4 + index) * spread * .14; }
    else if (pattern === 4) { const bank = index % 4; tz = -lane * (.48 + spread * .32) + (bank < 2 ? -1 : 1) * Math.sin(motionPhase * .25 + Math.floor(index / 2)) * .1; tx = -.12 - Math.abs(lane) * .12; ty = (bank % 2 ? 1 : -1) * (.08 + Math.abs(lane) * .16); }
    else if (pattern === 5) { tz = Math.sin(motionPhase * .32) * .5 + lane * .12; tx = -.34 + Math.cos(motionPhase * .21 + index * .08) * .06; ty = side * .12; }
    else if (pattern === 6) { tz = Math.sin(motionPhase * .36 + index * .52) * .46; tx = -.26 + Math.cos(motionPhase * .36 + index * .52) * .17; ty = lane * .28 + Math.sin(motionPhase * .2) * .08; }
    else if (pattern === 7) { const chase = Math.sin(motionPhase * .58 + Math.floor(index / 2) * .92); tz = -lane * (.36 + spread * .42) + side * chase * .17; tx = -.27 + Math.cos(motionPhase * .34 + index * .9) * .09; ty = side * (.12 + chase * .16); }
    else if (pattern === 8) { tz = (index < 6 ? -1 : 1) * (Math.abs(lane) * .32 + .08); tx = -.18 - (1 - Math.abs(lane)) * .28; ty = side * .18; }
    else if (pattern === 9) { const spoke = index / 12 * Math.PI * 2; tz = Math.sin(spoke) * .62; tx = -.24 + Math.cos(spoke * 2 + motionPhase * .12) * .22; ty = Math.cos(spoke) * .48; }
    else if (pattern === 10) { const crown = .68 - Math.abs(lane) * .2; tz = -lane * crown + Math.sin(motionPhase * .22 + index * .48) * .07; tx = -.08 - (1 - Math.abs(lane)) * .42 + Math.sin(motionPhase * .2 + index) * .04; ty = side * (Math.abs(lane) * .22 + .06); }
    else if (pattern === 11) { const orbit = motionPhase * .18 + index / 12 * Math.PI * 2; tz = Math.sin(orbit) * .58; tx = -.25 + Math.cos(orbit) * .18; ty = Math.cos(orbit) * .58; }
    else if (pattern === 12) { const weave = Math.sin(motionPhase * .34 + index * .86); tz = -lane * .34 + weave * (.2 + spread * .18); tx = -.24 + Math.cos(motionPhase * .27 + index * .41) * .14; ty = Math.sin(motionPhase * .19 + index * 1.3) * .34; }
    else if (pattern === 13) { const iris = motionPhase * .2 + index / 12 * Math.PI * 2; tz = Math.sin(iris) * (.28 + spread * .38); tx = -.22 + Math.cos(iris * 2) * .2; ty = Math.cos(iris) * (.24 + spread * .28); }
    else if (pattern === 14) { const step = Math.sin(motionPhase * .52 + Math.floor(index / 2) * 1.15); tz = -lane * .52 + side * step * .2; tx = -.18 - Math.abs(step) * .2; ty = side * step * .28; }
    else if (pattern === 15) { const braid = motionPhase * .29 + index * .78; tz = Math.sin(braid) * .55 - lane * .2; tx = -.26 + Math.cos(braid * 1.37) * .2; ty = Math.sin(braid * .63 + side) * .42; }
    else if (pattern === 16) { const sway = Math.sin(songTime * (.62 + sb * .5)) * (.58 + spread * .28); tz = sway; tx = -.2 - sb * .13 + Math.cos(songTime * .24) * .035; ty = Math.sin(songTime * .31) * .045; }
    else if (pattern === 17) { const arch = Math.sin(index / 11 * Math.PI); tz = lane * .76; tx = -.08 - arch * .52; ty = side * arch * .24; }
    else if (pattern === 18) { const hit = Math.sin(motionPhase * .62 - Math.abs(lane) * 2.2); tz = lane * (.28 + spread * .58); tx = -.2 - hit * .24; ty = side * hit * .4; }
    else if (pattern === 19) { const vortex = motionPhase * .32 + Math.abs(lane) * 3.4; tz = Math.sin(vortex) * (.25 + Math.abs(lane) * .42); tx = -.26 + Math.cos(vortex) * .22; ty = side * Math.cos(vortex * .7) * .38; }
    else if (pattern === 20) { const snake = Math.sin(motionPhase * .48 + index * .72); tz = lane * .28 + snake * .48; tx = -.2 + Math.cos(motionPhase * .31 + index * .5) * .24; ty = Math.sin(motionPhase * .22 + index) * .5; }
    else { const collapse = Math.max(0, Math.sin(motionPhase * .26)); tz = lane * (.72 - collapse * .58); tx = -.08 - collapse * .54; ty = side * (1 - collapse) * .42; }
    tx = -.25 + (tx + .25) * motion; ty *= motion; tz *= motion;
    const identity = index * 1.618; const detail = pattern === 16 ? 0 : (.018 + sm * .028 + sh * .018) * motion;
    tx += Math.sin(motionPhase * (.17 + index % 3 * .027) + identity) * detail;
    ty += Math.cos(motionPhase * (.13 + index % 4 * .021) + identity * .7) * detail * 1.55;
    tz += Math.sin(motionPhase * (.1 + index % 5 * .019) + identity * 1.3) * detail * 1.8;
    const subFocus = THREE.MathUtils.clamp((sb - sm * .48 - sh * .18) * 2.35, 0, 1); const sharedSway = Math.sin(songTime * (.38 + sb * .42)) * subFocus * (.22 + spread * .34) * motion;
    tz += sharedSway; if (pattern !== 16) ty += Math.cos(motionPhase * .17) * subFocus * .055; tx -= Math.abs(sharedSway) * subFocus * .06;
    const easing = 1 - Math.exp(-delta * (1.45 + easedSpeed.current * 1.7)); group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, tx, easing); group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, ty, easing); group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, tz, easing);
    easedGate.current = THREE.MathUtils.lerp(easedGate.current, impact > .58 ? 1 : gate, 1 - Math.exp(-delta * (gate ? 34 : 21))); const live = easedGate.current;
    const material = beam.current.material as THREE.MeshBasicMaterial; material.opacity = Math.min(.19, (.018 + se * .07 + (index % 3 === 0 ? sb * .028 : sh * .024) + impact * .055) * intensity) * live;
    beam.current.scale.x = beam.current.scale.z = (.34 + se * .14 + impact * .05) * beamWidth;
    line.current.scale.x = line.current.scale.z = beamWidth; core.current.scale.x = core.current.scale.z = .8 + beamWidth * .2;
    (line.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, (.72 + se * .38 + sh * .18 + impact * .28) * intensity) * live;
    (core.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, (.9 + se * .3 + impact * .2) * intensity) * live;
  });
  return <group ref={group} position={origin}>
    <mesh position={[0, upward ? -.12 : .12, 0]}><cylinderGeometry args={[.19, .21, .12, 16]} /><meshStandardMaterial color="#080b0c" metalness={.88} roughness={.24} /></mesh>
    <mesh position={[-.16, 0, 0]}><boxGeometry args={[.035, .28, .08]} /><meshStandardMaterial color="#252b2c" metalness={.9} roughness={.2} /></mesh><mesh position={[.16, 0, 0]}><boxGeometry args={[.035, .28, .08]} /><meshStandardMaterial color="#252b2c" metalness={.9} roughness={.2} /></mesh>
    <mesh geometry={LASER_BODY} rotation={[upward ? 0 : Math.PI, 0, 0]}><meshStandardMaterial color="#111719" metalness={.9} roughness={.18} /></mesh>
    <group rotation={upward ? [0, 0, Math.PI] : [0, 0, 0]}>
      <mesh geometry={LASER_LENS} position={[0, -.17, 0]} rotation={[Math.PI / 2, 0, 0]}><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <mesh geometry={LASER_VOLUME} ref={beam} position={[0, -4.08, 0]}><meshBasicMaterial color={color} transparent opacity={.08} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      <group ref={beamPath}>
        <mesh geometry={lineGeometry} ref={line} position={beamShape === "straight" ? [0, -4.48, 0] : undefined} renderOrder={4}><meshBasicMaterial color={color} transparent opacity={.96} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} /></mesh>
        <mesh geometry={coreGeometry} ref={core} position={beamShape === "straight" ? [0, -4.48, 0] : undefined} renderOrder={5}><meshBasicMaterial color="#ffffff" transparent opacity={1} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} /></mesh>
      </group>
    </group>
  </group>;
}

function WashFixture({ index, color, origin, energy, bass, intensity, time, speed, gate, movement }: { index: number; color: string; origin: [number, number, number]; energy: number; bass: number; intensity: number; time: number; speed: number; gate: number; movement: number }) {
  const group = useRef<THREE.Group>(null); const spill = useRef<THREE.Mesh>(null);
  const smooth = useRef({ energy: 0, bass: 0 }); const easedGate = useRef(gate);
  useFrame((state, delta) => { if (!group.current || !spill.current) return; const audioEase = 1 - Math.exp(-delta * 4.5); smooth.current.energy = THREE.MathUtils.lerp(smooth.current.energy, energy, audioEase); smooth.current.bass = THREE.MathUtils.lerp(smooth.current.bass, bass, audioEase); easedGate.current = THREE.MathUtils.lerp(easedGate.current, gate, 1 - Math.exp(-delta * (gate ? 24 : 15))); const phase = time + state.clock.elapsedTime * speed * .72; const ease = 1 - Math.exp(-delta * 1.8); group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, origin[0], ease); group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, origin[1], ease); group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, origin[2], ease); group.current.rotation.z = Math.sin(phase * (.42 + index % 3 * .08) + index * 1.2) * (.18 + movement * .52); group.current.rotation.x = -.48 + Math.cos(phase * (.27 + index % 2 * .07) + index) * (.08 + movement * .3); group.current.rotation.y = Math.sin(phase * .21 + index * .7) * movement * .34; (spill.current.material as THREE.MeshBasicMaterial).opacity = Math.min(.18, (.018 + smooth.current.energy * .085 + smooth.current.bass * .055) * intensity) * easedGate.current; });
  return <group ref={group} position={origin}><mesh position={[0, .12, 0]}><cylinderGeometry args={[.18, .2, .12, 16]} /><meshStandardMaterial color="#080b0c" metalness={.88} roughness={.24} /></mesh><mesh position={[-.15, 0, 0]}><boxGeometry args={[.035, .3, .08]} /><meshStandardMaterial color="#272d2e" metalness={.9} roughness={.2} /></mesh><mesh position={[.15, 0, 0]}><boxGeometry args={[.035, .3, .08]} /><meshStandardMaterial color="#272d2e" metalness={.9} roughness={.2} /></mesh><mesh geometry={WASH_BODY}><meshStandardMaterial color="#15191a" metalness={.86} roughness={.2} /></mesh><mesh position={[0, -.12, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[.08, 18]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh><mesh geometry={WASH_VOLUME} ref={spill} position={[0, -3.2, 0]}><meshBasicMaterial color={color} transparent opacity={.06} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh></group>;
}

function Truss({ position, scale = [1, 1, 1], vertical = false }: { position: [number, number, number]; scale?: [number, number, number]; vertical?: boolean }) {
  return <group position={position} scale={scale} rotation={vertical ? [0, 0, Math.PI / 2] : undefined}>
    {[-.16, .16].flatMap((y) => [-.16, .16].map((z) => <mesh key={`${y}-${z}`} position={[0, y, z]}><boxGeometry args={[2, .035, .035]} /><meshStandardMaterial color="#576164" metalness={.96} roughness={.16} /></mesh>))}
    {Array.from({ length: 7 }, (_, i) => <group key={i} position={[-.9 + i * .3, 0, 0]}><mesh rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[.025, .46, .025]} /><meshStandardMaterial color="#3b4547" metalness={.9} roughness={.2} /></mesh><mesh rotation={[Math.PI / 4, 0, 0]}><boxGeometry args={[.025, .025, .46]} /><meshStandardMaterial color="#3b4547" metalness={.9} roughness={.2} /></mesh></group>)}
  </group>;
}

function SpeakerStack({ x }: { x: number }) {
  return <group position={[x, 2.25, -4.5]} rotation={[0, x < 0 ? -.13 : .13, x < 0 ? -.035 : .035]}>
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[0, -i * .48, i * .045]}><boxGeometry args={[.62, .42, .52]} /><meshStandardMaterial color="#080b0c" metalness={.18} roughness={.82} /><mesh position={[0, 0, .27]}><circleGeometry args={[.14, 18]} /><meshStandardMaterial color="#151b1c" roughness={.9} /></mesh></mesh>)}
  </group>;
}

function DimensionalFloor({ pattern, color, energy, bass, power, depth }: { pattern: FloorPattern; color: string; energy: number; bass: number; power: number; depth: number }) {
  const lines = Array.from({ length: 17 }, (_, index) => index - 8); const rings = Array.from({ length: 7 }, (_, index) => .8 + index * .82);
  return <group position={[0, -.025, -.6]}>
    <mesh position={[0, -.16 - depth * .14, 0]}><boxGeometry args={[15.8, .3 + depth * .32, 13.6]} /><meshStandardMaterial color="#05090a" roughness={.42} metalness={.58} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[15.7, 13.5, 24, 24]} /><meshPhysicalMaterial color="#071011" roughness={.28} metalness={.68} clearcoat={.7} clearcoatRoughness={.2} /></mesh>
    {pattern === "grid" && <>{lines.map((line) => <mesh key={`gx-${line}`} position={[line * .88, .012 + Math.abs(line % 2) * depth * .025, 0]}><boxGeometry args={[.018 + energy * .025, .018, 13.2]} /><meshBasicMaterial color={color} transparent opacity={(.08 + energy * .28) * power} toneMapped={false} /></mesh>)}{lines.map((line) => <mesh key={`gz-${line}`} position={[0, .014 + Math.abs(line % 3) * depth * .02, line * .72]}><boxGeometry args={[15.4, .018, .018 + bass * .035]} /><meshBasicMaterial color={color} transparent opacity={(.06 + bass * .3) * power} toneMapped={false} /></mesh>)}</>}
    {pattern === "rings" && rings.map((radius, index) => <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, .02 + index * depth * .014, 0]}><ringGeometry args={[radius, radius + .025 + bass * .04, 96]} /><meshBasicMaterial color={index % 2 ? "#ffffff" : color} transparent opacity={(.08 + energy * .32) * power} toneMapped={false} /></mesh>)}
    {pattern === "chevrons" && Array.from({ length: 11 }, (_, index) => <group key={index} position={[0, .02 + index * depth * .012, -5.8 + index * 1.08]}><mesh position={[-2.7, 0, 0]} rotation={[0, .48, 0]}><boxGeometry args={[6.2, .022, .035 + bass * .05]} /><meshBasicMaterial color={color} transparent opacity={(.09 + energy * .34) * power} toneMapped={false} /></mesh><mesh position={[2.7, 0, 0]} rotation={[0, -.48, 0]}><boxGeometry args={[6.2, .022, .035 + bass * .05]} /><meshBasicMaterial color={color} transparent opacity={(.09 + energy * .34) * power} toneMapped={false} /></mesh></group>)}
    {pattern === "circuit" && lines.map((line, index) => <group key={line} position={[line * .84, .025 + index % 4 * depth * .018, 0]}><mesh><boxGeometry args={[.025, .024, 10.8 - index % 5 * .6]} /><meshBasicMaterial color={color} transparent opacity={(.1 + energy * .3) * power} toneMapped={false} /></mesh>{[-1, 1].map((side) => <mesh key={side} position={[side * .24, 0, (index % 5 - 2) * 1.15]}><boxGeometry args={[.48, .022, .025]} /><meshBasicMaterial color="#ffffff" transparent opacity={(.08 + bass * .36) * power} toneMapped={false} /></mesh>)}</group>)}
    {Array.from({ length: 5 }, (_, index) => <mesh key={index} position={[0, .05 + index * depth * .055, -4.2 + index * 1.7]}><boxGeometry args={[3.4 + index * .72, .08 + depth * .08, .85]} /><meshStandardMaterial color="#0a1112" roughness={.35} metalness={.64} emissive={color} emissiveIntensity={power * energy * .08} /></mesh>)}
  </group>;
}

function StageArchitecture({ preset }: { preset: StagePreset }) {
  return <group>
    <mesh position={[0, -.2, -1.2]}><boxGeometry args={[16, .28, 14]} /><meshStandardMaterial color="#050708" roughness={.84} metalness={.18} /></mesh>
    <mesh position={[0, .28, -4.25]}><boxGeometry args={[13.2, .64, 3.45]} /><meshStandardMaterial color="#090c0d" roughness={.58} metalness={.42} /></mesh>
    {[-1, 1].map((side) => <group key={`depth-wing-${side}`} position={[side * 5.25, 2.1, -4.35]} rotation={[0, side * -.18, 0]}><mesh><boxGeometry args={[1.25, 4.1, 1.45]} /><meshStandardMaterial color="#0a0f10" roughness={.46} metalness={.58} /></mesh><mesh position={[side * -.66, .2, .48]} rotation={[0, side * .34, 0]}><boxGeometry args={[.16, 3.35, 2.25]} /><meshStandardMaterial color="#222c2e" roughness={.24} metalness={.86} /></mesh></group>)}
    {[0, 1, 2].map((level) => <mesh key={`center-riser-${level}`} position={[0, .58 + level * .34, -3.65 - level * .5]}><boxGeometry args={[4.4 - level * .68, .24, 1.15]} /><meshStandardMaterial color={level === 2 ? "#141d1f" : "#0b1112"} roughness={.38} metalness={.62} /></mesh>)}
    {[2.1, 2.72, 3.34].map((radius, index) => <mesh key={`center-depth-ring-${radius}`} position={[0, 2.85, -5.1 - index * .2]} rotation={[0, 0, index % 2 ? .14 : -.14]}><torusGeometry args={[radius, .038 + index * .012, 10, 72]} /><meshStandardMaterial color="#3d4a4c" metalness={.94} roughness={.14} /></mesh>)}
    <mesh position={[0, .24, -1.3]}><boxGeometry args={[3.25, .46, 5.2]} /><meshStandardMaterial color="#0b0f10" roughness={.5} metalness={.48} /></mesh>
    <mesh position={[0, .5, -3.45]}><boxGeometry args={[2.45, .82, 1.35]} /><meshStandardMaterial color="#111617" roughness={.34} metalness={.62} /></mesh>
    <mesh position={[0, 5.12, -3.65]}><boxGeometry args={[13.8, .3, 4.2]} /><meshStandardMaterial color="#090c0d" roughness={.62} metalness={.48} /></mesh>
    <mesh position={[-6.72, 2.58, -4.3]}><boxGeometry args={[.48, 5.05, 2.65]} /><meshStandardMaterial color="#07090a" roughness={.7} metalness={.36} /></mesh><mesh position={[6.72, 2.58, -4.3]}><boxGeometry args={[.48, 5.05, 2.65]} /><meshStandardMaterial color="#07090a" roughness={.7} metalness={.36} /></mesh>
    <mesh position={[0, 2.55, -5.68]}><boxGeometry args={[13.25, 4.75, .22]} /><meshStandardMaterial color="#020304" roughness={.86} /></mesh>
    {[-1.1, -.55, 0, .55, 1.1].map((z, index) => <mesh key={z} position={[0, .06 + index * .045, 1.15 + z * .42]}><boxGeometry args={[3.25 - index * .16, .12, .48]} /><meshStandardMaterial color="#121718" roughness={.48} metalness={.5} /></mesh>)}
    {preset === "prism" && <>{[-1, 1].map((side) => <group key={side} position={[side * 4.9, 2.25, -3.9]} rotation={[0, 0, side * -.22]}>{Array.from({ length: 3 }, (_, index) => <mesh key={index} position={[side * index * .34, index * .7, 0]} rotation={[0, 0, side * -.48]}><boxGeometry args={[.16, 4.8 - index * .55, .3]} /><meshStandardMaterial color="#263234" metalness={.9} roughness={.16} /></mesh>)}</group>)}</>}
    {preset === "bunker" && <>{[-5.5, -3.7, 3.7, 5.5].map((x) => <mesh key={x} position={[x, 1.45, -4.65]} rotation={[0, 0, x < 0 ? -.1 : .1]}><boxGeometry args={[1.15, 2.9, 1.45]} /><meshStandardMaterial color="#11191a" metalness={.52} roughness={.58} /></mesh>)}</>}
    {preset === "halo" && <>{[2.2, 3.35, 4.5].map((radius) => <mesh key={radius} position={[0, 2.8, -4.82]}><torusGeometry args={[radius, .065, 12, 96]} /><meshStandardMaterial color="#344244" metalness={.94} roughness={.12} /></mesh>)}</>}
    <mesh position={[0, .15, 2.65]}><boxGeometry args={[14.2, .08, .08]} /><meshStandardMaterial color="#656d6f" metalness={.95} roughness={.18} /></mesh>
    {Array.from({ length: 12 }, (_, index) => <mesh key={index} position={[(index - 5.5) * 1.15, .5, 2.65]}><cylinderGeometry args={[.025, .025, .7, 8]} /><meshStandardMaterial color="#4b5355" metalness={.94} roughness={.2} /></mesh>)}
  </group>;
}

function Audience() {
  return <group>{Array.from({ length: 42 }, (_, index) => { const row = Math.floor(index / 14); const column = index % 14; const x = (column - 6.5) * .86 + (row % 2) * .28; const z = 3.4 + row * 1.02 + Math.sin(index * 2.17) * .18; const height = .7 + (index % 5) * .055; return <group key={index} position={[x, height * .44, z]}><mesh position={[0, height * .42, 0]}><sphereGeometry args={[.13 + index % 3 * .012, 10, 8]} /><meshStandardMaterial color="#030405" roughness={.96} /></mesh><mesh><cylinderGeometry args={[.16, .22, height, 8]} /><meshStandardMaterial color={index % 7 === 0 ? "#0d1213" : "#050708"} roughness={.92} /></mesh></group>; })}</group>;
}

function BeatDeck({ beat, downbeat, color }: { beat: number; downbeat: number; color: string }) {
  return <group position={[0, .035, -1.15]} rotation={[-Math.PI / 2, 0, 0]}>
    {[1.7, 3.1, 4.7].map((radius, index) => <mesh key={radius} scale={[1 + beat * (.08 + index * .035), 1 + beat * (.08 + index * .035), 1]}><ringGeometry args={[radius - .018, radius + .018, 64]} /><meshBasicMaterial color={index === 1 ? "#ffffff" : color} transparent opacity={(beat * .34 + downbeat * .28) * (1 - index * .18)} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>)}
    <pointLight position={[0, 0, 1.2]} color={color} intensity={downbeat * .9} distance={8} decay={2.4} />
  </group>;
}

function LaserStage({ bands, progress, duration, playing, bpm, beatOffset, spread, intensity, lighting, haze, ledPower, motion, density, rhythmStyle, patternOverride, blackout, layout, screenLayout, screenContent, selectedVj, layer, laserColors, lightColors, beamWidth, beamShape, stagePreset, floorPattern, floorPower, floorDepth, lightMovement, zonePatterns }: { bands: Bands; progress: number; duration: number; playing: boolean; bpm: number; beatOffset: number; spread: number; intensity: number; lighting: number; haze: number; ledPower: number; motion: number; density: number; rhythmStyle: RhythmStyle; patternOverride: number | null; blackout: boolean; layout: RigLayout; screenLayout: ScreenLayout; screenContent: Exclude<ScreenContent, "auto">; selectedVj: string | null; layer: ShowLayer; laserColors: string[]; lightColors: string[]; beamWidth: number; beamShape: BeamShape; stagePreset: StagePreset; floorPattern: FloorPattern; floorPower: number; floorDepth: number; lightMovement: number; zonePatterns: Record<LaserZone, number | null> }) {
  const localTime = useRef(progress * duration); const previousProgress = useRef(progress); const stage = useRef<THREE.Group>(null);
  useEffect(() => { if (Math.abs(progress - previousProgress.current) > .002 || !playing) localTime.current = progress * duration; previousProgress.current = progress; }, [progress, duration, playing]);
  useFrame((_, delta) => { if (playing) localTime.current += Math.min(delta, .05); if (stage.current) stage.current.position.y = Math.sin(localTime.current * (bpm / 60) * Math.PI) * .025; });
  const features = featuresAt(bands, progress); const { energy, bass, mids, highs, transient, drop } = features; const impact = Math.max(drop, transient * .72); const cue = cueFor(progress, duration, bpm, energy, bass, mids, highs, drop, beatOffset); const pattern = patternOverride ?? (isSubDrop(features) ? 16 : cue.pattern);
  const showBeat = Math.max(0, progress * duration - beatOffset) * bpm / 60; const phraseRamp = (showBeat % 32) / 32; const phraseCurve = phraseRamp * phraseRamp * (3 - 2 * phraseRamp); const beatPhase = showBeat % 1; const beatHit = playing ? Math.pow(1 - beatPhase, 9) : 0; const downbeatHit = Math.floor(showBeat) % 4 === 0 ? beatHit : 0; const rhythmicImpact = Math.max(impact, beatHit * .34, downbeatHit * .72);
  const sectionMotion = cue.section === "Impact" ? 1.82 : cue.section.includes("drop") || cue.section === "Drop I" ? 1.36 : cue.section === "Build" ? .48 + phraseCurve * 1.42 : cue.section === "Lift" ? .98 : cue.section === "Breakdown" ? .34 : cue.section === "Outro" ? .28 : .42;
  const colors = laserColors.length ? laserColors : paletteFor(pattern); const lightPalette = lightColors.length ? lightColors : paletteFor(pattern + 2); const screens = screensFor(screenLayout); const mediaScene = Math.floor(showBeat / 64); const showLasers = layer === "all" || layer === "lasers"; const showLights = layer === "all" || layer === "lights"; const showScreens = layer === "all" || layer === "screens"; const zonePattern = (zone: LaserZone, fallback: number) => zonePatterns[zone] ?? fallback;
  const centerLasers = Array.from({ length: 12 }, (_, index) => { const column = index % 4; const row = Math.floor(index / 4); const lane = column - 1.5; const active = zonePattern(index < 6 ? "left" : "right", (pattern + 17 + row * 2) % PATTERN_NAMES.length); const arch = 1 - Math.abs(lane) / 1.5; return <LaserCone key={`center-crown-${index}`} index={index} beamWidth={beamWidth * (1.05 + row * .12)} beamShape={beamShape} origin={[lane * (.72 + row * .18), 3.05 + row * .62 + arch * .42, -3.28 - row * .72 - arch * .28]} color={colors[(index + 2) % colors.length]} energy={energy} bass={bass} mids={mids} highs={highs} impact={blackout ? 0 : rhythmicImpact} spread={spread * (.7 + row * .12)} intensity={intensity * (1.08 - row * .08)} motion={motion} time={progress * duration * .14 + index * .17} songTime={progress * duration} pattern={active} speed={playing ? cue.speed * sectionMotion * (.9 + row * .18) : 0} gate={blackout ? 0 : (playing ? fixtureGate(showBeat, index, 12, active, false, rhythmStyle) : 1) * fixtureDensityGate(index, 12, density)} upward={row === 0} />; });
  return <group ref={stage}>
    <ambientLight intensity={showLights ? .08 + lighting * .035 : .025} /><directionalLight position={[0, 8, 3]} intensity={showLights ? .16 + lighting * .08 : .04} color="#bce8e3" />
    {showLights && <><spotLight position={[-4.6, 5.4, .5]} color={lightPalette[0]} intensity={(.7 + energy * 2.1) * lighting * (blackout ? 0 : 1) * fixtureGate(showBeat, 0, 3, pattern, true, rhythmStyle)} angle={.3} penumbra={.82} distance={15} /><spotLight position={[4.6, 5.4, .5]} color={lightPalette[1 % lightPalette.length]} intensity={(.65 + mids * 1.9) * lighting * (blackout ? 0 : 1) * fixtureGate(showBeat, 1, 3, pattern, true, rhythmStyle)} angle={.3} penumbra={.82} distance={15} /><spotLight position={[0, 5.2, -4.6]} color={lightPalette[2 % lightPalette.length]} intensity={(.4 + bass * 1.5) * lighting * (blackout ? 0 : 1) * fixtureGate(showBeat, 2, 3, pattern, true, rhythmStyle)} angle={.42} penumbra={.9} distance={12} /></>}
    <StageArchitecture preset={stagePreset} /><DimensionalFloor pattern={floorPattern} color={colors[0]} energy={energy} bass={bass} power={blackout ? 0 : floorPower} depth={floorDepth} /><Audience />
    {!blackout && (showLasers || showLights) && <BeatDeck beat={beatHit} downbeat={downbeatHit} color={colors[pattern % colors.length]} />}
    {showScreens && screens.map((screen, index) => <group key={`${screenLayout}-screen-${index}`}>
      {screenContent === "vj-pack" ? <VjWall src={selectedVj || VJ_LOOPS[(mediaScene + index * 3) % VJ_LOOPS.length].src} position={screen.position} rotation={screen.rotation} scale={screen.scale} shape={screen.shape} playing={playing} speed={cue.speed * sectionMotion} impact={rhythmicImpact} power={ledPower} /> : <LedWall position={screen.position} rotation={screen.rotation} scale={screen.scale} shape={screen.shape} energy={energy} bass={bass} mids={mids} highs={highs} impact={rhythmicImpact} pattern={(pattern + screen.patternOffset) % 16} time={progress * duration + index * .65} power={ledPower * (index ? .9 : 1)} />}
      <ScreenPracticalLights screen={screen} color={lightPalette[(index + pattern) % lightPalette.length]} energy={energy} impact={rhythmicImpact} power={(blackout ? 0 : ledPower) * fixtureGate(showBeat, index, screens.length, pattern, true, rhythmStyle)} />
    </group>)}
    <Truss position={[0, 4.68, -4.5]} scale={[5.65, 1, 1]} /><Truss position={[0, 4.42, -2.55]} scale={[4.8, 1, 1]} />
    <Truss position={[-6.35, 2.55, -4.5]} scale={[2.45, 1, 1]} vertical /><Truss position={[6.35, 2.55, -4.5]} scale={[2.45, 1, 1]} vertical />
    <SpeakerStack x={-6.05} /><SpeakerStack x={6.05} />
    {showLasers && centerLasers}
    {showLasers && <>{Array.from({ length: 16 }, (_, index) => { const side: LaserZone = index < 8 ? "left" : "right"; const fallback = pattern === 16 ? 16 : CROSS_PATTERNS.includes(pattern) ? CROSS_PATTERNS[Math.floor(index / 4) % CROSS_PATTERNS.length] : (pattern + Math.floor(index / 4) * 3) % 16; const active = zonePattern(side, fallback); return <LaserCone key={`air-${index}`} index={index % 12} beamWidth={beamWidth} beamShape={beamShape} origin={fixtureOrigin(index, 16, layout)} color={colors[index % colors.length]} energy={energy} bass={bass} mids={mids} highs={highs} impact={blackout ? 0 : rhythmicImpact} spread={spread} intensity={intensity} motion={motion} time={progress * duration * .12 + index * .09} songTime={progress * duration} pattern={active} speed={playing ? cue.speed * sectionMotion * (.78 + index % 4 * .18) : 0} gate={blackout ? 0 : active === 16 ? 1 : (playing ? fixtureGate(showBeat, index, 16, active, false, rhythmStyle) : 1) * fixtureDensityGate(index, 16, density)} />; })}{Array.from({ length: 12 }, (_, index) => { const active = zonePattern("floor", pattern === 16 ? 16 : (pattern + 5 + Math.floor(index / 3)) % 16); return <LaserCone key={`floor-air-${index}`} index={index} beamWidth={beamWidth} beamShape={beamShape} origin={[(index - 5.5) * .95, .32, -1.75 - index % 3 * .58]} color={colors[(index + 1) % colors.length]} energy={energy} bass={bass} mids={mids} highs={highs} impact={blackout ? 0 : rhythmicImpact} spread={spread * .9} intensity={intensity * .92} motion={motion} time={progress * duration * .1 + index * .13} songTime={progress * duration} pattern={active} speed={playing ? cue.speed * sectionMotion * (.56 + index % 3 * .18) : 0} gate={blackout ? 0 : active === 16 ? 1 : (playing ? fixtureGate(showBeat, index, 12, active + 2, false, rhythmStyle) : 1) * fixtureDensityGate(index, 12, density)} upward />; })}</>}
    {showLights && <>{Array.from({ length: 12 }, (_, index) => <WashFixture key={`wash-${index}`} index={index} origin={fixtureOrigin(index, 12, layout, true)} color={lightPalette[(index + 1) % lightPalette.length]} energy={energy} bass={bass} intensity={lighting} time={progress * duration * cue.speed * .26} speed={playing ? cue.speed * (.2 + index % 3 * .04) : 0} movement={lightMovement} gate={blackout ? 0 : (playing ? fixtureGate(showBeat, index, 12, pattern, true, rhythmStyle) : 1) * fixtureDensityGate(index, 12, density)} />)}{Array.from({ length: 13 }, (_, index) => <mesh key={`bar-${index}`} position={[(index - 6) * .84, 2.15 + Math.sin(index * 1.8) * .38, -5.08]}><boxGeometry args={[.58, .055 + mids * .18, .05]} /><meshBasicMaterial color={lightPalette[(index + pattern) % lightPalette.length]} transparent opacity={Math.min(.72, (.08 + energy * .42 + (pattern === 3 ? highs * .2 : 0)) * lighting) * (blackout ? 0 : 1) * fixtureDensityGate(index, 13, density) * fixtureGate(showBeat, index, 13, pattern + 1, true, rhythmStyle)} blending={THREE.AdditiveBlending} /></mesh>)}<Sparkles count={Math.round(18 + haze * 58)} scale={[12, 5.5, 9]} position={[0, 2.4, -2]} size={.45 + highs * .8} speed={playing ? .08 + mids * .16 : 0} opacity={blackout ? 0 : .04 + haze * .1} color="#d5fff9" /></>}
  </group>;
}

export function LaserShowRenderer({ trackId, progress, duration, playing, bpm, onToggle }: { trackId: string; progress: number; duration: number; playing: boolean; bpm: number | null; onToggle: () => void }) {
  const reducedMotion = useReducedMotion(); const [bands, setBands] = useState<Bands>(EMPTY); const [beatOffset, setBeatOffset] = useState(0); const [preset, setPreset] = useState<CameraPreset>("arena"); const [rigChoice, setRigChoice] = useState<RigChoice>("auto"); const [screenChoice, setScreenChoice] = useState<ScreenChoice>("auto"); const [screenContent, setScreenContent] = useState<ScreenContent>("auto"); const [selectedVj, setSelectedVj] = useState<string | null>(null); const [laserColors, setLaserColors] = useState<string[]>([]); const [lightColors, setLightColors] = useState<string[]>([]); const [stagePreset, setStagePreset] = useState<StagePreset>("festival"); const [rhythmStyle, setRhythmStyle] = useState<RhythmStyle>("auto"); const [patternOverride, setPatternOverride] = useState<number | null>(null); const [blackout, setBlackout] = useState(false); const [motionAmount, setMotionAmount] = useState(1); const [fixtureDensity, setFixtureDensity] = useState(1); const [layer, setLayer] = useState<ShowLayer>("all"); const [expanded, setExpanded] = useState(false); const [intensity, setIntensity] = useState(.82); const [lighting, setLighting] = useState(.76); const [spread, setSpread] = useState(.68); const [haze, setHaze] = useState(.55); const [ledPower, setLedPower] = useState(.86); const [error, setError] = useState("");
  const [beamWidth, setBeamWidth] = useState(1); const [beamShape, setBeamShape] = useState<BeamShape>("straight");
  const [floorPattern, setFloorPattern] = useState<FloorPattern>("grid"); const [floorPower, setFloorPower] = useState(.72); const [floorDepth, setFloorDepth] = useState(.65); const [lightMovement, setLightMovement] = useState(.72); const [renderQuality, setRenderQuality] = useState<RenderQuality>("crisp"); const [zonePatterns, setZonePatterns] = useState<Record<LaserZone, number | null>>({ left: null, right: null, floor: null });
  useEffect(() => { let active = true; void fetch(`/api/local/tracks/${trackId}/waveform`, { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); if (active) { setError(""); setBeatOffset(Number(body.beatOffsetSecs) || 0); setBands(Array.isArray(body.peaks) ? { full: body.peaks, low: body.peaks, mid: body.peaks, high: body.peaks } : body.peaks); } }).catch((reason: Error) => { if (active) setError(reason.message); }); return () => { active = false; }; }, [trackId]);
  useEffect(() => { if (!expanded) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); }; window.addEventListener("keydown", close); return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", close); }; }, [expanded]);
  const tempo = bpm || 120; const currentFeatures = featuresAt(bands, progress); const activeCue = cueFor(progress, duration, tempo, currentFeatures.energy, currentFeatures.bass, currentFeatures.mids, currentFeatures.highs, currentFeatures.drop, beatOffset); const activePattern = patternOverride ?? (isSubDrop(currentFeatures) ? 16 : activeCue.pattern); const showBeat = Math.max(0, progress * duration - beatOffset) * tempo / 60; const resolvedLayout: RigLayout = rigChoice === "auto" ? "truss" : rigChoice; const resolvedScreenLayout: ScreenLayout = screenChoice === "auto" ? "cinema" : screenChoice; const resolvedScreenContent: Exclude<ScreenContent, "auto"> = screenContent === "auto" ? Math.floor(showBeat / 64) % 2 ? "vj-pack" : "generative" : screenContent; const qualityDpr: [number, number] = renderQuality === "ultra" ? [1.5, 3] : renderQuality === "crisp" ? [1.15, 2.25] : [.85, 1.5];
  const applyStagePreset = (choice: StagePreset) => { const stage = STAGE_PRESETS[choice]; setStagePreset(choice); setRigChoice(stage.rig); setScreenChoice(stage.screens); setPreset(stage.camera); };
  return <section className={`${expanded ? "fixed inset-0 z-[100] overflow-y-auto rounded-none" : "overflow-hidden rounded-xl"} border border-white/10 bg-[#020405] shadow-[0_30px_100px_rgba(0,0,0,.5)]`}>
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-white/[.08] bg-[#050809]/95 px-4 py-3 backdrop-blur-xl"><span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.16em] text-glass"><Radio size={13} /> Live cue engine</span><span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[9px] text-white/55">{tempo} BPM</span><span className="rounded-md border border-glass/15 bg-glass/[.045] px-2 py-1 font-mono text-[9px] text-glass">{patternOverride === null ? activeCue.section : "Manual"} · {PATTERN_NAMES[activePattern]}</span><span className={`rounded-md border px-2 py-1 font-mono text-[9px] ${currentFeatures.drop > .5 ? "border-coral/40 bg-coral/10 text-coral" : "border-white/10 text-white/55"}`}>{currentFeatures.drop > .5 ? "Drop hit" : bands.full.length ? "Phrase + onset mapped" : error || "Mapping audio…"}</span><div className="inline-flex h-8 items-center rounded-md border border-white/10 bg-black/30 p-0.5" aria-label="Show layer focus">{(["all", "lasers", "lights", "screens"] as ShowLayer[]).map((item) => <button key={item} onClick={() => setLayer(item)} aria-pressed={layer === item} className={`h-7 rounded px-2.5 font-mono text-[8px] uppercase tracking-wide ${layer === item ? "bg-white/12 text-white" : "text-white/40 hover:text-white"}`}>{item}</button>)}</div><div className="ml-auto flex items-center gap-1" aria-label="Camera preset">{(["arena", "booth", "overhead"] as CameraPreset[]).map((item) => <button key={item} onClick={() => setPreset(item)} aria-pressed={preset === item} className={`h-8 rounded-md px-3 text-[10px] capitalize transition ${preset === item ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/5 hover:text-white"}`}>{item}</button>)}</div><button onClick={() => setBlackout((value) => !value)} aria-pressed={blackout} className={`h-9 rounded-md border px-3 font-mono text-[8px] uppercase tracking-wide transition ${blackout ? "border-coral bg-coral text-black" : "border-white/10 text-white/55 hover:border-coral/40 hover:text-coral"}`}>{blackout ? "Restore rig" : "Blackout"}</button><button onClick={() => setExpanded((value) => !value)} className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-white/65 hover:bg-white/10 hover:text-white" aria-label={expanded ? "Exit expanded stage" : "Expand stage"}>{expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button><motion.button whileTap={reducedMotion ? undefined : { scale: .94 }} onClick={onToggle} className="grid h-9 w-9 place-items-center rounded-full bg-coral text-black" aria-label={playing ? "Pause laser show" : "Play laser show"}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</motion.button></div>
    <div className={`relative ${expanded ? "h-[calc(100vh-64px)] min-h-[620px]" : "h-[clamp(430px,62vh,720px)]"} bg-[radial-gradient(circle_at_50%_15%,rgba(23,57,52,.18),transparent_45%),#010203]`}>
      <Canvas dpr={qualityDpr} shadows={renderQuality !== "balanced"} gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}><color attach="background" args={["#010203"]} /><fog attach="fog" args={["#010203", 10, 27]} /><PerspectiveCamera makeDefault fov={50} position={[0, 3.25, 9.2]} /><CameraRig preset={preset} />{renderQuality === "balanced" && <AdaptiveDpr />}<LaserStage bands={bands} progress={progress} duration={duration} playing={playing && !reducedMotion} bpm={tempo} beatOffset={beatOffset} spread={spread} intensity={intensity} lighting={lighting} haze={haze} ledPower={ledPower} motion={motionAmount} density={fixtureDensity} rhythmStyle={rhythmStyle} patternOverride={patternOverride} blackout={blackout} layout={resolvedLayout} screenLayout={resolvedScreenLayout} screenContent={resolvedScreenContent} selectedVj={selectedVj} layer={layer} laserColors={laserColors} lightColors={lightColors} beamWidth={beamWidth} beamShape={beamShape} stagePreset={stagePreset} floorPattern={floorPattern} floorPower={floorPower} floorDepth={floorDepth} lightMovement={lightMovement} zonePatterns={zonePatterns} /><EffectComposer multisampling={renderQuality === "ultra" ? 8 : renderQuality === "crisp" ? 4 : 0}><Bloom intensity={.48 + intensity * .25} luminanceThreshold={.24} luminanceSmoothing={.42} mipmapBlur /><Vignette eskil={false} offset={.14} darkness={.62} /></EffectComposer></Canvas>
      <motion.div layout className="absolute left-4 top-4 flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/55 p-1 backdrop-blur-xl" aria-label="Fixture layout">{(["auto", "truss", "ring", "wings", "floor"] as RigChoice[]).map((item) => <motion.button layout key={item} whileTap={reducedMotion ? undefined : { scale: .94 }} onClick={() => setRigChoice(item)} aria-pressed={rigChoice === item} className={`relative h-7 rounded-md px-2.5 font-mono text-[8px] uppercase tracking-wide transition-colors ${rigChoice === item ? "text-white" : "text-white/40 hover:text-white"}`}>{rigChoice === item && <motion.span layoutId="laser-rig-layout" className="absolute inset-0 rounded-md border border-white/10 bg-white/10" transition={{ type: "spring", stiffness: 320, damping: 28 }} />}<span className="relative">{item}{item === "auto" ? ` · ${resolvedLayout}` : ""}</span></motion.button>)}</motion.div>
      <motion.div layout className="absolute left-4 top-[60px] flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/55 p-1 backdrop-blur-xl" aria-label="LED stage layout">{(["auto", "cinema", "totems", "mosaic", "diamonds", "orbit"] as ScreenChoice[]).map((item) => <motion.button layout key={item} whileTap={reducedMotion ? undefined : { scale: .94 }} onClick={() => setScreenChoice(item)} aria-pressed={screenChoice === item} className={`relative h-7 rounded-md px-2.5 font-mono text-[8px] uppercase tracking-wide transition-colors ${screenChoice === item ? "text-violet-200" : "text-white/40 hover:text-white"}`}>{screenChoice === item && <motion.span layoutId="screen-stage-layout" className="absolute inset-0 rounded-md border border-violet-300/20 bg-violet-300/10" transition={{ type: "spring", stiffness: 320, damping: 28 }} />}<span className="relative">{item}{item === "auto" ? ` · ${resolvedScreenLayout}` : ""}</span></motion.button>)}</motion.div>
      <div className="absolute left-4 top-[100px] flex items-center gap-1 rounded-lg border border-white/10 bg-black/55 p-1 backdrop-blur-xl" aria-label="LED visual source"><Film size={12} className="mx-1.5 text-violet-200" />{(["auto", "generative", "vj-pack"] as ScreenContent[]).map((item) => <button key={item} onClick={() => setScreenContent(item)} aria-pressed={screenContent === item} className={`h-7 rounded-md px-2.5 font-mono text-[8px] uppercase tracking-wide ${screenContent === item ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>{item}{item === "auto" ? ` · ${resolvedScreenContent}` : ""}</button>)}</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" /><div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-xl"><ScanLine size={14} className="text-glass" /><div><p className="font-mono text-[8px] uppercase tracking-[.14em] text-white/45">Cue position</p><p className="font-mono text-[11px] tabular-nums text-white">{Math.floor(progress * 1000) / 10}%</p></div></div>
    </div>
    <div className="grid gap-4 border-t border-white/[.08] bg-[#050708] px-4 py-3 lg:grid-cols-[1.3fr_1fr]"><div><p className="mb-2 font-mono text-[8px] uppercase tracking-[.14em] text-white/35">Beam shape</p><div className="flex flex-wrap gap-1.5" aria-label="Laser beam shape">{(["straight", "sine", "helix", "zigzag"] as BeamShape[]).map((shape) => <button key={shape} onClick={() => setBeamShape(shape)} aria-pressed={beamShape === shape} className={`h-8 rounded-md border px-3 font-mono text-[8px] uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${beamShape === shape ? "border-glass/35 bg-glass/10 text-glass" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white"}`}>{shape}</button>)}</div></div><label className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-[10px] text-white/55"><span>Beam width</span><span className="font-mono tabular-nums text-white/75">{Math.round(beamWidth * 100)}%</span><input aria-label="Laser beam width" className="col-span-2 accent-[var(--glass)]" type="range" min=".5" max="4" step=".05" value={beamWidth} onChange={(event) => setBeamWidth(Number(event.target.value))} /></label></div>
    <div className="border-t border-white/[.08] bg-[#07090a] px-4 py-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[8px] uppercase tracking-[.14em] text-white/35">Independent laser zones</p><p className="mt-1 text-[9px] text-white/45">Lock each side to a different formation or leave it on the cue engine.</p></div><span className="font-mono text-[8px] uppercase tracking-wide text-glass">40 laser fixtures</span></div><div className="grid gap-3 md:grid-cols-3">{(["left", "right", "floor"] as LaserZone[]).map((zone) => <label key={zone} className="grid gap-1.5"><span className="text-[9px] capitalize text-white/55">{zone} lasers</span><select aria-label={`${zone} laser pattern`} value={zonePatterns[zone] ?? -1} onChange={(event) => setZonePatterns((current) => ({ ...current, [zone]: Number(event.target.value) < 0 ? null : Number(event.target.value) }))} className="h-9 rounded-md border border-white/10 bg-black/40 px-3 text-[10px] text-white outline-none focus:border-glass/50"><option value={-1}>Follow master cue</option>{PATTERN_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>)}</div></div>
    <div className="grid gap-4 border-t border-white/[.08] bg-[#050708] px-4 py-3 xl:grid-cols-[1.2fr_1fr_1fr]"><div><p className="mb-2 font-mono text-[8px] uppercase tracking-[.14em] text-white/35">Dimensional floor</p><div className="flex flex-wrap gap-1.5">{(["grid", "rings", "chevrons", "circuit"] as FloorPattern[]).map((choice) => <button key={choice} onClick={() => setFloorPattern(choice)} aria-pressed={floorPattern === choice} className={`h-8 rounded-md border px-3 font-mono text-[8px] uppercase tracking-wide ${floorPattern === choice ? "border-coral/35 bg-coral/10 text-coral" : "border-white/10 text-white/40 hover:text-white"}`}>{choice}</button>)}</div></div><label className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-[10px] text-white/55"><span>Floor glow</span><span className="font-mono tabular-nums text-white/75">{Math.round(floorPower * 100)}%</span><input aria-label="Floor glow" className="col-span-2 accent-coral" type="range" min="0" max="1.4" step=".01" value={floorPower} onChange={(event) => setFloorPower(Number(event.target.value))} /></label><label className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-[10px] text-white/55"><span>Floor depth</span><span className="font-mono tabular-nums text-white/75">{Math.round(floorDepth * 100)}%</span><input aria-label="Floor depth" className="col-span-2 accent-[var(--glass)]" type="range" min="0" max="1.5" step=".01" value={floorDepth} onChange={(event) => setFloorDepth(Number(event.target.value))} /></label></div>
    <div className="grid gap-4 border-t border-white/[.08] bg-[#07090a] px-4 py-3 md:grid-cols-2"><div><p className="mb-2 font-mono text-[8px] uppercase tracking-[.14em] text-white/35">Image quality</p><div className="flex gap-1.5">{(["balanced", "crisp", "ultra"] as RenderQuality[]).map((choice) => <button key={choice} onClick={() => setRenderQuality(choice)} aria-pressed={renderQuality === choice} className={`h-8 rounded-md border px-3 font-mono text-[8px] uppercase tracking-wide ${renderQuality === choice ? "border-violet-300/35 bg-violet-300/10 text-violet-200" : "border-white/10 text-white/40 hover:text-white"}`}>{choice}</button>)}</div></div><label className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-[10px] text-white/55"><span>Moving-light range</span><span className="font-mono tabular-nums text-white/75">{Math.round(lightMovement * 100)}%</span><input aria-label="Moving light range" className="col-span-2 accent-sky-400" type="range" min="0" max="1.5" step=".01" value={lightMovement} onChange={(event) => setLightMovement(Number(event.target.value))} /></label></div>
    <div className="grid gap-4 border-t border-white/[.08] bg-[#070a0b] p-4 sm:grid-cols-2 xl:grid-cols-5"><label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[10px] text-white/55"><Gauge size={14} className="text-coral" /><span>Laser power</span><span className="font-mono tabular-nums text-white/75">{Math.round(intensity * 100)}%</span><input className="col-span-3 accent-[var(--coral)]" type="range" min=".2" max="1.25" step=".01" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} /></label><label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[10px] text-white/55"><Lightbulb size={14} className="text-sky-300" /><span>Stage lighting</span><span className="font-mono tabular-nums text-white/75">{Math.round(lighting * 100)}%</span><input className="col-span-3 accent-sky-400" type="range" min=".1" max="1.25" step=".01" value={lighting} onChange={(event) => setLighting(Number(event.target.value))} /></label><label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[10px] text-white/55"><Monitor size={14} className="text-violet-300" /><span>LED walls</span><span className="font-mono tabular-nums text-white/75">{Math.round(ledPower * 100)}%</span><input className="col-span-3 accent-violet-400" type="range" min="0" max="1.2" step=".01" value={ledPower} onChange={(event) => setLedPower(Number(event.target.value))} /></label><label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[10px] text-white/55"><Camera size={14} className="text-glass" /><span>Scanner spread</span><span className="font-mono tabular-nums text-white/75">{Math.round(spread * 100)}%</span><input className="col-span-3 accent-[var(--glass)]" type="range" min=".1" max="1" step=".01" value={spread} onChange={(event) => setSpread(Number(event.target.value))} /></label><label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[10px] text-white/55"><SparklesIcon size={14} className="text-fuchsia-300" /><span>Atmosphere</span><span className="font-mono tabular-nums text-white/75">{Math.round(haze * 100)}%</span><input className="col-span-3 accent-fuchsia-400" type="range" min=".05" max="1" step=".01" value={haze} onChange={(event) => setHaze(Number(event.target.value))} /></label></div>
    <div className="grid gap-4 border-t border-white/[.08] bg-[#050708] px-4 py-3 lg:grid-cols-[1.35fr_1.25fr_.8fr]"><div><p className="mb-2 font-mono text-[8px] uppercase tracking-[.14em] text-white/35">Stage design</p><div className="flex flex-wrap gap-1.5">{(Object.keys(STAGE_PRESETS) as StagePreset[]).map((choice) => <button key={choice} onClick={() => applyStagePreset(choice)} aria-pressed={stagePreset === choice} className={`h-8 rounded-md border px-3 text-[9px] transition ${stagePreset === choice ? "border-glass/30 bg-glass/10 text-glass" : "border-white/10 text-white/45 hover:border-white/20 hover:text-white"}`}>{STAGE_PRESETS[choice].label}</button>)}</div></div><div><p className="mb-2 font-mono text-[8px] uppercase tracking-[.14em] text-white/35">Rhythm switching</p><div className="flex flex-wrap gap-1.5">{(["auto", "banks", "chase", "strobe", "open"] as RhythmStyle[]).map((choice) => <button key={choice} onClick={() => setRhythmStyle(choice)} aria-pressed={rhythmStyle === choice} className={`h-8 rounded-md border px-3 font-mono text-[8px] uppercase tracking-wide transition ${rhythmStyle === choice ? "border-coral/35 bg-coral/10 text-coral" : "border-white/10 text-white/40 hover:text-white"}`}>{choice}</button>)}</div></div><label className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-[10px] text-white/55"><span>Laser motion</span><span className="font-mono tabular-nums text-white/75">{Math.round(motionAmount * 100)}%</span><input className="col-span-2 accent-[var(--glass)]" type="range" min=".45" max="1.65" step=".01" value={motionAmount} onChange={(event) => setMotionAmount(Number(event.target.value))} /></label></div>
    <div className="grid gap-4 border-t border-white/[.08] bg-[#07090a] px-4 py-3 md:grid-cols-[1.2fr_1fr]"><label className="grid gap-2"><span className="font-mono text-[8px] uppercase tracking-[.14em] text-white/35">Laser formation</span><select value={patternOverride ?? -1} onChange={(event) => setPatternOverride(Number(event.target.value) < 0 ? null : Number(event.target.value))} className="h-9 rounded-md border border-white/10 bg-black/40 px-3 text-[10px] text-white outline-none focus:border-glass/50"><option value={-1}>Auto cue engine</option>{PATTERN_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label><label className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-[10px] text-white/55"><span>Active fixtures</span><span className="font-mono tabular-nums text-white/75">{Math.round(fixtureDensity * 100)}%</span><input className="col-span-2 accent-coral" type="range" min=".2" max="1" step=".05" value={fixtureDensity} onChange={(event) => setFixtureDensity(Number(event.target.value))} /></label></div>
    <div className="flex flex-wrap items-center gap-3 border-t border-white/[.08] bg-[#050708] px-4 py-3"><div className="mr-2"><p className="text-[10px] font-medium text-white/75">Laser colors</p><p className="mt-0.5 font-mono text-[8px] uppercase tracking-wide text-white/35">Choose one or combine several</p></div><button onClick={() => setLaserColors([])} aria-pressed={!laserColors.length} className={`h-8 rounded-md border px-3 font-mono text-[8px] uppercase tracking-wide transition ${!laserColors.length ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-white/40 hover:text-white"}`}>Auto</button><div className="flex flex-wrap gap-2" aria-label="Laser color selection">{LASER_COLOR_OPTIONS.map((color) => { const selected = laserColors.includes(color); return <button key={color} onClick={() => setLaserColors((current) => current.includes(color) ? current.filter((item) => item !== color) : [...current, color])} aria-label={`${selected ? "Remove" : "Add"} ${color} laser color`} aria-pressed={selected} className={`grid h-8 w-8 place-items-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${selected ? "scale-110 border-white shadow-[0_0_16px_var(--swatch)]" : "border-white/15 opacity-55 hover:scale-105 hover:opacity-100"}`} style={{ "--swatch": color } as CSSProperties}><span className="h-4 w-4 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} /></button>; })}</div><span className="ml-auto font-mono text-[8px] uppercase tracking-wide text-white/35">{laserColors.length ? `${laserColors.length} color${laserColors.length === 1 ? "" : "s"} active` : "Audio palette"}</span></div>
    <div className="flex flex-wrap items-center gap-3 border-t border-white/[.08] bg-[#07090a] px-4 py-3"><div className="mr-2"><p className="text-[10px] font-medium text-white/75">Light colors</p><p className="mt-0.5 font-mono text-[8px] uppercase tracking-wide text-white/35">Independent wash + stage palette</p></div><button onClick={() => setLightColors([])} aria-pressed={!lightColors.length} className={`h-8 rounded-md border px-3 font-mono text-[8px] uppercase tracking-wide transition ${!lightColors.length ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-white/40 hover:text-white"}`}>Auto</button><div className="flex flex-wrap gap-2" aria-label="Stage light color selection">{LASER_COLOR_OPTIONS.map((color) => { const selected = lightColors.includes(color); return <button key={color} onClick={() => setLightColors((current) => current.includes(color) ? current.filter((item) => item !== color) : [...current, color])} aria-label={`${selected ? "Remove" : "Add"} ${color} stage light color`} aria-pressed={selected} className={`grid h-8 w-8 place-items-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${selected ? "scale-110 border-white shadow-[0_0_16px_var(--swatch)]" : "border-white/15 opacity-55 hover:scale-105 hover:opacity-100"}`} style={{ "--swatch": color } as CSSProperties}><span className="h-4 w-4 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} /></button>; })}</div><span className="ml-auto font-mono text-[8px] uppercase tracking-wide text-white/35">{lightColors.length ? `${lightColors.length} color${lightColors.length === 1 ? "" : "s"} active` : "Audio palette"}</span></div>
    <div className="border-t border-white/[.08] bg-[#050708] px-4 py-4"><div className="mb-3 flex items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-[11px] font-medium text-white"><Film size={14} className="text-violet-300" />VJ visual library</p><p className="mt-1 text-[9px] text-white/40">Hover to preview. Select a visual to lock it across the LED rig.</p></div><button onClick={() => { setSelectedVj(null); setScreenContent("auto"); }} aria-pressed={selectedVj === null && screenContent === "auto"} className={`h-8 rounded-md border px-3 font-mono text-[8px] uppercase tracking-wide ${selectedVj === null && screenContent === "auto" ? "border-violet-300/30 bg-violet-300/10 text-violet-200" : "border-white/10 text-white/45 hover:text-white"}`}>Auto sequence</button></div><div className="grid grid-flow-col auto-cols-[156px] gap-2 overflow-x-auto pb-2">{VJ_LOOPS.map((visual) => { const selected = selectedVj === visual.src; return <button key={visual.id} onClick={() => { setSelectedVj(visual.src); setScreenContent("vj-pack"); }} onPointerEnter={(event) => { const preview = event.currentTarget.querySelector("video"); void preview?.play().catch(() => undefined); }} onPointerLeave={(event) => { const preview = event.currentTarget.querySelector("video"); preview?.pause(); }} aria-pressed={selected} className={`group overflow-hidden rounded-lg border text-left transition ${selected ? "border-violet-300/60 bg-violet-300/10 shadow-[0_0_24px_rgba(167,139,250,.12)]" : "border-white/10 bg-white/[.025] hover:border-white/25"}`}><span className="relative block aspect-video overflow-hidden bg-black"><video src={visual.src} poster={visual.poster} muted loop playsInline preload="metadata" className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.04] group-hover:opacity-100" /><span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${selected ? "bg-violet-300 shadow-[0_0_9px_#c4b5fd]" : "bg-black/50"}`} /></span><span className="block truncate px-2.5 py-2 text-[9px] text-white/70">{visual.label}</span></button>; })}</div></div>
  </section>;
}
