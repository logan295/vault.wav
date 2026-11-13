import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { showMotionAt, type SongCue } from "@/lib/local-audio/song-show";
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
varying vec2 vUv;
void main() {
  vec2 uv = vUv - 0.5;
  // Diamond geometry is rotated 45 degrees. Sample in screen space to keep the video upright.
  if (diamond > 0.5) uv = vec2(uv.x - uv.y, uv.x + uv.y) * 0.5;
  float ratio = screenAspect / max(0.001, sourceAspect);
  vec2 fitScale = vec2(max(1.0, ratio), max(1.0, 1.0 / ratio));
  vec2 fillScale = vec2(min(1.0, ratio), min(1.0, 1.0 / ratio));
  uv = uv * mix(fitScale, fillScale, fillScreen) + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    vec3 color = pow(texture2D(videoMap, uv).rgb, vec3(2.2));
    gl_FragColor = vec4(color * brightness, 1.0);
  }
  #include <colorspace_fragment>
}
`;

export function VfxVideoMaterial({ src, playing, aspect, diamond, fit, power, hit, speed, depthTest, clock }: {
  src: string; playing: boolean; aspect: number; diamond: boolean; fit: VideoFit;
  clock?: () => {time:number;bpm:number;cue?:SongCue}; power: number; hit: () => number; speed: number; depthTest: boolean;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playingRef = useRef(playing);
  const uniforms = useMemo(() => ({
    videoMap: { value: null as THREE.VideoTexture | null },
    sourceAspect: { value: 16 / 9 }, screenAspect: { value: 1 },
    fillScreen: { value: 0 }, diamond: { value: 0 }, brightness: { value: 1 },
  }), []);

  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;
    videoRef.current = video;
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    const ready = () => {
      if (!material.current) return;
      material.current.uniforms.videoMap.value = texture;
      material.current.uniforms.sourceAspect.value = video.videoWidth / Math.max(1, video.videoHeight);
      if (playingRef.current) void video.play().catch(() => undefined);
    };
    video.addEventListener("loadeddata", ready);
    video.load();
    return () => {
      video.removeEventListener("loadeddata", ready);
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture.dispose();
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
    surface.uniforms.brightness.value = Math.min(1.3, .55 + power * .35 + hit() * .3);
    const video=videoRef.current;
    if (!video) return;
    if (clock && Number.isFinite(video.duration) && video.duration>0) {
      const transport=clock();
      // The supplied EYEINFECTION clips are authored at 150 BPM. Other clips
      // retain their natural speed at rate 1, with no invented source BPM.
      const sourceBpm=src.includes("eyeinfection") ? 150 : transport.bpm;
      const target=(showMotionAt(transport.cue,transport.time,transport.bpm)*60/sourceBpm)%video.duration;
      const drift=((target-video.currentTime+video.duration*1.5)%video.duration)-video.duration*.5;
      if (!video.seeking && video.readyState>=2 && Math.abs(drift)>.14) video.currentTime=target;
      video.playbackRate=THREE.MathUtils.clamp((transport.cue?.rate ?? 1)*transport.bpm/sourceBpm,.1,4);
    } else video.playbackRate = THREE.MathUtils.clamp(.65 + speed * 1.5, .5, 1.5);
  });
  return <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} toneMapped={false} depthTest={depthTest} />;
}
