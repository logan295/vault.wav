"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef,useState } from "react";
import { Canvas,useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { KETAMIND_FAMILIES, KETAMIND_VISUALS } from "@/lib/visuals/ketamind";
import { KetamindMaterial,type KetamindClock } from "./ketamind-material";
import { useLocalPlayback } from "./local-playback-provider";
import styles from './ketamind-gallery.module.css';
function Preview({index,bpm,playing,source,revision,onBeat}:{index:number;bpm:number;playing:boolean;source:'preview'|'library';revision:number;onBeat:(beat:number)=>void}){
 const player=useLocalPlayback();
 const reported=useRef(0);
 const beat=useRef(0),revisionRef=useRef(revision);
 const transport=useRef<KetamindClock>({beat:0,time:0,bpm});
 useFrame((_,delta)=>{
  if(revisionRef.current!==revision){beat.current=0;revisionRef.current=revision;}
  if(source==='library'){
   const sample=player.samplePlayback();const tempo=player.currentTrack?.rekordbox?.bpm||player.currentTrack?.bpm||bpm;
   const time=sample.time+(sample.advancing?Math.min(2.5,Math.max(0,(Date.now()-sample.sampledAt)/1000))*(sample.rate??1):0);
   const b=Math.max(0,time-(player.currentTrack?.rekordbox?.firstBeatMs??0)/1000)*tempo/60;
   transport.current={beat:b,time,bpm:tempo};
  }else{
   if(playing)beat.current+=Math.min(delta,.1)*bpm/60;
   transport.current={beat:beat.current,time:beat.current*60/bpm,bpm,dropBeat:beat.current>=32&&beat.current<34?beat.current-32:null};
  }
  if(Math.abs(transport.current.beat-reported.current)>.25){reported.current=transport.current.beat;onBeat(transport.current.beat);}
 });
 return <mesh frustumCulled={false}><planeGeometry args={[2,2]} /><KetamindMaterial index={index} clock={()=>transport.current} aspect={16/9} depthTest={false} screenSpace /></mesh>;
}
export function KetamindGallery({collection}:{collection?:string}){
 const [family,setFamily]=useState('all');
 const allVisuals=collection?KETAMIND_VISUALS.filter(v=>v.group===collection):KETAMIND_VISUALS;
 const visuals=allVisuals.filter(v=>family==='all'||v.family===family);
 const [currentBeat,setCurrentBeat]=useState(0);
 const [selected,setSelected]=useState(collection?15:0),[bpm,setBpm]=useState(140),[playing,setPlaying]=useState(true),[revision,setRevision]=useState(0),[source,setSource]=useState<'preview'|'library'>('preview');
 const player=useLocalPlayback(),reduced=useReducedMotion();const visual=KETAMIND_VISUALS[selected];
 return <main className={styles.gallery}>
  <header><Link href="/">← vault.wav</Link><span>Live visual collection</span></header>
  <div className={styles.intro}><h1>{collection?"Just visuals.":"Ketamind."}<br/><em>Get weird.</em></h1><p>{collection?"Ten new worlds. No logos.":"Twenty-five different worlds. One shared beat."}<br/>Select a visual to audition its rhythm, then find the pack in the show console.</p></div>
  <section className={styles.audition} aria-label="Visual audition">
   <div className={styles.screen} aria-label={`Preview: ${visual.label}`}><Canvas orthographic camera={{position:[0,0,10],zoom:100}} gl={{antialias:true,alpha:false}} dpr={[1,1.5]}><Preview index={selected} bpm={bpm} playing={playing&&!reduced} source={source} revision={revision} onBeat={setCurrentBeat}/></Canvas></div>
   <div className={styles.details}><div><p style={{color:visual.color}}>{visual.familyLabel}</p><h2>{visual.label}</h2><p>{visual.pairing}</p></div><div className={styles.controls}>
    <label>Clock<select aria-label="Audition clock" value={source} onChange={e=>setSource(e.target.value as 'preview'|'library')}><option value="preview">Preview beat</option><option value="library">Playing library track</option></select></label>
    {source==='preview'?<><label>BPM<input aria-label="Preview BPM" type="number" min={60} max={200} value={bpm} onChange={e=>setBpm(Math.min(200,Math.max(60,Number(e.target.value)||140)))}/></label><button onClick={()=>setPlaying(v=>!v)}>{playing?'Pause preview':'Play preview'}</button><button onClick={()=>setRevision(v=>v+1)}>Reset beat</button></>:<p role="status">{player.currentTrack?`${player.currentTrack.title} · ${player.playing?'Playing':'Paused'}`:'Start a track in your library to audition its beat.'}</p>}
   </div></div>
   <p className={styles.note}><output aria-label="Current preview beat">Beat {currentBeat.toFixed(2)}</output> · {source==='preview'?'Preview clock only · no audio · first drop accent at beat 32.':'Uses the library playhead and imported beat grid. Live rekordbox timing is available in the main show console.'} {reduced?'Motion paused by your reduced-motion preference.':''}</p>
  </section>
  <div className={styles.filters} aria-label="Visual rhythm filters"><button aria-pressed={family==='all'} onClick={()=>setFamily('all')}>All {allVisuals.length} worlds</button>{Object.entries(KETAMIND_FAMILIES).map(([id,f])=><button key={id} style={{color:f.color}} aria-pressed={family===id} onClick={()=>setFamily(id)}>{f.label}</button>)}</div>
  <nav className={styles.grid} aria-label="Ketamind visuals">{visuals.map(v=><button key={v.id} aria-pressed={v.index===selected} aria-label={`Preview ${v.label}`} onClick={()=>setSelected(v.index)} style={{'--accent':v.color} as React.CSSProperties}><span className={styles.thumbnail}><Image unoptimized src={v.poster} alt="" fill sizes="(max-width:640px) 50vw, 25vw"/></span><span style={{color:v.color,fontSize:11,fontWeight:700}}>{v.familyLabel}</span><strong>{v.label}</strong><small>{v.pairing}</small></button>)}</nav>
  <footer>In the live console: Visuals → Collection → {collection??"Ketamind · Wonky 15 / Unbranded 10"}. All visuals respond to the same song transport as the lighting and lasers.</footer>
 </main>;
}
