"use client";

import { useEffect, useRef } from "react";

const cues = [
  { at: .04, label: "1", color: "#f2bb54" },
  { at: .18, label: "2", color: "#4fd8c2" },
  { at: .36, label: "3", color: "#a58cff" },
  { at: .51, label: "4", color: "#ff654f" },
  { at: .69, label: "5", color: "#4fd8c2" },
  { at: .84, label: "6", color: "#f2bb54" },
];

function amplitude(i: number, detail: boolean) {
  const phrase = .28 + Math.abs(Math.sin(i * (detail ? .014 : .026))) * .36;
  const pulse = Math.pow(Math.abs(Math.sin(i * (detail ? .105 : .19))), 7) * .34;
  const texture = Math.abs(Math.sin(i * .043 + 1.7)) * .12;
  return Math.min(.98, phrase + pulse + texture);
}

function draw(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number, detail: boolean, progress: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssWidth * dpr; canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`; canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.scale(dpr, dpr); ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = "#050809"; ctx.fillRect(0, 0, cssWidth, cssHeight);
  const center = cssHeight / 2;
  const gap = detail ? 5.2 : 1.25;
  const count = Math.ceil(cssWidth / gap);
  for (let i = 0; i < count; i++) {
    const x = i * gap;
    const a = amplitude(i, detail) * cssHeight * .46;
    const bass = .55 + Math.abs(Math.sin(i * .031)) * .45;
    const mids = .42 + Math.abs(Math.sin(i * .073 + 1)) * .5;
    const highs = .2 + Math.abs(Math.sin(i * .179 + 3)) * .48;
    const played = x / cssWidth <= progress ? 1 : .54;
    ctx.globalAlpha = played;
    ctx.fillStyle = "#ff4f3d"; ctx.fillRect(x, center - a, detail ? 2.1 : 1, a * 2);
    ctx.fillStyle = mids > .72 ? "#d55cff" : "#537cff"; ctx.fillRect(x, center - a * mids, detail ? 2.1 : 1, a * mids * 2);
    ctx.fillStyle = highs > .52 ? "#f3c75b" : "#4fe0d1"; ctx.fillRect(x, center - a * highs * bass, detail ? 2.1 : 1, a * highs * bass * 2);
    if (detail && i % 4 === 0) { ctx.globalAlpha = .22 * played; ctx.fillStyle = "#fff"; ctx.fillRect(x, center - a * .22, 1, a * .44); }
  }
  ctx.globalAlpha = 1;
  if (!detail) { const px = cssWidth * progress; ctx.fillStyle = "#ff654f"; ctx.fillRect(px - 1, 0, 2, cssHeight); }
}

export function SpectralWaveform({ zoom = 1, progress = .38, playing = false }: { zoom?: number; progress?: number; playing?: boolean }) {
  const overviewRef = useRef<HTMLCanvasElement>(null);
  const detailRef = useRef<HTMLCanvasElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overview = overviewRef.current; const detail = detailRef.current; const scroller = detailScrollRef.current;
    if (!overview || !detail || !scroller) return;
    const width = overview.parentElement?.clientWidth || 700;
    draw(overview, width, 48, false, progress);
    const detailWidth = width * (2 + zoom * 1.5);
    draw(detail, detailWidth, 94, true, progress);
    scroller.scrollLeft = Math.max(0, detailWidth * progress - scroller.clientWidth / 2);
  }, [zoom, progress, playing]);

  const detailScale = 2 + zoom * 1.5;
  const windowWidth = 100 / detailScale;

  return (
    <div className="rekord-wave" aria-label="Detailed multicolor waveform analysis">
      <div className="overview-wave"><canvas ref={overviewRef}/><span className="overview-window" style={{left:`${Math.max(0,Math.min(100-windowWidth,progress * 100 - windowWidth / 2))}%`,width:`${windowWidth}%`}}/></div>
      <div className="cue-lane">
        <span className="cue-phrase intro" style={{left:"0%",width:"18%"}}>Intro</span>
        <span className="cue-phrase build" style={{left:"18%",width:"28%"}}>Build</span>
        <span className="cue-phrase drop" style={{left:"46%",width:"38%"}}>Drop</span>
        <span className="cue-phrase outro" style={{left:"84%",width:"16%"}}>Outro</span>
        {cues.map(cue => <button key={cue.label} className="cue-marker" style={{left:`${cue.at*100}%`,"--cue":cue.color} as React.CSSProperties} aria-label={`Cue ${cue.label}`}><b>{cue.label}</b></button>)}
        <i className="cue-playhead" style={{left:`${progress*100}%`}}/>
      </div>
      <div className="detail-wave-shell">
        <div className="detail-wave" ref={detailScrollRef}><canvas ref={detailRef}/></div>
        <span className="fixed-playhead"><i/>{playing && <b>PLAY</b>}</span>
        <span className="beat-grid beat-one"/><span className="beat-grid beat-two"/><span className="beat-grid beat-three"/><span className="beat-grid beat-four"/>
      </div>
      <div className="detail-ruler"><span>−8 beats</span><span>−4</span><b>1:23.402</b><span>+4</span><span>+8 beats</span></div>
    </div>
  );
}
