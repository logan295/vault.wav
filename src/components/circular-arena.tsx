import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { showMotionAt, type SongCue } from "@/lib/local-audio/song-show";
import type { ArenaCue } from "./arena-cue-controls";

const rigRows = [-4, 3, 10, 17];

export const CEILING_PATTERNS = ["Music sync", "Row chase", "Mirror sweep", "Beat pulse", "Steady", "Off", "Clockwise", "Counterclockwise", "Fan", "Cross sweep", "Wave", "Alternating", "Vertical columns", "Parallel rake", "Horizontal plane", "Mirrored fans", "Crossfire"] as const;
export type CeilingPattern = (typeof CEILING_PATTERNS)[number];
export type ArenaFrame = RefObject<{ time: number; beat: number; hit: number; attack: number; dropBeat: number | null; cue?: SongCue; attackIndex: number; bpm: number }>;

export function RigRod({ from, to, radius = .035 }: { from: [number, number, number]; to: [number, number, number]; radius?: number }) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from); const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    return { position: start.add(end).multiplyScalar(.5), length: direction.length(), quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), direction.normalize()) };
  }, [from, to]);
  return <mesh position={position} quaternion={quaternion}><cylinderGeometry args={[radius,radius,length,6]} /><meshStandardMaterial color="#727b83" metalness={.82} roughness={.36} /></mesh>;
}

