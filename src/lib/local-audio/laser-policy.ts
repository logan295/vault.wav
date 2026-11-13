export type LaserRelease = "drops" | "arrangement" | "open" | "off";

/** Evaluate at the audio clock, so seeking and detached stage windows agree. */
export function laserReleaseAt(mode: LaserRelease, time: number, bpm: number, drops: number[], section?: string, holdBars = 4) {
  if (mode === "off") return 0;
  if (mode === "open" || mode === "arrangement") return 1;
  if (!drops.length && section === "Drop") return 1;
  // Hold a drop for four bars, never anticipate its leading edge.
  return drops.some(at => time >= at && time < at + Math.max(1, holdBars) * 240 / Math.max(1, bpm)) ? 1 : 0;
}
