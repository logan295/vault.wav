"use client";
import { useRef, useState } from "react";
import type { PerformEngine } from "@/lib/perform/engine";

export function CueButton({
  engine,
  index,
}: {
  engine: PerformEngine;
  index: number;
}) {
  const held = useRef(false);
  const down = () => {
    if (held.current) return;
    held.current = true;
    engine.cueDown(index);
  };
  const up = () => {
    held.current = false;
    engine.cueUp(index);
  };
  return (
    <button
      className="dj-cue"
      aria-label={`Cue deck ${index + 1}`}
      disabled={!engine.decks[index].buffer}
      title="Playing: stop and return to cue. Paused: hold to preview, release to return."
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        down();
      }}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onBlur={up}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) down();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          up();
        }
      }}
      onClick={(e) => {
        if (e.detail === 0 && !held.current) engine.cue(index);
      }}
    >
      CUE
    </button>
  );
}
export function HotPads({
  engine,
  index,
}: {
  engine: PerformEngine;
  index: number;
}) {
  const d = engine.decks[index];
  const [setting, setSetting] = useState(false);
  const [clearing,setClearing]=useState(false);
  return (
    <div className="dj-pad-bank">
      <div className="dj-pad-help">
        HOT CUES{" "}
        <button
          aria-label={`Deck ${index + 1} cue set mode`}
          aria-pressed={setting}
          onClick={() => {setSetting(!setting);setClearing(false);}}
        >
          {setting ? "SET" : "PLAY"}
        </button>
        <button
          aria-label={`Deck ${index + 1} fill phrase cues`}
          disabled={!d.buffer}
          title="Fill empty pads at regular phrase intervals; refine by ear"
          onClick={() => engine.phraseCues(index)}
        >
          Fill
        </button>
        <button aria-label={`Deck ${index+1} clear hot cues mode`} aria-pressed={clearing} onClick={()=>{setClearing(!clearing);setSetting(false);}}>CLR</button>
        <span>Empty: set · Saved: play · Shift-click: clear</span>
      </div>
      <div className="perform-cues">
        {d.hotCues.map((cue, slot) => (
          <button
            key={slot}
            disabled={!d.buffer}
            className={cue !== null ? "has-cue" : ""}
            style={{"--cue-color":["#ff6b72","#71c2ff","#7dde85","#ba91fa","#50d4c2","#ffac65","#7c9cff","#e8d16a"][slot]} as React.CSSProperties}
            aria-label={`Deck ${index + 1} hot cue ${String.fromCharCode(65 + slot)}${setting || cue === null ? " set" : " play"}`}
            title={
              cue === null
                ? "Set at current position"
                : `${cue.toFixed(2)}s · Shift-click to clear`
            }
            onClick={(e) =>
              (e.shiftKey || clearing)
                ? engine.hotCue(index, slot, true)
                : setting
                  ? engine.setHotCue(index, slot)
                  : engine.hotCue(index, slot)
            }
          >
            <b>{String.fromCharCode(65 + slot)}</b>
            <small>
              {cue === null
                ? "+ SET"
                : `${Math.floor(cue / 60)}:${(cue % 60).toFixed(1).padStart(4, "0")}`}
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}
export function Jog({
  engine,
  index,
}: {
  engine: PerformEngine;
  index: number;
}) {
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const d = engine.decks[index];
  const position = engine.position(index);
  return (
    <div className="dj-jog-row">
      <div
        className="dj-jog"
        role="slider"
        tabIndex={d.buffer ? 0 : -1}
        aria-label={`Deck ${index + 1} jog seek`}
        aria-valuemin={0}
        aria-valuemax={d.buffer?.duration || 0}
        aria-valuenow={Math.round(position * 100) / 100}
        onPointerDown={(e) => {
          if (!d.buffer) return;
          e.preventDefault();
          pointer.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const previous = pointer.current;
          if (!previous) return;
          engine.jog(
            index,
            (e.clientX - previous.x - (e.clientY - previous.y)) * 0.015,
          );
          pointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          pointer.current = null;
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
        onLostPointerCapture={() => {
          pointer.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            engine.jog(
              index,
              (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.01 : 0.1),
            );
          }
        }}
      >
        <div
          className="dj-platter-mark"
          style={{ transform: `rotate(${position * 180}deg)` }}
        />
        <div className="dj-jog-screen">
          <strong>
            {((d.track?.bpm || 128) * engine.desiredRate(index)).toFixed(2)}
          </strong>
          <span>BPM</span>
          <b>
            {d.settings.pitch >= 0 ? "+" : ""}
            {d.settings.pitch.toFixed(2)}%
          </b>
          <small>DRAG TO SEEK</small>
        </div>
      </div>
      <div className="dj-tempo">
        <label htmlFor={`tempo-${index}`}>TEMPO</label>
        <input
          id={`tempo-${index}`}
          aria-label={`Deck ${index + 1} tempo fader`}
          type="range"
          min={-16}
          max={16}
          step={0.01}
          value={d.settings.pitch}
          disabled={!d.buffer || d.settings.sync}
          onChange={(e) => engine.set(index, { pitch: Number(e.target.value) })}
        />
        <output>{d.settings.pitch.toFixed(2)}%</output>
        <button
          disabled={!d.buffer}
          onClick={() => engine.set(index, { sync: false, pitch: 0 })}
        >
          Reset
        </button>
        <label>
          Key{" "}
          <select
            aria-label={`Deck ${index + 1} pitch semitones`}
            value={d.settings.keyShift}
            disabled={!d.buffer}
            onChange={(e) =>
              engine.set(index, {
                keyLock: true,
                keyShift: Number(e.target.value),
              })
            }
          >
            {[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n > 0 ? "+" : ""}
                {n} st
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
export function DjExtras({
  engine,
  index,
}: {
  engine: PerformEngine;
  index: number;
}) {
  const d = engine.decks[index];
  const [jump,setJump]=useState(4);
  const [length,setLength]=useState(4);
  return <div className="dj-extras">
    <div className="dj-loop-tools"><span>LOOP · BEATS</span>
      <button aria-label={`Deck ${index+1} loop in`} disabled={!d.buffer} onClick={()=>engine.loopIn(index)}>IN</button>
      <button aria-label={`Deck ${index+1} loop out`} disabled={!d.buffer} onClick={()=>engine.loopOut(index)}>OUT</button>
      <button aria-label={`Deck ${index+1} halve loop`} disabled={!d.buffer} onClick={()=>{setLength(Math.max(.25,length/2));engine.resizeLoop(index,.5);}}>½</button>
      <select aria-label={`Deck ${index+1} auto loop beats`} value={length} onChange={event=>setLength(Number(event.target.value))}>{[.25,.5,1,2,4,8,16,32].map(n=><option key={n} value={n}>{n} beats</option>)}</select>
      <button aria-label={`Deck ${index+1} double loop`} disabled={!d.buffer} onClick={()=>{setLength(Math.min(32,length*2));engine.resizeLoop(index,2);}}>2×</button>
      <button aria-label={`Deck ${index+1} auto loop`} aria-pressed={d.settings.loop} disabled={!d.buffer} onClick={()=>d.settings.loop?engine.set(index,{loop:false}):engine.autoLoop(index,length)}>{d.settings.loop?"EXIT":"AUTO"}</button>
    </div>
    <div><span>BEAT JUMP</span>
      <button aria-label={`Deck ${index+1} beat jump backward`} disabled={!d.buffer} onClick={()=>engine.beatJump(index,-jump)}>◀</button>
      <select aria-label={`Deck ${index+1} beat jump size`} value={jump} onChange={event=>setJump(Number(event.target.value))}>{[.5,1,2,4,8,16,32,64].map(n=><option key={n} value={n}>{n} beats</option>)}</select>
      <button aria-label={`Deck ${index+1} beat jump forward`} disabled={!d.buffer} onClick={()=>engine.beatJump(index,jump)}>▶</button>
      <button aria-label={`Deck ${index+1} quantize cues and loops`} aria-pressed={d.settings.quantize} onClick={()=>engine.set(index,{quantize:!d.settings.quantize})}>Q</button>
    </div>
  </div>;
}
