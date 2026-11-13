import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { parseFile } from "music-metadata";
import type { LocalLibraryIndex, LocalTrack, LocalVolume } from "./types";
import { hasRekordboxLibrary, readRekordboxLibrary } from "./rekordbox";

const VOLUMES_ROOT = process.env.VAULT_WAV_VOLUMES_ROOT || "/Volumes";
const INDEX_PATH = process.env.VAULT_WAV_INDEX_PATH || join(/* turbopackIgnore: true */ process.cwd(), "var", "local-library.json");
const EMPTY_INDEX: LocalLibraryIndex = {
  version: 1,
  selectedVolumeIds: [],
  tracks: [],
  scannedAt: null,
};

function stableId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function assertLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Local USB access is only available from this Mac.");
  }
}

export async function readIndex(): Promise<LocalLibraryIndex> {
  try {
    const parsed = JSON.parse(await readFile(INDEX_PATH, "utf8")) as LocalLibraryIndex;
    return parsed.version === 1 || parsed.version === 2 || parsed.version === 3 ? parsed : EMPTY_INDEX;
  } catch {
    return { ...EMPTY_INDEX, selectedVolumeIds: [], tracks: [] };
  }
}

async function writeIndex(index: LocalLibraryIndex) {
  await mkdir(dirname(INDEX_PATH), { recursive: true });
  const temporaryPath = `${INDEX_PATH}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(index, null, 2), "utf8");
  const { rename } = await import("node:fs/promises");
  await rename(temporaryPath, INDEX_PATH);
}

let analysisWriteQueue = Promise.resolve();

export function persistTrackAnalysis(trackId: string, analysis: { bpm: number | null; musicalKey: string | null }) {
  analysisWriteQueue = analysisWriteQueue.then(async () => {
    const index = await readIndex();
    const track = index.tracks.find((candidate) => candidate.id === trackId);
    if (!track || (track.bpm === analysis.bpm && track.musicalKey === analysis.musicalKey)) return;
    await writeIndex({
      ...index,
      tracks: index.tracks.map((candidate) => candidate.id === trackId ? { ...candidate, bpm: analysis.bpm, musicalKey: analysis.musicalKey } : candidate),
    });
  });
  return analysisWriteQueue;
}

type MountedVolume = LocalVolume & { rootPath: string };

export async function discoverVolumes(): Promise<MountedVolume[]> {
  const index = await readIndex();
  let entries;
  try {
    entries = await readdir(VOLUMES_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }

  const volumes: MountedVolume[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name.startsWith(".")) continue;
    const rootPath = await realpath(join(VOLUMES_ROOT, entry.name)).catch(() => null);
    if (!rootPath || rootPath === "/") continue;
    const id = stableId(rootPath);
    volumes.push({ id, name: entry.name, rootPath, selected: index.selectedVolumeIds.includes(id), rekordboxDetected: await hasRekordboxLibrary(rootPath) });
  }
  return volumes.sort((a, b) => a.name.localeCompare(b.name));
}

const AUDIO_EXTENSIONS = new Set([".wav", ".mp3", ".aif", ".aiff", ".flac", ".m4a", ".aac"]);

async function collectAudioFiles(rootPath: string) {
  const files: string[] = [];
  const pending = [rootPath];
  while (pending.length) {
    const directory = pending.pop()!;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && AUDIO_EXTENSIONS.has(path.slice(path.lastIndexOf(".")).toLowerCase()) && !entry.name.startsWith("._")) files.push(path);
    }
  }
  return files;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function scanVolumes(selectedVolumeIds: string[]) {
  const mounted = await discoverVolumes();
  const selected = mounted.filter((volume) => selectedVolumeIds.includes(volume.id));
  if (selected.length !== selectedVolumeIds.length) {
    throw new Error("One or more selected USB drives are no longer mounted.");
  }

  const previous = await readIndex();
  const previousByPath = new Map(previous.tracks.map((track) => [`${track.volumeId}:${track.relativePath}`, track]));
  const scannedTracks: LocalLibraryIndex["tracks"] = [];
  const failures: string[] = [];

  for (const volume of selected) {
    const rekordbox = await readRekordboxLibrary(volume.rootPath);
    const paths = await collectAudioFiles(volume.rootPath);
    const tracks = await mapWithConcurrency(paths, 4, async (filePath) => {
      try {
        const fileStat = await stat(filePath);
        const relativePath = relative(volume.rootPath, filePath);
        const cacheKey = `${volume.id}:${relativePath}`;
        const cached = previousByPath.get(cacheKey);
        if (cached && "bitrateKbps" in cached && cached.fileSize === fileStat.size && cached.modifiedAtMs === fileStat.mtimeMs && (cached.rekordbox === null || cached.rekordbox?.analysisVersion === 2)) return cached;

        const metadata = await parseFile(filePath, { duration: true });
        const rekordboxTrack = await rekordbox?.match(relativePath);
        const durationSecs = rekordboxTrack?.durationSecs ?? metadata.format.duration ?? null;
        const bitrate = metadata.format.bitrate
          ?? (metadata.format.sampleRate && metadata.format.bitsPerSample && metadata.format.numberOfChannels
            ? metadata.format.sampleRate * metadata.format.bitsPerSample * metadata.format.numberOfChannels
            : null)
          ?? (durationSecs ? fileStat.size * 8 / durationSecs : null);
        return {
          id: stableId(cacheKey),
          volumeId: volume.id,
          sourceName: volume.name,
          relativePath,
          title: rekordboxTrack?.title || metadata.common.title?.trim() || entryTitle(relativePath),
          artist: rekordboxTrack?.artist || metadata.common.artist?.trim() || null,
          album: rekordboxTrack?.album || metadata.common.album?.trim() || null,
          hasArtwork: !!metadata.common.picture?.length,
          durationSecs,
          sampleRate: metadata.format.sampleRate ?? null,
          bitDepth: metadata.format.bitsPerSample ?? null,
          bitrateKbps: bitrate ? Math.round(bitrate / 1000) : null,
          channels: metadata.format.numberOfChannels ?? null,
          codec: metadata.format.codec ?? null,
          bpm: rekordboxTrack?.metadata.bpm ?? metadata.common.bpm ?? null,
          musicalKey: rekordboxTrack?.metadata.musicalKey ?? metadata.common.key?.trim() ?? null,
          rekordbox: rekordboxTrack?.metadata ?? null,
          fileSize: fileStat.size,
          modifiedAtMs: fileStat.mtimeMs,
        };
      } catch {
        failures.push(relative(volume.rootPath, filePath));
        return null;
      }
    });
    scannedTracks.push(...tracks.filter((track): track is LocalLibraryIndex["tracks"][number] => track !== null));
  }

  const selectedSet = new Set(selectedVolumeIds);
  const index: LocalLibraryIndex = {
    version: 3,
    selectedVolumeIds,
    tracks: [...previous.tracks.filter((track) => !selectedSet.has(track.volumeId)), ...scannedTracks],
    scannedAt: new Date().toISOString(),
  };
  await writeIndex(index);
  return { indexed: scannedTracks.length, skipped: failures.length, scannedAt: index.scannedAt };
}

function entryTitle(relativePath: string) {
  const filename = relativePath.split(sep).at(-1) || relativePath;
  return filename.replace(/\.(wav|mp3|aiff?|flac|m4a|aac)$/i, "");
}

export async function listTracks(): Promise<LocalTrack[]> {
  const [index, mounted] = await Promise.all([readIndex(), discoverVolumes()]);
  const mountedIds = new Set(mounted.map((volume) => volume.id));
  const selectedIds = new Set(index.selectedVolumeIds);
  return index.tracks
    .filter((track) => selectedIds.has(track.volumeId))
    .map((track) => ({ ...track, available: mountedIds.has(track.volumeId) }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function resolveTrackPath(trackId: string) {
  const [index, mounted] = await Promise.all([readIndex(), discoverVolumes()]);
  const track = index.tracks.find((candidate) => candidate.id === trackId && index.selectedVolumeIds.includes(candidate.volumeId));
  const volume = mounted.find((candidate) => candidate.id === track?.volumeId);
  if (!track || !volume) return null;

  const candidate = resolve(volume.rootPath, track.relativePath);
  const canonical = await realpath(candidate).catch(() => null);
  const canonicalRoot = await realpath(volume.rootPath);
  if (!canonical || (canonical !== canonicalRoot && !canonical.startsWith(`${canonicalRoot}${sep}`))) return null;
  return { path: canonical, track };
}