function CeilingSquare({ x, row, color, pattern, power, playing, frame, speed }: {
  speed: number; x: number; row: number; color: string; pattern: CeilingPattern; power: number; playing: boolean; frame: ArenaFrame;
}) {
  const strips = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame(() => {
    const { beat, hit, dropBeat, cue } = frame.current;
    const step = Math.floor(beat * 2 * speed);
    const mode = pattern === "Music sync" ? CEILING_PATTERNS[1 + (cue?.top ?? Math.floor(beat / 8)) % 3] : pattern;
    for (let edge = 0; edge < 4; edge++) {
      const material = strips.current[edge];
      if (!material) continue;
      let level = 1;
      if (mode === "Off") level = 0;
      else if (playing && mode !== "Steady") {
        if (dropBeat !== null && dropBeat < .48) level = 1.55;
        else if (mode === "Row chase") level = step % rigRows.length === row ? 1 : .1;
        else if (mode === "Mirror sweep") level = (step + row) % 4 === (edge + (x === 0 ? 0 : 2)) % 4 ? 1 : .12;
        else if (mode === "Clockwise" || mode === "Counterclockwise") level = ((mode === "Clockwise" ? step : -step) + edge + row + 1000) % 4 === 0 ? 1 : .1;
        else if (mode === "Alternating") level = (step + row) % 2 === 0 ? 1 : .05;
        else if (mode === "Wave" || mode === "Fan" || mode === "Cross sweep") level = .3 + .7 * Math.max(0, Math.sin(beat * speed + edge + row));
        else level = .17 + hit * .95;
      }
      material.opacity = Math.min(1, level * power);
    }
  });
  return <group position={[x, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
    {[0,1,2,3].map((edge) => {
      const angle = edge * Math.PI / 2; const next = angle + Math.PI / 2;
      const a: [number,number,number] = [Math.cos(angle)*2.38,Math.sin(angle)*2.38,0];
      const b: [number,number,number] = [Math.cos(next)*2.38,Math.sin(next)*2.38,0];
      return <group key={`truss-${edge}`}>
        {[0,-.34].map((z) => <RigRod key={z} from={[a[0],a[1],z]} to={[b[0],b[1],z]} radius={.052} />)}
        {[0,1,2,3,4,5].map((segment) => {
          const f = segment/6; const t=(segment+1)/6;
          return <RigRod key={segment} from={[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,segment%2 ? -.34 : 0]} to={[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,segment%2 ? 0 : -.34]} radius={.022} />;
        })}
      </group>;
    })}
    {[0, 1, 2, 3].map((corner) => {
      const angle = corner * Math.PI / 2;
      return <mesh key={corner} position={[Math.cos(angle) * 2.38, Math.sin(angle) * 2.38, -.17]}>
        <boxGeometry args={[.09, .09, .34]} /><meshStandardMaterial color="#69717d" metalness={.55} roughness={.55} />
      </mesh>;
    })}
    {[0, 1, 2, 3].map((edge) => {
      const angle = (edge + .5) * Math.PI / 2;
      return <mesh key={edge} position={[Math.cos(angle) * 1.68, Math.sin(angle) * 1.68, .13]} rotation={[0, 0, angle + Math.PI / 2]}>
        <boxGeometry args={[3.33, .065, .09]} />
        <meshBasicMaterial ref={(material) => { if (material) strips.current[edge] = material; }} color={color} transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>;
    })}
  </group>;
}

const WASH_VERTEX = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalMatrix * normal;
    vView = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const WASH_FRAGMENT = `
  uniform vec3 tint;
  uniform float power;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 2.6);
    float falloff = smoothstep(0.0, 0.22, vUv.y) * pow(vUv.y, 0.7);
    gl_FragColor = vec4(tint, power * falloff * edge);
  }
`;

export function ArenaMovingHead({ position, side, row, color, power, haze, movement, playing, frame, speed = 1, pattern = "Music sync", slot = 0, referenceRig = false, beamRadius = 1.22, beamLength = 7.1 }: {
  slot?: number; referenceRig?: boolean; beamRadius?: number; beamLength?: number; speed?: number; pattern?: CeilingPattern; position: [number, number, number]; side: number; row: number; color: string;
  power: number; haze: number; movement: number; playing: boolean; frame: ArenaFrame;
}) {
  const pan = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lens = useRef<THREE.MeshBasicMaterial>(null);
  const washMaterial = useRef<THREE.ShaderMaterial>(null);
  const wash = useMemo(() => ({ tint: { value: new THREE.Color() }, power: { value: 0 } }), []);

  useFrame((_, delta) => {
    if (!pan.current || !head.current || !lens.current) return;
    const { beat, hit, cue, time, bpm } = frame.current;
    const modes = referenceRig ? ["Vertical columns", "Parallel rake", "Mirrored fans", "Crossfire", "Horizontal plane", "Wave"] : ["Mirror sweep", "Fan", "Cross sweep", "Wave", "Alternating", "Clockwise"];
    const mode = pattern === "Music sync" ? modes[cue ? (cue.top + cue.bottom) % modes.length : Math.floor(beat / 16) % modes.length] : pattern;
    const phase = showMotionAt(cue,time,bpm) * Math.PI / 4 * speed;
    let yaw = side * (.25 + Math.sin(phase - row * .74) * .85 * movement);
    let tilt = -.35 - Math.cos(phase * .7 - row * .4) * .42 * movement;
    if (mode === "Clockwise" || mode === "Counterclockwise") { const rotation = phase * (mode === "Clockwise" ? 1 : -1) + row * .4; yaw = Math.sin(rotation) * .95 * movement; tilt = -.4 + Math.cos(rotation) * .5 * movement; }
    if (mode === "Fan") { yaw = side * (.2 + row * .18) * movement; tilt = -.3 + Math.sin(phase) * .5 * movement; }
    if (mode === "Cross sweep") { yaw = -side * (.3 + Math.sin(phase) * .7) * movement; tilt = -.55 + Math.cos(phase) * .3 * movement; }
    if (mode === "Wave") { yaw = side * Math.sin(phase - row * .85) * movement; tilt = -.4 + Math.sin(phase - row * .85) * .5 * movement; }
    if (mode === "Steady" || mode === "Off") { yaw = side * .25; tilt = -.45; }
    if (mode === "Vertical columns") { yaw=0; tilt=0; }
    if (mode === "Parallel rake") { yaw=0; tilt=-.68; }
    if (mode === "Horizontal plane") { yaw=side*.2; tilt=-Math.PI/2; }
    if (mode === "Mirrored fans") { yaw=side*(.12+(slot%3)*.2)*movement; tilt=-.42+(slot%3-1)*.22+Math.sin(phase)*.12*movement; }
    if (mode === "Crossfire") { yaw=-side*(.35+(slot%3)*.15); tilt=-.7+Math.sin(phase)*.24*movement; }
    const ease = 1 - Math.exp(-delta * 18);
    pan.current.rotation.y = THREE.MathUtils.lerp(pan.current.rotation.y, yaw, ease);
    head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, tilt, ease);
    const step = Math.floor(beat * 2 * speed);
    let active = !playing ? .55 : .25 + hit * .65;
    if (mode === "Steady" || ["Vertical columns", "Parallel rake", "Horizontal plane", "Mirrored fans", "Crossfire"].includes(mode)) active = playing ? .62+hit*.38 : .85;
    if (playing && mode === "Row chase") active = step % 4 === row % 4 ? 1 : 0;
    if (playing && mode === "Alternating") active = (step + row + (side < 0 ? 1 : 0)) % 2 === 0 ? 1 : 0;
    if (playing && mode === "Beat pulse") active = Math.max(0, 1 - (beat % 1) * 4);
    if (mode === "Off") active = 0;
    lens.current.opacity = active * power;
    if (washMaterial.current) {
      washMaterial.current.uniforms.tint.value.set(color);
      washMaterial.current.uniforms.power.value = active * power * haze * .48;
    }
  });

  return <group position={position}>
    <mesh position={[0,.14,0]}><boxGeometry args={[.15,.15,.12]} /><meshStandardMaterial color="#6d7782" metalness={.8} roughness={.32} /></mesh>
    {[-.14, -.07, 0, .07, .14].map((x) => <mesh key={x} position={[x,.015,.217]}><boxGeometry args={[.025,.11,.012]} /><meshStandardMaterial color="#070a0d" /></mesh>)}
    <mesh><boxGeometry args={[.48, .19, .42]} /><meshStandardMaterial color="#272d36" roughness={.63} /></mesh>
    <group ref={pan} position={[0, -.23, 0]}>
      {[-.2, .2].map((x) => <mesh key={x} position={[x, -.1, 0]}><boxGeometry args={[.08, .39, .19]} /><meshStandardMaterial color="#353e4b" roughness={.5} /></mesh>)}
      <group ref={head} position={[0, -.14, 0]}>
        <mesh><cylinderGeometry args={[.16, .21, .31, 16]} /><meshStandardMaterial color="#252d39" metalness={.52} roughness={.42} /></mesh>
        <mesh position={[0,-.16,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.157,.022,8,24]} /><meshStandardMaterial color="#59616b" metalness={.85} roughness={.2} /></mesh>
        <mesh position={[0, -.162, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[.145, 20]} /><meshBasicMaterial ref={lens} color={color} transparent opacity={0} toneMapped={false} /></mesh>
        <mesh position={[0, -.18-beamLength/2, 0]}>
          <cylinderGeometry args={[Math.min(.14,beamRadius*.2), beamRadius, beamLength, 20, 1, true]} />
          <shaderMaterial ref={washMaterial} uniforms={wash} vertexShader={WASH_VERTEX} fragmentShader={WASH_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        {referenceRig && <mesh position={[0,-.18-beamLength/2,0]}><cylinderGeometry args={[.025,beamRadius*.14,beamLength,12,1,true]} /><shaderMaterial uniforms={wash} vertexShader={WASH_VERTEX} fragmentShader={WASH_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} /></mesh>}
      </group>
    </group>
  </group>;
}

export function CircularArena({ power, color, colors, speed, pattern, playing, frame, haze, movement }: { colors: string[]; speed: number; power: number; color: string; pattern: CeilingPattern; haze: number; movement: number; playing: boolean; frame: ArenaFrame }) {
  const sculpture = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 2.1);
    shape.lineTo(3.25, 0);
    shape.lineTo(0, -2.1);
    shape.lineTo(-3.25, 0);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(0, 1.8);
    hole.lineTo(-2.82, 0);
    hole.lineTo(0, -1.8);
    hole.lineTo(2.82, 0);
    hole.closePath();
    shape.holes.push(hole);
    return shape;
  }, []);

  return <group>
    <hemisphereLight args={["#748da3", "#17151b", .48]} />
    <pointLight position={[0,5,-6]} color="#c4d5e4" intensity={14} distance={17} decay={2} />
    {[-1,1].map((side) => <group key={`aisle-${side}`}>
      <pointLight position={[side*12,2.5,2]} color="#ffc585" intensity={8} distance={9} decay={2} />
      {[0,1,2,3,4].map((step) => <mesh key={step} position={[side*6.3,-.05+step*.14,-5.2]}><boxGeometry args={[.7,.13,3.5-step*.22]} /><meshStandardMaterial color="#28303b" roughness={.87} metalness={.25} /></mesh>)}
    </group>)}
    {[-1, 1].map((side) => <group key={`venue-wall-${side}`} position={[side * 17.7, 4.2, 4]}>
      <mesh><boxGeometry args={[.25, 8.8, 44]} /><meshStandardMaterial color="#1c2027" roughness={.96} /></mesh>
      {Array.from({ length: 9 }, (_, bay) => <mesh key={bay} position={[-side * .19, 0, (bay - 4) * 4.8]}>
        <boxGeometry args={[.18, 8.6, .22]} /><meshStandardMaterial color="#414955" metalness={.38} roughness={.65} />
      </mesh>)}
    </group>)}
    {Array.from({ length: 10 }, (_, panel) => <mesh key={`roof-${panel}`} position={[0, 9.2, (panel - 4.5) * 4]}>
      <boxGeometry args={[36, .12, 3.91]} /><meshStandardMaterial color="#20252c" metalness={.3} roughness={.72} />
    </mesh>)}
    <mesh position={[0, -.27, 5]}><boxGeometry args={[36, .5, 45]} /><meshStandardMaterial color="#10151e" roughness={.63} /></mesh>
    <mesh position={[0, .4, -5]}><cylinderGeometry args={[5.8, 6.35, .8, 96, 1, true]} /><meshStandardMaterial color="#151923" metalness={.65} roughness={.3} /></mesh>
    <mesh position={[0, .81, -5]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.85, 5.8, 96]} /><meshStandardMaterial color="#171d28" metalness={.58} roughness={.35} /></mesh>
    <mesh position={[0, .78, -5]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[5.79, .035, 6, 96]} /><meshBasicMaterial color="#d9edff" toneMapped={false} transparent opacity={power} /></mesh>
    <mesh position={[0, .47, -5]}><cylinderGeometry args={[1.85, 1.85, .68, 64, 1, true]} /><meshStandardMaterial color="#1b2330" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, .27, -5]}><cylinderGeometry args={[1.85, 1.85, .08, 64]} /><meshStandardMaterial color="#252b35" /></mesh>
    <mesh position={[0, .56, -5.7]}><boxGeometry args={[2.8, 1.12, .72]} /><meshStandardMaterial color="#202734" /></mesh>
    {[-.91, .91].map((x) => <group key={x} position={[x, 1.16, -5.7]}>
      <mesh><boxGeometry args={[.69, .09, .46]} /><meshStandardMaterial color="#2e333d" roughness={.68} /></mesh>
      <mesh position={[0, .058, .035]}><cylinderGeometry args={[.145, .145, .019, 24]} /><meshStandardMaterial color="#536174" metalness={.48} roughness={.4} /></mesh>
      <mesh position={[0, .058, -.147]}><boxGeometry args={[.18, .015, .055]} /><meshBasicMaterial color="#c6e7ff" transparent opacity={power * .7} /></mesh>
    </group>)}
    <mesh position={[0, 1.165, -5.7]}><boxGeometry args={[.59, .09, .49]} /><meshStandardMaterial color="#353c48" roughness={.58} /></mesh>
    {[-.19, 0, .19].map((x) => <mesh key={x} position={[x, 1.22, -5.66]}><boxGeometry args={[.024, .02, .19]} /><meshBasicMaterial color={color} transparent opacity={power * .65} /></mesh>)}
    {[-2.1, 2.1].map((x) => <mesh key={x} position={[x, 7.11, -5]}><cylinderGeometry args={[.017, .017, 2.7, 6]} /><meshStandardMaterial color="#77828d" roughness={.6} /></mesh>)}
    <group position={[0, 5.4, -5]}>
      <mesh><extrudeGeometry args={[sculpture, { depth: .42, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 1, curveSegments: 24 }]} /><meshStandardMaterial color="#1c2330" metalness={.7} roughness={.33} /></mesh>
      <mesh position={[0, 0, .45]}><shapeGeometry args={[sculpture, 32]} /><meshBasicMaterial color={color} transparent opacity={power * .76} toneMapped={false} /></mesh>

    </group>
    {[0, 1, 2].map((tier) => <group key={tier} position={[0, .09 + tier * .14, -5]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh><torusGeometry args={[6.65 - tier * .26, .095, 6, 96]} /><meshStandardMaterial color="#293347" metalness={.58} roughness={.36} /></mesh>
      <mesh position={[0, 0, -.045]}><torusGeometry args={[6.62 - tier * .26, .021, 5, 96]} /><meshBasicMaterial color={color} transparent opacity={power * .45} toneMapped={false} /></mesh>
    </group>)}
    <mesh position={[0, 3.95, -12.28]}><boxGeometry args={[13.5, 5.4, .5]} /><meshStandardMaterial color="#242d3c" metalness={.35} roughness={.53} /></mesh>
    {[1.23, 6.67].map((y) => <mesh key={y} position={[0, y, -11.92]}><boxGeometry args={[13.35, .045, .035]} /><meshBasicMaterial color={color} transparent opacity={power * .65} toneMapped={false} /></mesh>)}
    {[-1, 1].map((side) => <group key={side} position={[side * 10.2, 0, -10.8]}>
      {[0, 1, 2].map((panel) => <group key={panel} position={[side * panel * .96, 3.2 - panel * .34, panel * .42]} rotation={[0, -side * .29, -side * .19]}>
        <mesh><boxGeometry args={[.56, 6.05 - panel * .72, .85]} /><meshStandardMaterial color="#344052" metalness={.42} roughness={.4} /></mesh>
        <mesh position={[-side * .13, 0, .44]}><boxGeometry args={[.058, 5.9 - panel * .72, .04]} /><meshBasicMaterial color={color} transparent opacity={power * .58} toneMapped={false} /></mesh>
      </group>)}
    </group>)}
    {rigRows.map((z, row) => <group key={z} position={[0, 8.1, z]}>
      <mesh position={[0, .38, 0]}><boxGeometry args={[30, .22, .4]} /><meshStandardMaterial color="#414c5d" /></mesh>
      {[-13.4, 13.4].map((x) => <mesh key={x} position={[x, -3.88, 0]}><boxGeometry args={[.36, 8.4, .44]} /><meshStandardMaterial color="#303a4b" roughness={.55} /></mesh>)}
      <mesh position={[0, .91, 0]}><boxGeometry args={[30, .1, .2]} /><meshStandardMaterial color="#3c4551" roughness={.55} /></mesh>
      {Array.from({ length: 16 }, (_, brace) => <mesh key={brace} position={[(brace - 7.5) * 1.85, .65, 0]} rotation={[0, 0, (brace % 2 ? -1 : 1) * 1.27]}>
        <boxGeometry args={[.065, 1.96, .09]} /><meshStandardMaterial color="#364250" roughness={.61} />
      </mesh>)}
      {[-8, 0, 8].map((x) => <CeilingSquare key={x} x={x} row={row} color={color} pattern={pattern} power={power} speed={speed} playing={playing} frame={frame} />)}
    </group>)}
    {rigRows.flatMap((z, row) => [-8, 0, 8].flatMap((center) => [-1, 1].map((side) =>
      <ArenaMovingHead key={`square-${row}-${center}-${side}`} position={[center + side * 1.6, 7.95, z]}
        side={side} row={row} color={colors[(row + (center === 0 ? 0 : 1)) % colors.length] ?? color} speed={speed} pattern={pattern} power={power * .9} haze={haze} movement={movement} playing={playing} frame={frame} />,
    )))}
    {emitters.map(([x, y, z]) => <mesh key={`${x}:${y}:${z}`} position={[x, y + .09, z]}>
      <boxGeometry args={[.25, .2, .31]} /><meshStandardMaterial color="#202630" metalness={.5} />
    </mesh>)}
    {[-1, 1].map((side) => <group key={`speaker-${side}`} position={[side * 7.25, 5.6, -8.6]}>
      {Array.from({ length: 5 }, (_, cabinet) => <group key={cabinet} position={[0, -cabinet * .48, cabinet * .055]} rotation={[cabinet * .035, 0, 0]}>
        <mesh><boxGeometry args={[.9, .43, .62]} /><meshStandardMaterial color="#15191e" roughness={.85} /></mesh>
        <mesh position={[0, 0, .32]}><boxGeometry args={[.79, .32, .025]} /><meshStandardMaterial color="#353d45" roughness={.94} wireframe /></mesh>
      </group>)}
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[.015, .015, 2, 6]} /><meshStandardMaterial color="#73808d" /></mesh>
    </group>)}
    {Array.from({ length: 12 }, (_, panel) => <mesh key={`deck-seam-${panel}`} position={[(panel - 5.5) * .9, .818, -5]}>
      <boxGeometry args={[.013, .006, 5.5]} /><meshStandardMaterial color="#030507" roughness={.95} />
    </mesh>)}
    {[-1, 1].map((side) => <group key={`rail-${side}`} position={[side * 5.3, 1.13, -6.5]}>
      {[0, 1, 2, 3].map((post) => <mesh key={post} position={[0, 0, post * .8]}><cylinderGeometry args={[.022, .022, .64, 8]} /><meshStandardMaterial color="#58616c" metalness={.6} roughness={.5} /></mesh>)}
      <mesh position={[0, .32, 1.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.025, .025, 2.45, 8]} /><meshStandardMaterial color="#58616c" metalness={.6} roughness={.5} /></mesh>
    </group>)}
    {[-14, 14].map((x) => <mesh key={x} position={[x, 8.6, 5]}><boxGeometry args={[.3, .4, 39]} /><meshStandardMaterial color="#343c4a" /></mesh>)}
  </group>;
}

