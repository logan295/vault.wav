import { useState } from "react";

export type ArenaCue = { beat: number; look: "fan" | "lattice" };

export function ArenaCueControls({ cues, beat, onChange }: {
  cues: ArenaCue[]; beat: number; onChange: (cues: ArenaCue[]) => void;
}) {
  const [position, setPosition] = useState("");
  const snappedBeat = Math.round(beat * 4) / 4;

  function addCue(look: ArenaCue["look"]) {
    const at = position.trim() === "" ? snappedBeat : Number(position) - 1;
    if (!Number.isFinite(at) || at < 0) return;
    const next = Math.round(at * 4) / 4;
    onChange([...cues.filter((cue) => cue.beat !== next), { beat: next, look }].sort((a, b) => a.beat - b.beat));
  }

  return <section aria-label="Song cues" className="border-t border-white/10 bg-[#07090a] px-4 py-3">
    <h3 className="text-xs font-semibold text-white/85">Song cues</h3>
    <p className="mt-1 text-xs text-white/55">Each cue holds until the next cue. Use the playhead or enter a beat. Saved in this browser.</p>
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs text-white/65">
        Beat
        <input type="number" min="1" step=".25" value={position} placeholder={String(snappedBeat + 1)} onChange={(event) => setPosition(event.target.value)} className="h-11 w-28 rounded border border-white/20 bg-black px-2 text-white" />
      </label>
      <button type="button" onClick={() => addCue("fan")} className="min-h-11 rounded border border-blue-400/35 px-3 text-xs text-blue-200">Set blue fan</button>
      <button type="button" onClick={() => addCue("lattice")} className="min-h-11 rounded border border-white/25 px-3 text-xs text-white">Set white lattice</button>
    </div>
    {!!cues.length && <ul className="mt-2 flex flex-wrap gap-2">
      {cues.map((cue) => <li key={cue.beat}>
        <button type="button" onClick={() => onChange(cues.filter((entry) => entry.beat !== cue.beat))} aria-label={`Remove ${cue.look} cue at beat ${cue.beat + 1}`} className="min-h-11 rounded border border-white/10 px-2 text-xs text-white/75">
          {cue.beat + 1} · {cue.look} ×
        </button>
      </li>)}
    </ul>}
  </section>;
}
