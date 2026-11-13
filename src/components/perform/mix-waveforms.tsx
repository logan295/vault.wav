"use client";
import { useEffect, useRef, useState } from "react";
import { useWaveScrub } from "./use-wave-scrub";
import { drawWaveform } from "@/lib/perform/draw-waveform";
import type { PerformEngine } from "@/lib/perform/engine";
const COLORS = ["#dfbd5f", "#6fb7eb"];
function MixingLane({
  engine,
  index,
  beats,
  select,
  load,
}: {
  engine: PerformEngine;
  index: number;
  beats: number;
  select: () => void;
  load: (index:number,id:string)=>void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    d = engine.decks[index],
    position = engine.position(index);
  // A common musical time scale keeps synced decks' beat spacing identical.
  const span = ((beats * 60) / engine.clock.bpm) * engine.desiredRate(index);
  const scrub = useWaveScrub(engine, index, span, ()=>engine.position(index)-span*.5);
  useEffect(() => {
    const element=canvas.current;
    const c=element?.getContext("2d");
    if(!element||!c)return;
    let width=0,height=0,ratio=1,frame=0;

    const resize=()=>{
      const bounds=element.getBoundingClientRect();
      ratio=Math.min(2,window.devicePixelRatio||1);
      width=bounds.width;height=bounds.height;
      element.width=Math.max(1,Math.round(width*ratio));
      element.height=Math.max(1,Math.round(height*ratio));
      c.setTransform(ratio,0,0,ratio,0,0);

    };
    const observer=new ResizeObserver(resize);observer.observe(element);resize();
    const paint=()=>{
      const deck=engine.decks[index];
      const position=engine.position(index);
      const span=beats*60/engine.clock.bpm*engine.desiredRate(index);
      const start=position-span*.5;
      // Use the audio clock at the display refresh rate, independent of React's UI timer.
      if(width>0&&height>0){
        if(deck.buffer){
          drawWaveform(c,deck.buffer,deck.bands,start,span,COLORS[index],width,height,ratio);
          c.globalCompositeOperation='destination-over';c.fillStyle='#0b1012';c.fillRect(0,0,width,height);c.globalCompositeOperation='source-over';
        } else {c.fillStyle='#0b1012';c.fillRect(0,0,width,height);}
        const anchor=deck.track?.performance?.firstBeatSecs??(deck.track?.rekordbox?.firstBeatMs||0)/1000;
        const beat=60/(deck.track?.bpm||engine.clock.bpm);
        // An opaque ruler separates the bar labels from the waveform transients.
        c.fillStyle='#0b1012';c.fillRect(0,0,width,18);
        const first=Math.ceil((start-anchor)/beat);
        const subdivisions=beats<=8?2:1;
        for(let n=first-1;n<=first+Math.ceil(span/beat)+1;n++){
          for(let sub=0;sub<subdivisions;sub++){
            const time=anchor+(n+sub/subdivisions)*beat;
            if(time<0)continue;
            const x=(time-start)/span*width;
            if(x<0||x>width)continue;
            const bar=n%4===0&&sub===0;
            const lineWidth=bar?2:1/ratio;
            const aligned=Math.round(x*ratio)/ratio;
            c.fillStyle=bar?'#000000c9':'#00000066';c.fillRect(aligned-1,18,lineWidth+2,height-18);
            c.fillStyle=bar?'#eff7f0d9':sub===0?'#e7f1eb70':'#c6dad32e';c.fillRect(aligned,18,lineWidth,height-18);
            c.fillRect(aligned,bar?0:12,lineWidth,bar?height:6);
            if(sub===0&&(bar||beats<=16)){
              c.font=`${bar?'600':'400'} 10px system-ui`;
              c.fillStyle=bar?'#f0f7f3':'#95aaa1';
              c.fillText(`${Math.floor(n/4)+1}.${((n%4)+4)%4+1}`,aligned+5,12);
            }
          }
        }
        if(deck.settings.loop){const a=(deck.settings.loopStart-start)/span*width,b=((deck.settings.loopEnd??deck.settings.loopStart+deck.settings.loopBars*4*beat)-start)/span*width;c.fillStyle='#e6ae3926';c.fillRect(a,18,b-a,height-18);c.strokeStyle='#e6ae39';c.strokeRect(a,19,b-a,height-20);c.fillStyle='#f2cc79';c.font='600 9px system-ui';c.fillText('LOOP',Math.max(4,a+5),30);}
        const cues=[{time:deck.settings.cue,label:'CUE'},...deck.hotCues.flatMap((time,i)=>time===null?[]:[{time,label:String.fromCharCode(65+i)}])];
        for(const cue of cues){
          const x=(cue.time-start)/span*width;
          if(x<0||x>width)continue;
          c.fillStyle=COLORS[index];c.fillRect(x,height-17,2,17);
          c.font='600 9px system-ui';c.fillText(cue.label,x+4,height-4);
        }

      }
      frame=requestAnimationFrame(paint);
    };
    // A single animation loop owns waveform, grid and cue movement so they stay locked.
    frame=requestAnimationFrame(paint);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  }, [engine,index,beats,d]);
  return (
    <div
      onDragOver={event=>{if(event.dataTransfer.types.includes("application/x-womp-track"))event.preventDefault();}}
      onDrop={event=>{event.preventDefault();const id=event.dataTransfer.getData("application/x-womp-track");if(id)load(index,id);}}
      className="dj-mix-lane"
      style={{ "--lane-color": COLORS[index] } as React.CSSProperties}
    >
      <button
        className="dj-mix-track"
        onClick={select}
        title={`Select deck ${index + 1}`}
      >
        <b>{index + 1}</b>
        <div>
          <strong>{d.track?.title || `Load Deck ${index + 1}`}</strong>
          <small>
            {d.track?.artist || d.track?.sourceName || "Choose a track below"} ·{" "}
            {(
              (d.track?.bpm || engine.clock.bpm) * engine.desiredRate(index)
            ).toFixed(2)}{" "}
            BPM · {d.bands ? "RGB" : "Preparing RGB…"}
          </small>
        </div>
        <output>
          {Math.floor(position / 60)}:
          {(position % 60).toFixed(1).padStart(4, "0")}
        </output>
      </button>
      <div
        className="dj-mix-wave"
        role="slider"
        tabIndex={d.buffer ? 0 : -1}
        aria-label={`Deck ${index + 1} scrolling mixing waveform`}
        aria-valuemin={0}
        aria-valuemax={d.buffer?.duration || 0}
        aria-valuenow={Math.round(position * 100) / 100}
        {...scrub}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            engine.beatJump(index, (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 4 : 1));
          }
        }}
      >
        <canvas ref={canvas} aria-hidden="true" />
        <div className="dj-mix-needle" />
        {!d.buffer && (
          <p>
            {d.track ? d.status : "Load a track to see its mixing waveform"}
          </p>
        )}
      </div>
    </div>
  );
}
export function MixingWaveforms({
  engine,
  select,
  load,
}: {
  engine: PerformEngine;
  select: (index: number) => void;
  load: (index:number,id:string)=>void;
}) {
  const [beats, setBeats] = useState(16);
  return (
    <section
      className="dj-mixing-waveforms"
      aria-label="Stacked mixing waveforms"
    >
      <header>
        <b>MIXING WAVEFORMS</b>
        <span className="dj-rgb-legend">
          <i /> LOW <i /> MID <i /> HIGH
        </span>
        <span>Drag to scrub · Click to seek · {beats / 4} bars · Drop tracks onto either lane</span>
        <button
          aria-label="Mixing waveforms zoom out"
          disabled={beats === 64}
          onClick={() => setBeats(Math.min(64, beats * 2))}
        >
          −
        </button>
        <button
          aria-label="Mixing waveforms zoom in"
          disabled={beats === 4}
          onClick={() => setBeats(Math.max(4, beats / 2))}
        >
          +
        </button>
      </header>
      {[0, 1].map((index) => (
        <MixingLane
          key={index}
          engine={engine}
          index={index}
          beats={beats}
          select={() => select(index)}
          load={load}
        />
      ))}
    </section>
  );
}