export const CENTER_FIXTURES: [number, number, number][] = [
  [-2.85, 5.4, -4.48], [-1.45, 6.4, -4.48],
  [-1.45, 4.4, -4.48], [1.45, 4.4, -4.48],
  [1.45, 6.4, -4.48], [2.85, 5.4, -4.48],
];

const emitters = rigRows.flatMap((z) =>
  [-9.7, -6.3, -1.7, 1.7, 6.3, 9.7].map((x) => [x, 7.98, z]),
).concat(Array.from({ length: 12 }, (_, index) => [(index - 5.5) * .94, .85, -4.1]), CENTER_FIXTURES);

export const ARENA_PATTERNS = ["Fan sweep", "Cross lattice", "Vertical wave", "Scissor", "Ripple chase", "Parallel sheet", "Center burst", "Split wings", "Twin tunnels", "Diamond cage", "Canopy arch", "Low horizon", "Clockwise fan", "Counterclockwise fan", "Counter-rotating wings", "Orbit tunnel", "Butterfly wings", "Tilted blades", "Woven rings", "Radial crown", "Wide fan", "Ceiling fan", "Vertical fan", "Static fan", "Vertical columns", "Mirrored ceiling fans", "Balcony lattice", "Parallel rake", "Crossfire canopy"] as const;
type ArenaBank = "top" | "bottom";

