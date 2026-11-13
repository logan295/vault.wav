"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Headphones,
  LockKeyhole,
  Music2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { PerformEngine, type DeckSettings } from "@/lib/perform/engine";
import type { LocalTrack } from "@/lib/local-audio/types";
import { useLocalPlaybackControls } from "@/components/local-playback-provider";
import { HardwarePanel } from "./hardware-panel";
import { MixingWaveforms } from "./mix-waveforms";
import { PerformanceBrowser } from "./track-browser";
import { ResizeHandle } from "./resize-handle";

import { DeckWaveform, TrackPreparation } from "./waveform";
import { CueButton, HotPads, Jog, DjExtras } from "./dj-controls";
const COLORS = ["#f3c65e", "#81bbf4", "#bc9cf0", "#71d9a5"];
const time = (value: number) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
function Knob({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const percent = (value - min) / (max - min);
  return (
    <label className="perform-knob">
      <span
        className="perform-knob-face"
        style={{
          background: `conic-gradient(from 225deg,#1db954 ${percent * 270}deg,#ffffff15 0deg, #ffffff15 270deg,transparent 270deg)`,
        }}
      >
        <i style={{ transform: `rotate(${-135 + percent * 270}deg)` }} />
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </span>
      <span>{label}</span>
      <output>{Math.round(value * 10) / 10}</output>
    </label>
  );
}
function ChannelMeter({
  engine,
  index,
}: {
  engine: PerformEngine;
  index: number;
}) {
  const samples = new Float32Array(256);
  engine.channels[index].meter.getFloatTimeDomainData(samples);
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const db = 20 * Math.log10(Math.max(0.0001, peak));
  return (
    <meter
      className="dj-vu"
      aria-label={`Channel ${index + 1} output meter`}
      min={-60}
      max={0}
      low={-30}
      high={-6}
      optimum={-12}
      value={Math.max(-60, db)}
      title={`${db.toFixed(1)} dBFS`}
    />
  );
}
function Mixer({ index, engine }: { index: number; engine: PerformEngine }) {
  const deck = engine.decks[index],
    s = deck.settings;
  const set = (changes: Partial<DeckSettings>) => engine.set(index, changes);
  return (
    <section
      className="perform-mixer"
      aria-label={`Channel ${index + 1} mixer`}
    >
      <h3>Channel {index + 1}</h3>
      <div className="dj-channel-fader">
        <label>
          LEVEL
          <input
            aria-label={`Channel ${index + 1} level`}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={s.level}
            onChange={(e) => set({ level: Number(e.target.value) })}
          />
          <output>{Math.round(s.level * 100)}%</output>
        </label>
        <ChannelMeter engine={engine} index={index} />
      </div>
      <div className="perform-knob-row">
        <Knob
          label={`Trim ${index + 1}`}
          value={s.trim}
          min={-12}
          max={6}
          onChange={(trim) => set({ trim })}
        />
        <Knob
          label={`Filter ${index + 1}`}
          value={s.filter}
          min={-1}
          max={1}
          step={0.01}
          onChange={(filter) => set({ filter })}
        />
      </div>
      <div className="perform-knob-row">
        {(["low", "mid", "high"] as const).map((band) => (
          <Knob
            key={band}
            label={`${band.toUpperCase()} ${index + 1}`}
            value={s[band]}
            min={-24}
            max={6}
            onChange={(value) => set({ [band]: value })}
          />
        ))}
      </div>
      <div className="perform-buttons">
        <button aria-label={`Headphone cue channel ${index + 1}`} aria-pressed={s.headphoneCue} onClick={() => set({headphoneCue:!s.headphoneCue})}><Headphones size={14}/> CUE</button>
        <button aria-pressed={s.muted} onClick={() => set({ muted: !s.muted })}>
          Mute
        </button>
        <button aria-pressed={s.solo} onClick={() => set({ solo: !s.solo })}>
          Solo
        </button>
      </div>
      <div className="dj-echo">
        <label>
          Echo
          <input
            aria-label={`Channel ${index + 1} echo amount`}
            type="range"
            min={0}
            max={0.7}
            step={0.01}
            value={s.echo}
            onChange={(e) => set({ echo: Number(e.target.value) })}
          />
        </label>
        <select
          aria-label={`Channel ${index + 1} echo beat length`}
          value={s.echoBeats}
          onChange={(e) => set({ echoBeats: Number(e.target.value) })}
        >
          {[0.25, 0.5, 1].map((n) => (
            <option key={n} value={n}>
              {n} beat
            </option>
          ))}
        </select>
      </div>
      <p className="perform-routing">
        <Volume2 size={12} /> Master stereo
      </p>
    </section>
  );
}
function DeckPanel({
  index,
  engine,
  selected,
  onSelect,
  load,
  dj = false,
}: {
  index: number;
  engine: PerformEngine;
  selected: boolean;
  onSelect: () => void;
  load: (index: number, id: string) => void;
  dj?: boolean;
}) {
  const d = engine.decks[index],
    now = engine.context.currentTime,
    playing = d.playing && now >= d.startedAt,
    remaining = (d.buffer?.duration || 0) - engine.position(index);

  return (
    <section
      className={`perform-deck ${selected ? "selected" : ""}`}
      style={{ "--deck-color": COLORS[index] } as React.CSSProperties}
      onPointerDown={onSelect}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-womp-track"))
          e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("application/x-womp-track");
        if (id) load(index, id);
      }}
      aria-label={`Deck ${index + 1}`}
    >
      <header>
        <b className="perform-deck-number">{index + 1}</b>
        <div className="perform-deck-title">
          <strong>{d.track?.title || `Deck ${index + 1}`}</strong>
          <span>
            {d.track?.artist || d.track?.sourceName || "No track loaded"}
          </span>
        </div>
        <span className="perform-time">{time(Math.max(0, remaining))}</span>
        <button
          onClick={() => engine.eject(index)}
          disabled={!d.track}
          aria-label={`Eject deck ${index + 1}`}
        >
          <X size={15} />
        </button>
      </header>
      <div className="perform-deck-meta">
        <button
          aria-pressed={d.settings.sync}
          disabled={engine.clock.owner === index || !d.track?.bpm}
          onClick={() => engine.beatSync(index)}
        >
          Beat sync
        </button>
        {d.settings.sync && (
          <button
            aria-label={`Deck ${index + 1} unlink tempo`}
            onClick={() => engine.set(index, { sync: false })}
          >
            Unlink
          </button>
        )}
        <button
          aria-pressed={engine.clock.owner === index}
          disabled={engine.clock.locked || !d.buffer}
          onClick={() =>
            engine.setOwner(engine.clock.owner === index ? "header" : index)
          }
        >
          Master
        </button>
        <span>
          {d.track?.bpm || "—"} →{" "}
          <b>
            {(
              (d.track?.bpm || engine.clock.bpm) * engine.desiredRate(index)
            ).toFixed(1)}
          </b>{" "}
          BPM
        </span>
        <span>
          {d.track?.musicalKey || "—"}
          {d.settings.keyShift !== 0
            ? ` (${d.settings.keyShift > 0 ? "+" : ""}${d.settings.keyShift})`
            : ""}
        </span>
        <button
          aria-pressed={d.settings.keyLock}
          onClick={() => engine.set(index, { keyLock: !d.settings.keyLock })}
        >
          MT
        </button>
        <button disabled={!d.buffer} onClick={() => engine.keySync(index)}>
          Key sync
        </button>
        <span className="ml-auto">
          {d.playing && d.status === "Queued"
            ? playing
              ? "Playing"
              : "Launch pending"
            : d.status}
        </span>
      </div>
      <DeckWaveform compact={dj} deck={d} engine={engine} index={index} />
      <TrackPreparation engine={engine} index={index} />
      <div className={dj ? "dj-deck-surface" : ""}>
        {dj && <Jog engine={engine} index={index} />}
        <HotPads engine={engine} index={index} />
      </div>
      <div className="perform-transport">
        <button
          className="perform-go"
          disabled={!d.buffer}
          aria-label={`${d.playing ? "Pause" : "Play"} deck ${index + 1}`}
          onClick={() => engine.toggle(index)}
        >
          {d.playing ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" />
          )}
        </button>
        <CueButton engine={engine} index={index} />
        <button
          aria-label={`Analyze deck ${index + 1}`}
          disabled={!d.buffer || d.status.startsWith("Analyzing")}
          onClick={() => void engine.analyze(index)}
        >
          Analyze
        </button>
        <button disabled={!d.buffer} onClick={() => engine.setCue(index)}>
          Set cue
        </button>
        {!dj && <>
        <button
          disabled={!d.buffer}
          aria-pressed={d.settings.loop}
          onClick={() => engine.set(index, { loop: !d.settings.loop })}
        >
          <RotateCcw size={13} /> Loop
        </button>
        <select
          aria-label={`Deck ${index + 1} loop bars`}
          value={d.settings.loopBars}
          onChange={(e) =>
            engine.set(index, { loopBars: Number(e.target.value) })
          }
        >
          {[1, 2, 4, 8, 16, 32, 64].map((n) => (
            <option key={n} value={n}>
              {n} bars
            </option>
          ))}
        </select>
        </>}
        <label className="perform-pitch">
          Pitch
          <input
            aria-label={`Deck ${index + 1} pitch`}
            disabled={d.settings.sync}
            type="range"
            min={-16}
            max={16}
            step={0.01}
            value={d.settings.pitch}
            onChange={(e) =>
              engine.set(index, { pitch: Number(e.target.value) })
            }
          />
        </label>
      </div>
      {dj && <DjExtras engine={engine} index={index} />}
    </section>
  );
}
export function PerformWorkspace() {
  const { pause } = useLocalPlaybackControls();
  const [engine, setEngine] = useState<PerformEngine | null>(null),
    [, render] = useState(0);
  const [tracks, setTracks] = useState<LocalTrack[]>([]),
    [selected, setSelected] = useState(0),
    [mode, setMode] = useState("dj"),
    [master, setMaster] = useState(0.6),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false),
    [mixerWidth, setMixerWidth] = useState(200);
  const engineRef = useRef<PerformEngine | null>(null);
  const redraw = useCallback(() => render((n) => n + 1), []);
  useEffect(() => {
    pause();
    void fetch("/api/local/tracks")
      .then((r) => r.json())
      .then((body) => setTracks(body.tracks || []))
      .catch(() => setMessage("Could not load the USB library."));
    return () => {
      const e = engineRef.current;
      engineRef.current = null;
      if (e) void e.close();
    };
  }, [pause]);
  useEffect(() => {
    if (!engine) return;
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      if (now - last > 65) {
        last = now;
        redraw();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [engine, redraw]);
  async function start() {
    if (engineRef.current) return;
    try {
      const e = new PerformEngine(redraw);
      engineRef.current = e;
      await e.context.resume();
      await e.initialize();
      setEngine(e);
      e.setDjMode(mode === "dj");
      const width = Number(localStorage.getItem("womp-dj-mixer-width"));
      if (width) setMixerWidth(Math.max(160, Math.min(320, width)));
    } catch {
      const failed = engineRef.current;
      engineRef.current = null;
      if (failed) await failed.close();
      setMessage(
        "Could not initialize pitch processing. Reload Perform and try again.",
      );
    }
  }
  function load(index: number, id: string) {
    const track = tracks.find((t) => t.id === id);
    if (track && engine) void engine.load(index, track);
  }
  function saveState() {
    if (!engine) return;
    try {
      localStorage.setItem(
        "womp-perform-state-v1",
        JSON.stringify({
          version: 1,
          bpm: engine.clock.bpm,
          locked: engine.clock.locked,
          quantum: engine.quantum,
          master,
          decks: engine.decks.map((d) => ({
            trackId: d.track?.id,
            offset: engine.position(engine.decks.indexOf(d)),
            settings: d.settings,
          })),
        }),
      );
      setSaved(true);
      setMessage("Performance State saved on this Mac.");
    } catch {
      setMessage("Could not save this State.");
    }
  }
  async function restoreState() {
    if (!engine) return;
    try {
      const value = JSON.parse(
        localStorage.getItem("womp-perform-state-v1") || "null",
      );
      if (value?.version !== 1 || !Array.isArray(value.decks)) {
        setMessage("No saved State on this Mac.");
        return;
      }
      engine.stopAll();
      for (let i = 0; i < 4; i++) {
        const state = value.decks[i];
        if (!state) continue;
        const track = tracks.find((t) => t.id === state.trackId);
        if (track) {
          await engine.load(i, track);
          engine.seek(i, Number(state.offset) || 0);
        } else engine.eject(i);
        if (state.settings) engine.set(i, state.settings);
      }
      engine.setOwner("header");
      engine.setLocked(!!value.locked);
      engine.setTempo(Number(value.bpm) || 128);
      engine.setQuantum(Number(value.quantum) || 0);
      const restoredMaster = Number.isFinite(value.master)
        ? Math.min(1, Math.max(0, value.master))
        : 0.6;
      setMaster(restoredMaster);
      engine.setMaster(restoredMaster);
      setMessage("State restored. Press play deliberately to resume.");
    } catch {
      setMessage("Could not restore that State.");
    }
  }
  useEffect(() => {
    if (!engine) return;
    const release = () => engine.releaseCues();
    window.addEventListener("blur", release);
    return () => window.removeEventListener("blur", release);
  }, [engine]);
  const beat = engine?.beat() || 0;
  return (
    <main
      className={`perform-workspace ${mode === "controller" ? "perform-controller" : mode === "dj" ? "perform-dj" : ""}`}
    >
      <header className="perform-header">
        <Link href="/" className="perform-brand">
          <ArrowLeft size={17} />
          <b>.womp</b>
          <span>Perform</span>
        </Link>
        <select
          aria-label="Performance view"
          value={mode}
          onChange={(e) => {
            const next = e.target.value;
            setMode(next);
            if (next === "dj" && selected > 1) setSelected(0);
            engine?.releaseCues();
            engine?.setDjMode(next === "dj");
            if (engine && next === "loop")
              engine.decks.forEach((_, i) => engine.set(i, { loop: true }));
          }}
        >
          <option value="dj">DJ controller · 2 decks</option>
          <option value="perform">Perform · 4 decks</option>
          <option value="loop">Perform Loop</option>
          <option value="controller">Controller view</option>
        </select>
        <div className="perform-clock-role">
          <Radio size={14} />
          <b>
            {engine?.clock.owner === "header"
              ? "HEADER MASTER"
              : engine
                ? `DECK ${Number(engine.clock.owner) + 1} MASTER`
                : "CLOCK OFF"}
          </b>
          <small>Local clock · Link / NET not connected</small>
        </div>
        <button
          aria-pressed={engine?.clock.owner === "header"}
          disabled={!engine}
          onClick={() => engine?.setOwner("header")}
        >
          M
        </button>
        <button
          aria-label="Lock clock to header"
          aria-pressed={engine?.clock.locked}
          disabled={!engine}
          onClick={() => engine?.setLocked(!engine.clock.locked)}
        >
          <LockKeyhole size={16} />
        </button>
        <label className="perform-bpm">
          <input
            aria-label="Master BPM"
            type="number"
            min={20}
            max={999}
            step={0.01}
            disabled={!engine}
            value={engine?.clock.bpm || 128}
            onChange={(e) => engine?.setTempo(Number(e.target.value))}
          />
          <span>BPM</span>
        </label>
        <label className="perform-quantize">
          Q
          <select
            aria-label="Global launch quantize"
            disabled={!engine}
            value={engine?.quantum ?? 1}
            onChange={(e) => {
              if (engine) {
                engine.setQuantum(Number(e.target.value));
                redraw();
              }
            }}
          >
            {[
              [0, "Off"],
              [0.25, "1/16 bar"],
              [0.5, "1/8 bar"],
              [1, "1/4 bar"],
              [2, "1/2 bar"],
              [4, "1 bar"],
              [8, "2 bars"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div
          className="perform-beats"
          aria-label={`Beat ${(Math.floor(beat) % 4) + 1}`}
        >
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={Math.floor(beat) % 4 === i ? "lit" : ""} />
          ))}
        </div>
        <label className="perform-master">
          <Volume2 size={15} />
          <input
            aria-label="Master output level"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={engine?.master.gain.value ?? master}
            onChange={(e) => {
              const value = Number(e.target.value);
              setMaster(value);
              engine?.setMaster(value);
            }}
          />
        </label>
        <button
          onClick={() => engine?.stopAll()}
          disabled={!engine}
          className="perform-stop"
        >
          <Square size={13} /> Stop all
        </button>
      </header>
      {engine && <HardwarePanel engine={engine} onSelect={index=>{setSelected(index);if(index>1){setMode("perform");engine.setDjMode(false);}}}/>}
      <div className="perform-split-layout">
        {!engine ? (
          <section className="perform-start">
            <div>
              <Music2 size={40} />
              <h1>Four decks. One musical clock.</h1>
              <p>
                Load music from your USB, launch on the beat, and mix with live
                EQ and filters.
              </p>
              <button onClick={() => void start()} className="perform-enable-audio">
                <Play size={17} fill="currentColor" /> Enable audio engine
              </button>
              <small>
                This first build uses local Web Audio playback. Master Tempo
                preserves key during tempo changes. Connect FLX10 MIDI and select separate master / headphone outputs
                in Controller & audio after enabling the engine. Ableton Link,
                network sync, and FLX10 HID displays are not implemented.
              </small>
            </div>
          </section>
        ) : (
          <>
            <div className="perform-top">
              {mode === "dj" && (
                <MixingWaveforms engine={engine} select={setSelected} load={load} />
              )}
              <div
                className="perform-grid"
                style={
                  { "--mixer-width": `${mixerWidth}px` } as React.CSSProperties
                }
              >
                <DeckPanel
                  dj={mode === "dj"}
                  index={0}
                  engine={engine}
                  selected={selected === 0}
                  onSelect={() => setSelected(0)}
                  load={load}
                />
                <div className="perform-mixer-pair">
                  <ResizeHandle
                    axis="x"
                    label="Mixer width"
                    value={mixerWidth}
                    min={160}
                    max={320}
                    onChange={(value) => {
                      setMixerWidth(value);
                      localStorage.setItem(
                        "womp-dj-mixer-width",
                        String(value),
                      );
                    }}
                  />
                  <Mixer index={0} engine={engine} />
                  <Mixer index={1} engine={engine} />
                </div>
                <DeckPanel
                  dj={mode === "dj"}
                  index={1}
                  engine={engine}
                  selected={selected === 1}
                  onSelect={() => setSelected(1)}
                  load={load}
                />
                {mode !== "dj" && (
                  <>
                    <DeckPanel
                      index={2}
                      engine={engine}
                      selected={selected === 2}
                      onSelect={() => setSelected(2)}
                      load={load}
                    />
                    <div className="perform-mixer-pair">
                      <Mixer index={2} engine={engine} />
                      <Mixer index={3} engine={engine} />
                    </div>
                    <DeckPanel
                      index={3}
                      engine={engine}
                      selected={selected === 3}
                      onSelect={() => setSelected(3)}
                      load={load}
                    />
                  </>
                )}
              </div>
              {mode === "dj" && (
                <section className="dj-crossfader">
                  <span>A · DECK 1</span>
                  <label>
                    Crossfader
                    <input
                      aria-label="DJ crossfader"
                      type="range"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={engine.crossfader}
                      onChange={(e) =>
                        engine.setCrossfader(Number(e.target.value))
                      }
                    />
                  </label>
                  <span>DECK 2 · B</span>
                  <button onClick={() => engine.setCrossfader(0)}>
                    Center
                  </button>
                  <small>
                    Master Tempo preserves key · Jog is seek, not scratch ·
                    FLX10 MIDI setup in Controller & audio
                  </small>
                </section>
              )}
            </div>
            <PerformanceBrowser
              tracks={tracks}
              selected={selected}
              load={load}
              save={saveState}
              recall={() => void restoreState()}
              saved={saved}
            />
          </>
        )}
      </div>
      <footer className="perform-footer">
        <span role="status">
          {message || "Local performance engine · Save a State before leaving"}
        </span>
        <span>
          <Headphones size={12} /> {engine?.nativeOutput ? "Separate master + headphone outputs" : engine?.defaultOutputConnected ? "Default stereo · cue output inactive" : "Output stopped · choose audio device"}
        </span>
        <span>Master Tempo · Independent key shift</span>
      </footer>
    </main>
  );
}
