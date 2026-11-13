export type SongCue = {
  time: number; end: number; section: "Quiet" | "Build" | "Groove" | "Drop";
  top: number; bottom: number; center: number; lasers: "none" | "center" | "top" | "bottom" | "all"; rate: number; phase: number; gate: "answer" | "ripple" | "mirror" | "punctuate";
};

type Bands = { full: number[]; low: number[]; mid: number[]; high: number[] };

/** Deterministic arrangement derived from this track's envelope and detected drop edges. */
export function programSong(bands: Bands, duration: number, bpm: number, offset: number, drops: number[], identity: string): SongCue[] {
  if (!bands.full.length || !Number.isFinite(duration) || duration <= 0 || bpm <= 0) return [];
  const bar = 240 / bpm;
  const mean = (values: number[], start: number, end: number) => {
    const first = Math.max(0, Math.floor(start / duration * values.length));
    const last = Math.min(values.length, Math.max(first + 1, Math.ceil(end / duration * values.length)));
    let sum = 0;
    for (let i = first; i < last; i++) sum += values[i];
    return sum / Math.max(1, last - first);
  };
  const beat = 60 / bpm;
  const validDrops = drops.filter((time) => Number.isFinite(time) && time >= 0 && time < duration);
  const dropEdges = validDrops.flatMap((at) => [at-bar*2,at-bar,...Array.from({length:9},(_,i)=>at+i*beat)]);
  const boundaries = [...new Set([0, ...Array.from({ length: Math.ceil(duration / bar) }, (_, i) => offset + i * bar), ...dropEdges])]
    .filter((time) => time >= 0 && time < duration).sort((a, b) => a - b);
  const levels = boundaries.map((time, i) => mean(bands.full, time, boundaries[i + 1] ?? duration));
  const sorted = [...levels].sort((a, b) => a - b);
  const quiet = sorted[Math.floor(sorted.length * .23)] ?? .2;
  const loud = sorted[Math.floor(sorted.length * .7)] ?? .7;
  const seed = Array.from(identity).reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 7);
  const pairs = [[12, 13], [29, 32], [30, 31], [33, 34], [8, 9], [14, 15]];
  const cues: SongCue[] = [];
  let phase = 0;
  for (let i = 0; i < boundaries.length; i++) {
    const time = boundaries[i];
    const end = boundaries[i + 1] ?? duration;
    const bass = mean(bands.low, time, end);
    const prior = mean(bands.full, Math.max(0, time - bar * 2), time);
    const dropAt = validDrops.filter((at) => time >= at && time < at + bar*4).at(-1);
    const nextDrop = validDrops.find((at) => at > time && at-time <= bar*2);
    const recentDrop = dropAt !== undefined;
    const relative = Math.max(0,Math.min(1,(levels[i]-quiet)/Math.max(.06,loud-quiet)));
    const buildup = nextDrop === undefined ? 0 : 1-(nextDrop-time)/(bar*2);
    const section = recentDrop ? "Drop" : nextDrop !== undefined ? "Build"
      : levels[i] < quiet + .015 && bass < .48 ? "Quiet"
      : levels[i] - prior > .065 ? "Build" : "Groove";
    const choice = (seed + i + Math.floor(bass * 11) + Math.floor(mean(bands.high, time, end) * 7)) % pairs.length;
    const [top, bottom] = section === "Quiet" ? [5, 11] : section === "Build" ? [10, 4] : pairs[choice];
    const dropAge = dropAt === undefined ? Infinity : (time-dropAt)/beat;
    const rate = section === "Quiet" ? .12+relative*.2 : section === "Build" ? .22+buildup*.55
      : section === "Drop" ? (dropAge<1 ? 1.8 : dropAge<4 ? 1.1+relative*.4 : .6+relative*.65)
      : .25+relative*.35+Math.min(.12,bass*.12);
    const gate = section === "Quiet" ? "punctuate" : section === "Drop" ? "mirror" : section === "Build" ? "ripple" : i % 2 ? "answer" : "ripple";
    const lasers = section === "Quiet" || (section === "Groove" && i % 8 === 7 && levels[i] < loud) ? "none"
      : section === "Drop" ? (dropAge < 2 || Math.floor(dropAge)%4 === 0 ? "all" : Math.floor(dropAge)%4 === 1 ? "top" : Math.floor(dropAge)%4 === 2 ? "bottom" : "all")
      : section === "Build" ? (i % 3 === 0 ? "none" : "center")
      : (["top", "bottom", "center", "all"] as const)[(seed + i) % 4];
    const center = pairs[(choice + 2) % pairs.length][0];
    cues.push({ time, end, section, top, bottom, center, lasers, rate, phase, gate });
    phase += (end - time) * bpm / 60 * rate;
  }
  return cues;
}

export function songCueAt(cues: SongCue[], time: number): SongCue | undefined {
  let low = 0;
  let high = cues.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (cues[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  return cues[low - 1];
}

/** Integrated motion phase: common to lasers, fixture movement and visual transport. */
export function showMotionAt(cue: SongCue | undefined, time: number, bpm: number) {
  return cue ? cue.phase+Math.max(0,time-cue.time)*bpm/60*cue.rate : Math.max(0,time)*bpm/60;
}
