/** Find sustained returns of bass after a quieter passage, timed at the leading edge. */
export function arenaDrops(low: number[], full: number[], duration: number, bpm = 120): number[] {
  if (!low.length || !full.length || !Number.isFinite(duration) || duration <= 0) return [];

  const interval = .025;
  const count = Math.ceil(duration / interval);
  const bass = new Float32Array(count + 1);
  const energy = new Float32Array(count + 1);
  for (let bin = 0; bin < count; bin++) {
    const from = bin * interval / duration;
    const to = Math.min(1, (bin + 1) * interval / duration);
    bass[bin + 1] = bass[bin] + windowMean(low, from, to);
    energy[bin + 1] = energy[bin] + windowMean(full, from, to);
  }

  const drops: number[] = [];
  for (let bin = 80; bin + 80 < count; bin++) {
    const onset = (bass[bin + 4] - bass[bin]) / 4;
    const recent = (bass[bin] - bass[bin - 8]) / 8;
    const before = (bass[bin - 4] - bass[bin - 40]) / 36;
    const after = (bass[bin + 28] - bass[bin]) / 28;
    const energyRise = (energy[bin + 16] - energy[bin]) / 16 - (energy[bin] - energy[bin - 32]) / 32;
    // A single kick or fill is not a drop: require a sustained phrase-level return.
    const beforePhrase = (bass[bin - 8] - bass[bin - 80]) / 72;
    const afterPhrase = (bass[bin + 80] - bass[bin]) / 80;
    const sustained = afterPhrase - beforePhrase > .1 && afterPhrase > beforePhrase * 1.22;
    if (sustained && onset > .44 && onset - recent > .14 && after - before > .15 && energyRise > .045) {
      // Anchor to the first rising bin inside the short attack window.
      let edge = bin;
      while (edge < bin + 3 && bass[edge + 1] - bass[edge] < recent + .1) edge++;
      drops.push(edge * interval);
      bin += Math.round((960 / (Number.isFinite(bpm) && bpm > 0 ? bpm : 120)) / interval);
    }
  }
  return drops;
}

function windowMean(values: number[], from: number, to: number) {
  const first = Math.floor(from * values.length);
  const last = Math.min(values.length, Math.max(first + 1, Math.floor(to * values.length)));
  let sum = 0;
  for (let index = first; index < last; index++) sum += values[index];
  return sum / Math.max(1, last - first);
}

/** Timestamp bass attacks independently of the beat grid. */
export function arenaAttacks(low: number[], full: number[], duration: number): number[] {
  if (!low.length || !full.length || !Number.isFinite(duration) || duration <= 0) return [];
  const step = .02;
  const attacks: number[] = [];
  let previousBass = 0;
  let previousEnergy = 0;
  let baseline = 0;
  let last = -.15;
  for (let at = 0; at < duration; at += step) {
    const start = at / duration;
    const end = Math.min(1, (at + step) / duration);
    const bass = windowMean(low, start, end);
    const energy = windowMean(full, start, end);
    const rise = bass - previousBass;
    if (at - last >= .15 && rise > Math.max(.095, baseline * .46) && bass > .27 && energy - previousEnergy > .022) {
      attacks.push(at);
      last = at;
    }
    baseline += (bass - baseline) * .15;
    previousBass = bass;
    previousEnergy = energy;
  }
  return attacks;
}
