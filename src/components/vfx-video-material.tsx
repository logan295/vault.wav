import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type SongCue } from "@/lib/local-audio/song-show";
import * as THREE from "three";

export type VideoFit = "fit" | "fill";

const vertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragment = `
uniform sampler2D videoMap;
uniform float sourceAspect;
uniform float screenAspect;
uniform float fillScreen;
uniform float diamond;
uniform float brightness;
uniform float saturation;
uniform float mirror;
varying vec2 vUv;
void main() {
  vec2 uv = vUv - 0.5;
  // Diamond geometry is rotated 45 degrees. Sample in screen space to keep the video upright.
  if (diamond > 0.5) uv = vec2(uv.x - uv.y, uv.x + uv.y) * 0.5;
  if (mirror > 0.5) uv.x = abs(uv.x);
  float ratio = screenAspect / max(0.001, sourceAspect);
  vec2 fitScale = vec2(max(1.0, ratio), max(1.0, 1.0 / ratio));
  vec2 fillScale = vec2(min(1.0, ratio), min(1.0, 1.0 / ratio));
  uv = uv * mix(fitScale, fillScale, fillScreen) + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    vec3 color = pow(texture2D(videoMap, uv).rgb, vec3(2.2));
    color=mix(vec3(dot(color,vec3(.2126,.7152,.0722))),color,saturation);
    gl_FragColor = vec4(color * brightness, 1.0);
  }
  #include <colorspace_fragment>
}
`;

// A wall repeated across screens needs one decoder, not one per mesh.
const videoPool=new Map<string,{video:HTMLVideoElement;texture:THREE.VideoTexture;users:number}>();
function acquireVideo(src:string){
  const existing=videoPool.get(src);if(existing){existing.users++;return existing;}
  const video=document.createElement("video");video.muted=true;video.loop=true;video.playsInline=true;video.preload="auto";video.src=src;
  const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
  const entry={video,texture,users:1};videoPool.set(src,entry);video.load();return entry;
}
function releaseVideo(src:string){
  const entry=videoPool.get(src);if(!entry||--entry.users>0)return;
  entry.video.pause();entry.video.removeAttribute("src");entry.video.load();entry.texture.dispose();videoPool.delete(src);
}

export function VfxVideoMaterial({ src, playing, aspect, diamond, fit, power, hit, speed, depthTest, clock, rate = 1, saturation = 1, mirror = false }: { rate?: number; saturation?: number; mirror?: boolean;
  src: string; playing: boolean; aspect: number; diamond: boolean; fit: VideoFit;
  clock?: () => {time:number;bpm:number;cue?:SongCue}; power: number; hit: () => number; speed: number; depthTest: boolean;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transportClock=useRef({time:-1,phase:0,lastSeek:0});
  const playingRef = useRef(playing);
  const uniforms = useMemo(() => ({
    videoMap: { value: null as THREE.VideoTexture | null },
    sourceAspect: { value: 16 / 9 }, screenAspect: { value: 1 },
    fillScreen: { value: 0 }, diamond: { value: 0 }, brightness: { value: 1 }, saturation:{value:1}, mirror:{value:0},
  }), []);

  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => {
    const {video,texture}=acquireVideo(src);
    videoRef.current = video;
    transportClock.current={time:-1,phase:0,lastSeek:0};
    const ready = () => {
      if (!material.current) return;
      material.current.uniforms.videoMap.value = texture;
      material.current.uniforms.sourceAspect.value = video.videoWidth / Math.max(1, video.videoHeight);
      if (playingRef.current) void video.play().catch(() => undefined);
      else if(video.currentTime === 0 && video.duration > .5)video.currentTime=.5;
    };
    video.addEventListener("loadeddata", ready);
    if(video.readyState>=2)ready();
    return () => {
      video.removeEventListener("loadeddata", ready);
      releaseVideo(src);
      if (videoRef.current === video) videoRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) void video.play().catch(() => undefined);
    else video.pause();
  }, [playing, src]);

  useFrame(() => {
    const surface = material.current;
    if (!surface) return;
    surface.uniforms.screenAspect.value = Math.max(.001, aspect);
    surface.uniforms.fillScreen.value = Number(fit === "fill");
    surface.uniforms.diamond.value = Number(diamond);
    surface.uniforms.brightness.value = Math.max(0,power) * (.8 + hit() * .2);
    surface.uniforms.saturation.value=saturation;surface.uniforms.mirror.value=Number(mirror);
    const video=videoRef.current;
    if (!video) return;
    if (clock && Number.isFinite(video.duration) && video.duration>0) {
      const transport=clock();
      const authoredBpm=src.includes("eyeinfection") ? 150 : src.includes("/ig-") ? 120 : null;
      const playbackRate=THREE.MathUtils.clamp(rate*(authoredBpm ? transport.bpm/authoredBpm : 1),.1,4);
      const sync=transportClock.current;
      const delta=transport.time-sync.time;
      const seek=sync.time<0 || Math.abs(delta)>1;
      if(seek)sync.phase=transport.time*playbackRate;
      else if(playing && delta>0)sync.phase+=delta*playbackRate;
      sync.time=transport.time;
      const target=((sync.phase%video.duration)+video.duration)%video.duration;
      const drift=((target-video.currentTime+video.duration*1.5)%video.duration)-video.duration*.5;
      const now=performance.now();
      if(playing && !video.seeking && video.readyState>=2 && (seek || (Math.abs(drift)>.45 && now-sync.lastSeek>1000))) { video.currentTime=target;sync.lastSeek=now; }
      video.playbackRate=playbackRate;
    } else video.playbackRate = THREE.MathUtils.clamp(rate*(.65 + speed * 1.5), .1, 4);
  });
  return <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} toneMapped={false} depthTest={depthTest} />;
}
