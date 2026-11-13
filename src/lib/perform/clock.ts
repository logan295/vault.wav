export type ClockOwner = "header" | number;
export type MusicalClock = {
  bpm: number;
  anchorBeat: number;
  anchorTime: number;
  owner: ClockOwner;
  locked: boolean;
};
export function beatAt(clock: MusicalClock, time: number) {
  return clock.anchorBeat + ((time - clock.anchorTime) * clock.bpm) / 60;
}
export function changeTempo(
  clock: MusicalClock,
  bpm: number,
  time: number,
): MusicalClock {
  if (!Number.isFinite(bpm)) return clock;
  return {
    ...clock,
    anchorBeat: beatAt(clock, time),
    anchorTime: time,
    bpm: Math.max(20, Math.min(999, bpm)),
  };
}
export function nextBoundary(
  clock: MusicalClock,
  time: number,
  quantumBeats: number,
  lead = 0.025,
) {
  if (quantumBeats <= 0) return time + lead;
  const nextBeat =
    Math.ceil((beatAt(clock, time + lead) - 1e-9) / quantumBeats) *
    quantumBeats;
  return clock.anchorTime + ((nextBeat - clock.anchorBeat) * 60) / clock.bpm;
}