const choreography = [
  { top: 10, bottom: 11, gate: "answer" },
  { top: 4, bottom: 2, gate: "ripple" },
  { top: 3, bottom: 0, gate: "mirror" },
  { top: 6, bottom: 1, gate: "punctuate" },
  { top: 2, bottom: 5, gate: "answer" },
  { top: 7, bottom: 4, gate: "ripple" },
  { top: 1, bottom: 3, gate: "mirror" },
  { top: 0, bottom: 6, gate: "punctuate" },
  { top: 8, bottom: 9, gate: "ripple" },
  { top: 9, bottom: 8, gate: "mirror" },
  { top: 5, bottom: 7, gate: "answer" },
  { top: 11, bottom: 10, gate: "punctuate" },
  { top: 12, bottom: 13, gate: "mirror" },
  { top: 14, bottom: 15, gate: "ripple" },
  { top: 13, bottom: 12, gate: "answer" },
  { top: 15, bottom: 14, gate: "punctuate" },
  { top: 16, bottom: 17, gate: "answer" },
  { top: 18, bottom: 19, gate: "ripple" },
  { top: 19, bottom: 16, gate: "mirror" },
  { top: 17, bottom: 18, gate: "punctuate" },
] as const;

function shutter(gate: (typeof choreography)[number]["gate"], beat: number, bank: ArenaBank, lane: number, row: number) {
  const count = Math.floor(beat);
  const fraction = beat % 1;
  const bottom = bank === "bottom";
  const pair = Math.min(lane, 5 - lane);
  switch (gate) {
    case "answer":
      return (count % 2 === 1) === bottom && fraction >= pair * .12 && fraction < .72;
    case "ripple": {
      const step = Math.floor(beat * 4);
      const head = (step + (bottom ? 1 : 0)) % 3;
      return (pair + row) % 3 === head;
    }
    case "mirror":
      return (pair === 1) === ((count + Number(bottom)) % 2 === 0) && fraction < .58;
    case "punctuate":
      return count % 4 === (bottom ? 2 : 0) && fraction < .36;
  }
}

