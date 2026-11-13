import { useEffect, useState, type KeyboardEvent } from "react";
import { Circle, Zap } from "lucide-react";

export const SHOW_LOOKS = [
  { name: "Music auto", detail: "Follow the track", top: null, bottom: null, color: "#5eead4" },
  { name: "White lattice", detail: "Crossed banks", top: 1, bottom: 1, color: "#e2e8f0" },
  { name: "Orbit", detail: "Counter rotation", top: 12, bottom: 13, color: "#c4b5fd" },
  { name: "Low ceiling", detail: "Sheet and horizon", top: 5, bottom: 11, color: "#7dd3fc" },
  { name: "Festival wings", detail: "Split and sweep", top: 16, bottom: 7, color: "#fda4af" },
  { name: "Crown", detail: "Radial and diamond", top: 19, bottom: 9, color: "#fcd34d" },
] as const;

export type ShowLook = (typeof SHOW_LOOKS)[number];

type Fader = { label: string; value: number; max?: number; onChange: (value: number) => void };

export function ShowDesk({ active, onLook, flash, onFlash, blackout, master, faders }: {
  active: ShowLook | undefined;
  onLook: (look: ShowLook) => void;
  flash: boolean;
  onFlash: (active: boolean) => void;
  blackout: boolean;
  master: Fader;
  faders: Fader[];
}) {
  const [armed, setArmed] = useState<ShowLook | null>(null);
  const [armMode, setArmMode] = useState(false);
  const muted = blackout || master.value === 0;

  useEffect(() => {
    const release = () => onFlash(false);
    window.addEventListener("blur", release);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      release();
      window.removeEventListener("blur", release);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [onFlash]);

  function select(look: ShowLook) {
    if (armMode) setArmed(look);
    else onLook(look);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!(event.target instanceof HTMLButtonElement) || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const look = SHOW_LOOKS[Number(event.key) - 1];
    if (look) {
      event.preventDefault();
      select(look);
    }
  }

  return <section aria-label="Show desk" onKeyDown={onKeyDown} className="border-b border-white/10 bg-[#101416] p-3 sm:p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-base font-bold">Look bank</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70" role="status">
          <Circle size={8} fill="currentColor" className={muted ? "text-coral" : "text-emerald-400"} aria-hidden="true" />
          {muted ? "Output dark" : flash ? "Flash held" : active?.name ?? "Custom look"}{armed ? ` · Armed: ${armed.name}` : ""}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" aria-pressed={armMode} onClick={() => { setArmMode(!armMode); setArmed(null); }} className="min-h-11 rounded-md border border-amber-300/35 px-3 text-sm text-amber-200 aria-pressed:bg-amber-300/20">Arm</button>
        <button type="button" disabled={!armed} onClick={() => { if (armed) onLook(armed); setArmed(null); }} className="min-h-11 rounded-md bg-emerald-300 px-4 text-sm font-bold text-black disabled:bg-white/8 disabled:text-white/75">GO</button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {SHOW_LOOKS.map((look, index) => <button type="button" key={look.name} aria-pressed={active === look}
        onClick={() => select(look)}
        style={{ borderTopColor: look.color }}
        className={`min-h-16 rounded-md border border-t-2 px-2 py-2 text-left hover:bg-white/10 ${armed === look ? "border-amber-300/65 bg-amber-300/10" : active === look ? "border-emerald-300/55 bg-emerald-300/10" : "border-white/15 bg-[#181e21]"}`}>
        <span className="flex items-start justify-between gap-1 text-sm font-semibold text-white">{look.name}<kbd className="text-xs font-normal text-white/75">{index + 1}</kbd></span>
        <span className="block text-xs text-white/75">{look.detail}</span>
      </button>)}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" aria-pressed={flash} disabled={muted} onBlur={() => onFlash(false)}
        onPointerDown={(event) => { if (event.button === 0) { event.currentTarget.setPointerCapture(event.pointerId); onFlash(true); } }}
        onLostPointerCapture={() => onFlash(false)}
        onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); onFlash(true); } }}
        onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); onFlash(false); } }}
        className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-sky-300/35 bg-sky-300/10 text-sm text-sky-100 aria-pressed:bg-sky-200 aria-pressed:text-black disabled:opacity-40">
        <Zap size={15} aria-hidden="true" /> Hold flash
      </button>
      <p className="self-center text-xs text-white/75">Arm a look, then press GO to take it live. Keys 1–6 select looks while a desk button has focus.</p>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 sm:grid-cols-4">
      {[master, ...faders].map((fader) => <label key={fader.label} className="grid min-w-0 gap-1 text-xs text-white/80">
        <span className="flex justify-between gap-1"><span>{fader.label}</span><span className="tabular-nums text-white/75">{Math.round(fader.value * 100)}%</span></span>
        <input aria-label={fader.label} type="range" min="0" max={fader.max ?? 1} step=".01" value={fader.value}
          onChange={(event) => fader.onChange(Number(event.target.value))} className="h-9 min-w-0 accent-emerald-300" />
      </label>)}
    </div>
  </section>;
}
