"use client";
import { useEffect, useRef, useState } from "react";
import { useWaveScrub } from "./use-wave-scrub";
import { drawWaveform } from "@/lib/perform/draw-waveform";
import type { Deck, PerformEngine } from "@/lib/perform/engine";
export function DeckWaveform({
  deck,
  engine,
  index,
  compact = false,
  labelPrefix = "",
}: {
  deck: Deck;
  engine: PerformEngine;
  index: number;
  compact?: boolean;
  labelPrefix?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlays=useRef<HTMLDivElement>(null),needle=useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState(0),
    [follow, setFollow] = useState(false);
  const duration = deck.buffer?.duration || 1,
    position = engine.position(index),
    span = duration / zoom;
  const start = Math.max(
    0,
    Math.min(duration - span, follow ? position - span * 0.3 : pan * duration),
  );
  const scrub = useWaveScrub(engine, index, span, start, compact ? 1 : -1);
  const anchor =
      deck.track?.performance?.firstBeatSecs ??
      (deck.track?.rekordbox?.firstBeatMs || 0) / 1000,
    beat = 60 / (deck.track?.bpm || 128);
  useEffect(() => {
    const element=canvas.current,c=element?.getContext('2d');
    if(!element||!c)return;
    let width=0,height=0,ratio=1,frame=0,lastStart=NaN,lastBands=deck.bands;
    const resize=()=>{
      const bounds=element.getBoundingClientRect();width=bounds.width;height=bounds.height;
      ratio=Math.min(2,window.devicePixelRatio||1);
      element.width=Math.max(1,Math.round(width*ratio));element.height=Math.max(1,Math.round(height*ratio));
      c.setTransform(ratio,0,0,ratio,0,0);lastStart=NaN;
    };
    const observer=new ResizeObserver(resize);observer.observe(element);resize();
    const paint=()=>{
      const position=engine.position(index);
      const frameStart=Math.max(0,Math.min(duration-span,follow?position-span*.3:pan*duration));
      if(width>0&&height>0){
        if(frameStart!==lastStart||lastBands!==deck.bands){
          c.clearRect(0,0,width,height);
          if(deck.buffer)drawWaveform(c,deck.buffer,deck.bands,frameStart,span,["#e0b952","#77b4ec","#ac8adf","#65c892"][index],width,height,ratio);
          lastStart=frameStart;lastBands=deck.bands;
        }
        if(overlays.current){
          const renderedStart=Number(overlays.current.dataset.start);
          overlays.current.style.transform=`translate3d(${(renderedStart-frameStart)/span*width}px,0,0)`;
        }
        if(needle.current){
          needle.current.style.left=`${(position-frameStart)/span*100}%`;
          needle.current.style.visibility=position>=frameStart&&position<=frameStart+span?'visible':'hidden';
        }
      }
      frame=requestAnimationFrame(paint);
    };
    frame=requestAnimationFrame(paint);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  }, [deck,engine,index,duration,span,follow,pan]);
  const markers = [
    { time: deck.settings.cue, label: "CUE", main: true },
    ...deck.hotCues.flatMap((time, i) =>
      time === null
        ? []
        : [{ time, label: String.fromCharCode(65 + i), main: false }],
    ),
  ];
  const tickStep = Math.max(1, Math.ceil(span / beat / 90));
  const first = Math.ceil((start - anchor) / beat / tickStep) * tickStep;
  const ticks = Array.from(
    { length: Math.min(100, Math.ceil(span / beat / tickStep) + 1) },
    (_, i) => first + i * tickStep,
  )
    .map((n) => ({ n, time: anchor + n * beat }))
    .filter((t) => t.time >= start && t.time <= start + span);
  return (
    <div className={`dj-waveform ${compact ? "dj-mini-overview" : ""}`}>
      <div className="dj-wave-tools">
        <b>
          GRID ·{" "}
          {deck.track?.performance?.firstBeatSecs !== undefined ||
          (deck.track?.rekordbox?.firstBeatMs !== null &&
            deck.track?.rekordbox?.firstBeatMs !== undefined)
            ? "Aligned"
            : "Check downbeat"}
        </b>
        <span>{zoom}×</span>
        <button
          aria-label={`${labelPrefix}Deck ${index + 1} zoom out`}
          disabled={zoom === 1}
          onClick={() => setZoom(Math.max(1, zoom / 2))}
        >
          −
        </button>
        <button
          aria-label={`${labelPrefix}Deck ${index + 1} zoom in`}
          disabled={zoom === 128}
          onClick={() => {
            setPan(Math.max(0, (position - span / 4) / duration));
            setZoom(Math.min(128, zoom * 2));
          }}
        >
          +
        </button>
        <button aria-pressed={follow} onClick={() => setFollow(!follow)}>
          Follow
        </button>
      </div>
      <div className="perform-wave dj-detailed-wave" {...scrub}>
        <canvas ref={canvas} aria-hidden="true" />
        <div className="dj-wave-overlays" ref={overlays} data-start={start}>
        {ticks.map((t) => (
          <div
            key={t.n}
            className={`dj-beat-line ${t.n % 4 === 0 ? "bar" : ""}`}
            style={{ left: `${((t.time - start) / span) * 100}%` }}
          >
            {t.n % 4 === 0 && <small>{Math.floor(t.n / 4) + 1}.1</small>}
          </div>
        ))}
        {deck.settings.loop && (
          <div
            className="dj-loop-region"
            style={{
              left: `${Math.max(0, ((deck.settings.loopStart - start) / span) * 100)}%`,
              width: `${Math.max(0, ((Math.min(start + span, deck.settings.loopEnd ?? deck.settings.loopStart + deck.settings.loopBars * 4 * beat) - Math.max(start, deck.settings.loopStart)) / span) * 100)}%`,
            }}
          />
        )}
        {markers
          .filter((m) => m.time >= start && m.time <= start + span)
          .map((m) => (
            <button
              key={m.label}
              className={`dj-cue-marker ${m.main ? "main" : ""}`}
              style={{ left: `${((m.time - start) / span) * 100}%` }}
              aria-label={`${labelPrefix}Deck ${index + 1} marker ${m.label} at ${m.time.toFixed(2)} seconds`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                engine.seek(index, m.time);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div ref={needle} className="perform-playhead" style={{left:`${(position-start)/span*100}%`}} />
        {!deck.buffer && (
          <span>
            {deck.track
              ? deck.status
              : "Load a track to prepare cues and beat grid"}
          </span>
        )}
      </div>
      <label className="dj-wave-pan">
        <span>{start.toFixed(1)}s</span>
        <input
          aria-label={`${labelPrefix}Deck ${index + 1} waveform pan`}
          type="range"
          min={0}
          max={Math.max(0, 1 - 1 / zoom)}
          step={0.0001}
          value={start / duration}
          disabled={zoom === 1}
          onChange={(e) => {
            setFollow(false);
            setPan(Number(e.target.value));
          }}
        />
        <span>{(start + span).toFixed(1)}s</span>
      </label>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.01}
        value={position}
        disabled={!deck.buffer}
        onChange={(e) => engine.seek(index, Number(e.target.value))}
        aria-label={`${labelPrefix}Deck ${index + 1} position`}
        className="sr-only"
      />
    </div>
  );
}
export function TrackPreparation({
  engine,
  index,
}: {
  engine: PerformEngine;
  index: number;
}) {
  const d = engine.decks[index];
  return (
    <details className="dj-preparation">
      <summary>Analyze / edit beat grid</summary>
      <DeckWaveform
        deck={d}
        engine={engine}
        index={index}
        labelPrefix="Preparation "
      />
      <div>
        <button
          disabled={!d.buffer || d.status.startsWith("Analyzing")}
          onClick={() => void engine.analyze(index)}
        >
          Analyze BPM + key
        </button>
        <label>
          Native BPM
          <input
            aria-label={`Deck ${index + 1} native BPM`}
            key={`${d.track?.id}-${d.track?.bpm}`}
            type="number"
            min={20}
            max={400}
            step={0.01}
            defaultValue={d.track?.bpm || 128}
            onBlur={(e) => {
              const bpm = Number(e.target.value);
              if (bpm >= 20 && bpm <= 400)
                void engine.saveMetadata(index, { bpm });
            }}
          />
        </label>
        <button
          disabled={!d.track?.bpm}
          onClick={() =>
            void engine.saveMetadata(index, { bpm: (d.track?.bpm || 128) / 2 })
          }
        >
          ½ BPM
        </button>
        <button
          disabled={!d.track?.bpm || (d.track?.bpm || 0) > 200}
          onClick={() =>
            void engine.saveMetadata(index, { bpm: (d.track?.bpm || 128) * 2 })
          }
        >
          2× BPM
        </button>
        <button
          disabled={!d.buffer}
          onClick={() =>
            void engine.saveMetadata(index, {
              firstBeatSecs: engine.position(index),
            })
          }
        >
          Set 1.1 here
        </button>
        <label>
          Key
          <input
            aria-label={`Deck ${index + 1} source key`}
            key={`${d.track?.id}-${d.track?.musicalKey}`}
            defaultValue={d.track?.musicalKey || ""}
            placeholder="e.g. F#m"
            onBlur={(e) =>
              void engine.saveMetadata(index, {
                musicalKey: e.target.value.trim(),
              })
            }
          />
        </label>
      </div>
      <div className="dj-grid-nudge">
        <span>GRID ALIGN</span>
        {[-0.01, 0.01].map((delta) => (
          <button
            key={delta}
            disabled={!d.buffer}
            onClick={() =>
              void engine.saveMetadata(index, {
                firstBeatSecs: Math.max(
                  0,
                  (d.track?.performance?.firstBeatSecs ??
                    (d.track?.rekordbox?.firstBeatMs || 0) / 1000) + delta,
                ),
              })
            }
          >
            {delta < 0 ? "−10 ms" : "+10 ms"}
          </button>
        ))}
      </div>
      <p>
        Position the playhead on the first downbeat, set 1.1, then check bar
        lines at the start and end. Auto analysis is an estimate; this grid
        assumes a constant tempo. Changes save on this Mac and the connected
        USB.
      </p>
    </details>
  );
}
