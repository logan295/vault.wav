import "server-only";
import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import MusicTempo from "music-tempo";

const CACHE_ROOT = join(
  dirname(
    process.env.VAULT_WAV_INDEX_PATH ||
      join(/* turbopackIgnore: true */ process.cwd(), "var/local-library.json"),
  ),
  "waveforms-v7",
);
type WaveformBands = {
  full: number[];
  low: number[];
  mid: number[];
  high: number[];
};
type StereoAnalysis = { left: number[]; right: number[]; correlation: number };
export type WaveformAnalysis = {
  peaks: WaveformBands;
  stereo: StereoAnalysis;
  bpm: number | null;
  musicalKey: string | null;
  beatOffsetSecs: number;
};
const analysesInFlight = new Map<string, Promise<WaveformAnalysis>>();

export async function waveformAnalysis(
  trackId: string,
  filePath: string,
  force = false,
): Promise<WaveformAnalysis> {
  const source = await stat(filePath);
  const cachePath = join(CACHE_ROOT, `${trackId}.json`);
  try {
    const cached = JSON.parse(
      await readFile(cachePath, "utf8"),
    ) as WaveformAnalysis & { sourceSize?: number; sourceModifiedAt?: number };
    if (
      !force &&
      cached.sourceSize === source.size &&
      cached.sourceModifiedAt === source.mtimeMs &&
      cached.peaks.full.length > 0 && cached.peaks.low.length===cached.peaks.full.length && cached.peaks.mid.length===cached.peaks.full.length && cached.peaks.high.length===cached.peaks.full.length
    )
      return cached;
  } catch {
    /* generate */
  }
  const existing = analysesInFlight.get(trackId);
  if (existing) return existing;
  const analysisPromise = generateAnalysis(
    trackId,
    filePath,
    cachePath,
    source.size,
    source.mtimeMs,
  );
  analysesInFlight.set(trackId, analysisPromise);
  try {
    return await analysisPromise;
  } finally {
    if (analysesInFlight.get(trackId) === analysisPromise)
      analysesInFlight.delete(trackId);
  }
}