export function ArenaLasers({ flash, frame, playing, pattern, banks, cues, intensity, spread, density, motion, speed, colors, width, fixtures = emitters, rays = 5 }: {
  fixtures?: number[][]; rays?: number; flash: boolean; frame: ArenaFrame; playing: boolean;
  pattern: number | null; banks: Record<ArenaBank, number | null>; cues: ArenaCue[];
  intensity: number; spread: number; density: number; motion: number; speed: number; colors: string[]; width: number;
}) {
  const scannerClock = useRef({ beat: 0, phase: 0 });
  const beams = useRef<THREE.InstancedMesh>(null);
  const transform = useMemo(() => new THREE.Object3D(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const palette = useMemo(() => colors.map((color) => new THREE.Color(color)), [colors]);
  const white = useMemo(() => new THREE.Color("#e9f3ff"), []);
  const blue = useMemo(() => new THREE.Color("#3888ff"), []);

  useFrame(() => {
    const mesh = beams.current;
    if (!mesh) return;
    const { time, bpm, cue: programmed, attackIndex, beat: currentBeat, hit: beatHit, attack, dropBeat } = frame.current;
    const clock = scannerClock.current;
    const beatDelta = currentBeat - clock.beat;
    if (Math.abs(beatDelta) > .5) clock.phase = currentBeat * speed;
    else if (playing && beatDelta > 0) clock.phase += beatDelta * speed;
    clock.beat = currentBeat;
    const scannerBeat = clock.phase;
    const drop = dropBeat !== null;
    const barBeat = currentBeat % 4;
    const scene = programmed ?? choreography[Math.floor(currentBeat / 4) % choreography.length];
    const phraseRest = Math.floor(currentBeat / 4) % 4 === 3 && barBeat >= 3.5;
    let cue: ArenaCue | undefined;
    for (const entry of cues) {
      if (entry.beat > currentBeat) break;
      cue = entry;
    }
    const master = pattern !== null ? pattern : cue ? Number(cue.look === "lattice") : null;

    fixtures.forEach(([x, y, z], index) => {
      const floor = y < (fixtures === emitters ? 2 : 5.5);
      const center = fixtures === emitters && index >= 36;
      const bank = floor ? "bottom" : "top";
      const baseLook = center && programmed ? programmed.center : drop && !programmed ? (floor ? 3 : 1) : scene[bank];
      const auto = fixtures === emitters ? baseLook : [24,27,25,26,28,20,22][baseLook % 7];
      const look = flash ? 1 : (center ? master : banks[bank] ?? master) ?? auto;
      const motionBeat = programmed ? showMotionAt(programmed,time,bpm) * speed : scannerBeat;
      const attackStep = (attackIndex % 4) * Math.PI / 2;
      const phase = motionBeat * Math.PI + (floor ? Math.PI / 2 : 0) + attackStep * .65;
      const lane = index % 6;
      const pair = Math.min(lane, 5 - lane);
      const side = Math.sign(x);
      const row = Math.floor(index / 6);
      const gate = scene.gate;
      const dropGate = dropBeat !== null && (dropBeat < .48 || (dropBeat >= .75 && dropBeat < 1.55 && (pair + Number(floor)) % 2 === 0));
      const accent = attack > .42 && (pair + row) % 3 === 1;
      const preview = !programmed && time === 0;
      const open = flash || (preview ? pair === 1 && row % 2 === 0 : (drop
        ? dropGate
        : !phraseRest && (accent || shutter(gate, currentBeat, bank, lane, row))));
      const programEnabled = preview || flash || !programmed || programmed.lasers === "all"
        || programmed.lasers === (center ? "center" : bank);
      const level = programEnabled && open && Math.min(lane, 5 - lane) < Math.ceil(density * 3) ? intensity * (.72 + beatHit * .28) : 0;
      const autoColors = programmed?.section === "Drop" ? ["#ffffff", "#00e5ff", "#9a70ff"] : programmed?.section === "Build" ? ["#ff3d98", "#ff9100", "#9a70ff"] : ["#00e5ff", "#2a8cff", "#45ffe2"];
      const color = flash ? white : palette[(pair + row) % palette.length] ?? (programmed ? blue.set(autoColors[(pair + row) % 3]) : drop || look === 1 ? white : blue);
      for (let ray = 0; ray < rays; ray++) {
        const fanIndex = (ray / (rays - 1) - .5) * 4;
        const fan = side * fanIndex * (.4 + spread * 2.1);
        const rayOffset = look === 5 ? fan * .18 : look === 6 ? fan * 2.2 : fan;
        const wave = Math.sin(phase + (look === 2 || look === 4 ? pair * .72 + ray * .33 : 0));
        const scissor = Math.cos(phase);
        const horizontal = look === 1 ? -x * 1.25
          : look === 3 ? x * scissor
          : look === 6 ? -x * .24
          : look === 7 ? x * 1.95
          : look === 8 ? side * (floor ? 3.2 : 6.4)
          : look === 9 ? side * (2.2 + pair * 2.1)
          : look === 10 ? x * 1.32
          : look === 11 ? x * 1.48 : x;
        const rotation = motionBeat * Math.PI * .5 * motion;
        const roll = look === 16 ? side * Math.sin(rotation) * 1.15
          : look === 17 ? side * (Math.PI / 3 + Math.sin(rotation * .5) * .32)
          : rotation * (look === 12 ? -1 : look === 14 || look === 18 ? side : 1);
        const orbit = look === 15 || look === 18 || look === 19;
        const angle = orbit ? roll + ray * Math.PI * .4 + pair * .35 : roll;
        const orbitRadius = (look === 19 ? 1.6 + pair * .75 : 1.2) + spread * 2.6;
        const rotatedX = orbit ? Math.cos(angle) * orbitRadius : Math.cos(angle) * rayOffset;
        const rotatedY = orbit ? Math.sin(angle) * orbitRadius * (look === 18 ? .44 : 1) : Math.sin(angle) * rayOffset;
        const rotating = look >= 12;
        let endX = horizontal + (rotating ? rotatedX : rayOffset) + side * Math.sin(phase * .5 + pair * .36) * motion;
        const lift = (look === 3 ? scissor : wave) * (floor ? 2.1 : 2.6) * motion;
        const kick = beatHit * (floor ? 1.15 : -1.35) * motion;
        const elevation = look === 5 ? (floor ? 1.7 : 7.2)
          : look === 9 ? 6.4 - pair * 1.8
          : look === 10 ? 7.7 - pair * 1.2
          : look === 11 ? 1.1 : floor ? 3.15 : 5.25;
        let endY = Math.max(.4, elevation + (rotating ? rotatedY : fanIndex * (look === 5 || look === 11 ? .07 : .48)) + lift * (look === 11 ? .25 : 1) + kick);
        if (look >= 20) {
          const fanPosition = ray / (rays - 1) * 2 - 1;
          const fanWidth = 7 + spread * 12;
          endX = look === 22 ? x + Math.sin(phase * .3) * motion : x + fanPosition * fanWidth;
          endY = look === 22 ? 7 + fanPosition * 6 : look === 21 ? 12 + Math.sin(phase * .25) * .6 : (floor ? 6.8 : 4.1) + (look === 23 ? 0 : Math.sin(phase * .25) * 2 * motion);
        }
        let endZ = fixtures === emitters ? 21.8 : 24;
        let rayEnabled = true;
        const fanUnit = ray / (rays - 1) * 2 - 1;
        if (look === 24) { // One clean up/down column from each projector.
          endX=x;endZ=z;endY=ray===0 ? .4 : 14.4;rayEnabled=ray<2;
        }
        if (look === 25) { // Paired fans meet above the center aisle.
          endX=side*(1+Math.abs(fanUnit)*12);endY=10.4+fanUnit*2.2;endZ=24;
        }
        if (look === 26) { // Lower balcony projectors weave a flat plane.
          endX=-x+fanUnit*7;endY=floor ? 4.5 : 8.1;endZ=24;
        }
        if (look === 27) { endX=x;endY=floor ? 6.5 : 2.2;rayEnabled=ray===0; }
        if (look === 28) { endX=-x+fanUnit*8;endY=floor ? 10.2 : 4.2;endZ=24; }
        if (fixtures !== emitters) {
          // Terminate the ray at the hall boundary, retaining the fan angle.
          let fraction = 1;
          if (endX > 14.6) fraction = Math.min(fraction,(14.6-x)/(endX-x));
          if (endX < -14.6) fraction = Math.min(fraction,(-14.6-x)/(endX-x));
          if (endY > 14.5) fraction = Math.min(fraction,(14.5-y)/(endY-y));
          if (endY < .4) fraction = Math.min(fraction,(.4-y)/(endY-y));
          endX=x+(endX-x)*fraction;endY=y+(endY-y)*fraction;endZ=z+(endZ-z)*fraction;
        }
        direction.set(endX - x, endY - y, endZ - z);
        transform.position.set((x + endX) / 2, (y + endY) / 2, (z + endZ) / 2);
        transform.scale.setScalar(0);
        if (level > 0 && rayEnabled) transform.scale.set(.009 * width, direction.length(), .009 * width);
        transform.quaternion.setFromUnitVectors(up, direction.normalize());
        transform.updateMatrix();
        const beamIndex = index * rays + ray;
        mesh.setMatrixAt(beamIndex, transform.matrix);
        mesh.setColorAt(beamIndex, tint.copy(color).multiplyScalar(level * (drop ? 1.65 : 1.25)));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={beams} args={[undefined, undefined, fixtures.length * rays]} frustumCulled={false}>
    <cylinderGeometry args={[1, 1, 1, 5, 1, true]} />
    <meshBasicMaterial transparent opacity={.78} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </instancedMesh>;
}
