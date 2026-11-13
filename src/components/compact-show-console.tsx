"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

const COLORS = [["White", "#ffffff"], ["Cyan", "#00e5ff"], ["Blue", "#2a8cff"], ["Purple", "#9a70ff"], ["Pink", "#ff3d98"], ["Red", "#ff1744"], ["Amber", "#ff9100"], ["Lime", "#78ff4d"]] as const;
const pad = "desk-pad";
export function DeskFader({ label, value, onChange, min = 0, max = 1, step = .01 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <label className="desk-fader"><span>{label}<output>{/timing/i.test(label) ? `${Math.round(value*1000)} ms` : /speed|scale|width|exposure/i.test(label) ? `${value.toFixed(2)}×` : label === "Air depth" ? `${Math.round((value-min)/(max-min)*100)}%` : `${Math.round(value * 100)}%`}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
function Palette({ name, value, onChange }: { name: string; value: string[]; onChange: (value: string[]) => void }) {
  const [mix, setMix] = useState(false);
  return <fieldset className="desk-palette"><legend>{name}</legend><div className="desk-color-row">{COLORS.map(([label, color]) => <button key={color} className={pad} aria-label={`${name}: ${label}`} aria-pressed={value.includes(color)} title={label} onClick={() => onChange(mix ? value.includes(color) ? value.filter((item) => item !== color) : [...value, color] : [color])}><i style={{ background: color }} /></button>)}</div><div className="desk-inline"><button className={pad} aria-pressed={!value.length} onClick={() => onChange([])}>Auto color</button><button className={pad} aria-pressed={mix} onClick={() => setMix(!mix)}>Mix colors</button><label className="desk-custom">Custom<input type="color" aria-label={`${name}: custom color`} value={value[0] ?? "#00e5ff"} onChange={(event) => onChange([event.target.value])} /></label></div></fieldset>;
}
function PatternPads({ names, selected, onChange, label }: { names: readonly string[]; selected: number | null | undefined; onChange: (value: number | null) => void; label: string }) {
  const [page, setPage] = useState(0);
  const count = Math.ceil(names.length / 5);
  return <fieldset><legend className="desk-section-title">{label}<span><button className={pad} aria-label={`Previous ${label} page`} disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button> {page + 1}/{count} <button className={pad} aria-label={`Next ${label} page`} disabled={page + 1 >= count} onClick={() => setPage(page + 1)}>›</button></span></legend><label className="desk-select">Jump to<select aria-label={`${label} selection`} value={selected ?? -1} onChange={event => { const value = Number(event.target.value); onChange(value < 0 ? null : value); if (value >= 0) setPage(Math.floor(value / 5)); }}><option value={-1}>Music auto</option>{names.map((name,index) => <option key={name} value={index}>{name}</option>)}</select></label><div className="desk-patterns"><button className={pad} aria-pressed={selected === null} onClick={() => onChange(null)}>Music auto</button>{names.slice(page * 5, page * 5 + 5).map((name, offset) => <button key={name} className={pad} aria-pressed={selected === page * 5 + offset} onClick={() => onChange(page * 5 + offset)}>{name}</button>)}</div></fieldset>;
}
export type ConsoleBank = {
  names: readonly string[]; selected: number | null | undefined; onPattern: (value: number | null) => void;
  colors: string[]; onColors: (value: string[]) => void; controls: ReactNode;
};
export function CompactShowConsole({ title, status, playing, onToggle, canPlay, previous, next, canPrevious, canNext, blackout, onBlackout, flash, onFlash, onAuto, onFocus, onReturn, time, duration, onSeek, lasers, lights, visuals, visual, onVisual, fit, onFit, faders, setup, venue, source, connection, visualControls, preview, monitorControls, external = false }: {
  title: string; status: string; playing: boolean; onToggle: () => void; canPlay: boolean;
  previous: () => void; next: () => void; canPrevious: boolean; canNext: boolean;
  blackout: boolean; onBlackout: () => void; flash: boolean; onFlash: (value: boolean) => void; onAuto: () => void; onFocus: () => void; onReturn: () => void;
  time: number; duration: number; onSeek: (value: number) => void;
  lasers: ConsoleBank; lights: ConsoleBank;
  visuals: { src: string; label: string; poster: string; group: string }[];
  visual: string; onVisual: (value: string) => void; fit: string; onFit: (value: "fit" | "fill") => void;
  preview?: ReactNode; monitorControls?: ReactNode; visualControls?: ReactNode; faders: ReactNode; setup: ReactNode; venue: ReactNode; source?: ReactNode; connection?: string; external?: boolean;
}) {
  useEffect(() => {
    const release = () => onFlash(false);
    window.addEventListener("blur", release);
    const visibility = () => { if (document.hidden) release(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", visibility); };
  }, [onFlash]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  const [monitor,setMonitor] = useState(true);
  const [view, setView] = useState("Live");
  const [pack, setPack] = useState("All packs");
  const [videoPage, setVideoPage] = useState(0);
  const clips = visuals.filter((item) => pack === "All packs" || item.group === pack);
  const pageCount = Math.max(1, Math.ceil(clips.length / 6));
  return <aside className="vault-compact-desk" aria-label="Live show console">
    <header className="desk-header"><div className="desk-title"><span>.womp / live</span><strong>{title}</strong><small role="status">{connection && <span className="mr-2 text-[#1db954]">{connection} ·</span>}{status}</small></div><div className="desk-inline desk-header-actions">{venue}<button className={pad} onClick={onFocus}>Focus show ↗</button><button className={pad} onClick={onReturn}>Return stage</button></div></header>
    <details className="desk-input-drawer"><summary>Input / connection settings</summary>{source}</details>
    <div className="desk-transport"><button className={pad} disabled={!canPrevious} onClick={previous}>Previous</button><button className={`${pad} desk-go`} disabled={!canPlay || external} onClick={onToggle}>{external ? (playing ? "Playing in rekordbox" : "Control in rekordbox") : playing ? "Pause show" : "Play show"}</button><button className={pad} disabled={!canNext} onClick={next}>Next</button><button className={pad} onClick={onAuto}>Run song show</button><button className={pad} aria-pressed={flash} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onFlash(true); }} onPointerUp={() => onFlash(false)} onPointerCancel={() => onFlash(false)} onLostPointerCapture={() => onFlash(false)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); onFlash(true); } }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") onFlash(false); }} onBlur={() => onFlash(false)}>Hold flash</button><button className={`${pad} desk-blackout`} aria-pressed={blackout} onClick={onBlackout}>{blackout ? "Restore rig" : "Blackout"}</button><label className="desk-seek">{Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2,"0")}<input aria-label="Show playhead" disabled={external} type="range" min={0} max={duration || 1} step={.01} value={duration ? time : 0} onChange={(event) => onSeek(Number(event.target.value))} /><span>{duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2,"0")}` : "—"}</span></label></div>
    <nav aria-label="Console pages" className="desk-tabs"><button className={`${pad} desk-monitor-toggle`} aria-pressed={monitor} onClick={()=>setMonitor(!monitor)}>Stage monitor {monitor?"on":"off"}</button>{["Live", "Lasers", "Lighting", "Visuals", "Stage"].map((name) => <button key={name} className={pad} aria-pressed={view === name} onClick={() => setView(name)}>{name}</button>)}</nav>
    <div className={`desk-body ${monitor?"":"desk-no-monitor"}`}><div className={`desk-workspace desk-view-${view.toLowerCase()}`}>
      {(view === "Live" || view === "Lasers") && <section className="desk-bank desk-lasers" aria-label="Laser bank"><h2>01 / LASERS</h2>{lasers.controls}<PatternPads names={lasers.names} selected={lasers.selected} onChange={lasers.onPattern} label="Laser patterns" /><Palette name="Laser colors" value={lasers.colors} onChange={lasers.onColors} /></section>}
      {(view === "Live" || view === "Lighting") && <section className="desk-bank desk-lights" aria-label="Lighting bank"><h2>02 / LIGHTING</h2>{lights.controls}<PatternPads names={lights.names} selected={lights.selected} onChange={lights.onPattern} label="Light patterns" /><Palette name="Light colors" value={lights.colors} onChange={lights.onColors} /></section>}
      {(view === "Live" || view === "Visuals") && <section className="desk-bank desk-visuals" aria-label="Visual bank"><h2>03 / VISUALS</h2>{visualControls}<label className="desk-select">Collection<select aria-label="VFX collection" value={pack} onChange={(event) => { setPack(event.target.value); setVideoPage(0); }}><option>All packs</option>{[...new Set(visuals.map((item) => item.group))].map((group) => <option key={group}>{group}</option>)}</select></label><div className="desk-inline"><button className={pad} aria-pressed={visual === "auto"} onClick={() => onVisual("auto")}>Music auto</button><button className={pad} aria-pressed={visual === "generative"} onClick={() => onVisual("generative")}>Generative</button><button className={pad} aria-pressed={visual === "vj-pack"} onClick={() => onVisual("vj-pack")}>Video auto</button></div><div className="desk-clips">{clips.slice(videoPage * 6, videoPage * 6 + 6).map((clip) => <button key={clip.src} className={pad} aria-label={`Play VFX ${clip.label}`} aria-pressed={visual === clip.src} onClick={() => onVisual(clip.src)}><span><Image unoptimized src={clip.poster} alt="" fill sizes="160px" /></span><small>{clip.label}</small></button>)}</div><div className="desk-inline"><button className={pad} disabled={videoPage === 0} onClick={() => setVideoPage(videoPage - 1)}>‹ Clips</button><span>{videoPage + 1}/{pageCount}</span><button className={pad} disabled={videoPage + 1 >= pageCount} onClick={() => setVideoPage(videoPage + 1)}>Clips ›</button><button className={pad} aria-pressed={fit === "fit"} onClick={() => onFit("fit")}>Fit</button><button className={pad} aria-pressed={fit === "fill"} onClick={() => onFit("fill")}>Fill</button></div></section>}
      {view === "Stage" && <section className="desk-bank desk-setup" aria-label="Stage setup"><h2>STAGE / CAMERA / ATMOSPHERE</h2>{setup}</section>}
    </div>
    {monitor && <section className="desk-stage-monitor" aria-label="Live stage monitor"><div className="desk-monitor-title"><span>LIVE STAGE</span><small>24 FPS preview</small></div><div className="desk-monitor-canvas">{preview}</div>{monitorControls}<button className={pad} onClick={onFocus}>Open / focus full stage ↗</button><small className="desk-hint">Same show, camera and playhead as the stage output.</small></section>}</div>
    <footer className="desk-masters" aria-label="Output faders">{faders}</footer>
  </aside>;
}