async function generateAnalysis(
  trackId: string,
  filePath: string,
  cachePath: string,
  sourceSize: number,
  sourceModifiedAt: number,
): Promise<WaveformAnalysis> {
  const [
    fullSamples,
    lowSamples,
    midSamples,
    highSamples,
    stereoSamples,
    tempoSamples,
    keySamples,
  ] = await Promise.all([
    decodeMonoSamples(filePath, 800),
    decodeMonoSamples(filePath, 800, undefined, "lowpass=f=220"),
    decodeMonoSamples(
      filePath,
      800,
      undefined,
      "highpass=f=220,lowpass=f=4200",
    ),
    decodeMonoSamples(filePath, 800, undefined, "highpass=f=4200"),
    decodeStereoSamples(filePath, 800),
    decodeMonoSamples(filePath, 44100, 60),
    decodeMonoSamples(filePath, 4000, 60),
  ]);
  const tempo = estimateTempo(tempoSamples);
  const stereo = analyzeStereo(stereoSamples, 24000);
  const analysis = {
    peaks: {
      full: createPeaks(fullSamples, 48000),
      low: normalizePeaks(createPeaks(lowSamples, 48000)),
      mid: normalizePeaks(createPeaks(midSamples, 48000)),
      high: normalizePeaks(createPeaks(highSamples, 48000)),
    },
    stereo,
    bpm: tempo.bpm,
    beatOffsetSecs: tempo.beatOffsetSecs,
    musicalKey: estimateKey(keySamples, 4000),
  };
  await mkdir(CACHE_ROOT, { recursive: true });
  const temporary = `${cachePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(
      temporary,
      JSON.stringify({ ...analysis, sourceSize, sourceModifiedAt }),
      "utf8",
    );
    await rename(temporary, cachePath);
  } finally {
    await rm(temporary, { force: true });
  }
  return analysis;
}

function createPeaks(samples: Float32Array, count: number) {
  const bucket = Math.max(1, Math.floor(samples.length / count));
  const peaks: number[] = [];
  for (let offset = 0; offset < samples.length; offset += bucket) {
    let peak = 0;
    for (
      let index = offset;
      index < Math.min(samples.length, offset + bucket);
      index++
    )
      peak = Math.max(peak, Math.abs(samples[index]));
    peaks.push(Number(Math.min(1, peak).toFixed(4)));
  }
  return peaks;
}
function normalizePeaks(peaks: number[]) {
  const sorted = [...peaks].sort((a, b) => a - b);
  const ceiling = Math.max(
    0.0001,
    sorted[Math.floor(sorted.length * 0.985)] || 1,
  );
  return peaks.map((peak) => Number(Math.min(1, peak / ceiling).toFixed(4)));
}
function analyzeStereo(samples: Float32Array, count: number): StereoAnalysis {
  const frames = Math.floor(samples.length / 2);
  const bucket = Math.max(1, Math.floor(frames / count));
  const left: number[] = [];
  const right: number[] = [];
  let sumLR = 0;
  let sumL2 = 0;
  let sumR2 = 0;
  for (let frame = 0; frame < frames; frame++) {
    const l = samples[frame * 2];
    const r = samples[frame * 2 + 1];
    sumLR += l * r;
    sumL2 += l * l;
    sumR2 += r * r;
  }
  for (let start = 0; start < frames; start += bucket) {
    let lPeak = 0;
    let rPeak = 0;
    for (let frame = start; frame < Math.min(frames, start + bucket); frame++) {
      lPeak = Math.max(lPeak, Math.abs(samples[frame * 2]));
      rPeak = Math.max(rPeak, Math.abs(samples[frame * 2 + 1]));
    }
    left.push(Number(Math.min(1, lPeak).toFixed(4)));
    right.push(Number(Math.min(1, rPeak).toFixed(4)));
  }
  return {
    left,
    right,
    correlation: Number(
      (sumLR / Math.sqrt(Math.max(0.000001, sumL2 * sumR2))).toFixed(3),
    ),
  };
}
function estimateTempo(samples: Float32Array) {
  try {
    const tempo = new MusicTempo(samples, {
      maxBeatInterval: 0.86,
      minBeatInterval: 0.29,
      expiryTime: 30,
    });
    const numericTempo = Number(tempo.tempo);
    return {
      bpm: Number.isFinite(numericTempo) ? Math.round(numericTempo) : null,
      beatOffsetSecs: tempo.beats[0] || 0,
    };
  } catch {
    return { bpm: null, beatOffsetSecs: 0 };
  }
}
function estimateKey(samples: Float32Array, sampleRate: number) {
  if (!samples.length) return null;
  const chroma = new Array(12).fill(0) as number[];
  const limit = Math.min(samples.length, sampleRate * 60);
  for (let midi = 36; midi <= 83; midi++) {
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate);
    let first = 0;
    let second = 0;
    for (let index = 0; index < limit; index += 2) {
      const next = samples[index] + coefficient * first - second;
      second = first;
      first = next;
    }
    chroma[midi % 12] +=
      first * first + second * second - coefficient * first * second;
  }
  const major = [
    6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
  ];
  const minor = [
    6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
  ];
  const names = [
    "C",
    "C♯",
    "D",
    "E♭",
    "E",
    "F",
    "F♯",
    "G",
    "A♭",
    "A",
    "B♭",
    "B",
  ];
  let best = { score: -Infinity, key: "" };
  for (let root = 0; root < 12; root++)
    for (const [profile, suffix] of [
      [major, "major"],
      [minor, "minor"],
    ] as const) {
      let score = 0;
      for (let pitch = 0; pitch < 12; pitch++)
        score += chroma[(pitch + root) % 12] * profile[pitch];
      if (score > best.score) best = { score, key: `${names[root]} ${suffix}` };
    }
  return best.key || null;
}
function decodeMonoSamples(
  filePath: string,
  sampleRate: number,
  maxSeconds?: number,
  audioFilter?: string,
) {
  return new Promise<Float32Array>((resolve, reject) => {
    const args = ["-v", "error", "-i", filePath];
    if (maxSeconds) args.push("-t", String(maxSeconds));
    if (audioFilter) args.push("-af", audioFilter);
    args.push("-ac", "1", "-ar", String(sampleRate), "-f", "f32le", "pipe:1");
    const child = spawn("ffmpeg", args);
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("error", () =>
      reject(new Error("Install ffmpeg to analyze BPM, key and waveforms.")),
    );
    child.on("close", (code) => {
      if (code !== 0)
        return reject(
          new Error(
            Buffer.concat(errors).toString() || "Audio analysis failed.",
          ),
        );
      const buffer = Buffer.concat(chunks);
      resolve(
        Float32Array.from(
          new Float32Array(
            buffer.buffer,
            buffer.byteOffset,
            Math.floor(buffer.byteLength / 4),
          ),
        ),
      );
    });
  });
}
function decodeStereoSamples(filePath: string, sampleRate: number) {
  return new Promise<Float32Array>((resolve, reject) => {
    const child = spawn("ffmpeg", [
      "-v",
      "error",
      "-i",
      filePath,
      "-ac",
      "2",
      "-ar",
      String(sampleRate),
      "-f",
      "f32le",
      "pipe:1",
    ]);
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("error", () =>
      reject(new Error("Install ffmpeg to analyze stereo audio.")),
    );
    child.on("close", (code) => {
      if (code !== 0)
        return reject(
          new Error(
            Buffer.concat(errors).toString() || "Stereo analysis failed.",
          ),
        );
      const buffer = Buffer.concat(chunks);
      resolve(
        Float32Array.from(
          new Float32Array(
            buffer.buffer,
            buffer.byteOffset,
            Math.floor(buffer.byteLength / 4),
          ),
        ),
      );
    });
  });
}
