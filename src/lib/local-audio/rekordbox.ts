import "server-only";

/* eslint-disable @typescript-eslint/no-explicit-any -- the generated parser intentionally ships an untyped Kaitai object graph */

import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { parseAnlz, parsePdb, RekordboxAnlz, RekordboxPdb, tableRows } from "rekordbox-parser";
import type { RekordboxCue, RekordboxMetadata } from "./types";

type PdbRow = Record<string, any>;

function text(value: any): string {
  return value?.body?.text ?? value?.text ?? "";
}

function usbPath(value: string) {
  return normalize(value.replace(/^[/\\]+/, "")).split(sep).join("/").toLowerCase();
}

function rows(db: any, type: number): PdbRow[] {
  const table = db.tables.find((candidate: any) => candidate.type === type);
  return table ? [...tableRows(table)] : [];
}

function cueColor(cue: any) {
  const values = [cue.red, cue.green, cue.blue];
  if (!values.every((value) => Number.isInteger(value)) || values.every((value) => value === 0)) return null;
  return `#${values.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function cueFromRow(cue: any): RekordboxCue {
  const label = text(cue.comment).replace(/\0+$/g, "").trim() || null;
  return {
    kind: cue.hotCue > 0 ? "hot" : "memory",
    slot: cue.hotCue > 0 ? cue.hotCue : null,
    timeMs: cue.time,
    loopEndMs: cue.loopTime === 0xffffffff || cue.loopTime === cue.time ? null : cue.loopTime,
    label,
    colorHex: cueColor(cue),
  };
}

async function readAnalysis(volumeRoot: string, analysisPath: string | null) {
  const empty = { beatCount: 0, firstBeatMs: null as number | null, cues: [] as RekordboxCue[] };
  if (!analysisPath) return empty;
  try {
    const relativePath = analysisPath.replace(/^[/\\]+/, "");
    const datPath = join(volumeRoot, relativePath);
    const extPath = datPath.slice(0, -extname(datPath).length) + ".EXT";
    const parsedFiles = await Promise.all([datPath, extPath].map(async (path) => {
      try { return parseAnlz(await readFile(path)); } catch { return null; }
    }));
    const parsed = parsedFiles[0];
    if (!parsed) return empty;
    const beatSection = parsed.sections.find((section: any) => section.fourcc === RekordboxAnlz.SectionTags.BEAT_GRID);
    const cuesByPosition = new Map<string, RekordboxCue>();
    for (const analysis of parsedFiles) {
      const cueSections = analysis?.sections.filter((section: any) => section.fourcc === RekordboxAnlz.SectionTags.CUES || section.fourcc === RekordboxAnlz.SectionTags.CUES_2) ?? [];
      for (const cue of cueSections.flatMap((section: any) => section.body.cues)) {
        const parsedCue = cueFromRow(cue);
        cuesByPosition.set(`${parsedCue.kind}:${parsedCue.slot ?? 0}:${parsedCue.timeMs}:${parsedCue.loopEndMs ?? 0}`, parsedCue);
      }
    }
    const cues = [...cuesByPosition.values()].sort((left, right) => left.timeMs - right.timeMs || (left.slot ?? 0) - (right.slot ?? 0));
    return {
      beatCount: beatSection?.body?.beats?.length ?? 0,
      firstBeatMs: beatSection?.body?.beats?.[0]?.time ?? null,
      cues,
    };
  } catch {
    return empty;
  }
}

export async function readRekordboxLibrary(volumeRoot: string) {
  const pdbPath = join(volumeRoot, "PIONEER", "rekordbox", "export.pdb");
  let db: any;
  try {
    db = parsePdb(await readFile(pdbPath));
  } catch {
    return null;
  }

  const T = RekordboxPdb.PageType;
  const artists = new Map(rows(db, T.ARTISTS).map((row) => [row.id, text(row.name)]));
  const albums = new Map(rows(db, T.ALBUMS).map((row) => [row.id, text(row.name)]));
  const keys = new Map(rows(db, T.KEYS).map((row) => [row.id, text(row.name)]));
  const playlistNodes = rows(db, T.PLAYLIST_TREE);
  const playlistNames = new Map(playlistNodes.filter((row) => !row.isFolder).map((row) => [row.id, text(row.name)]));
  const playlistsByTrack = new Map<number, string[]>();
  for (const entry of rows(db, T.PLAYLIST_ENTRIES)) {
    const name = playlistNames.get(entry.playlistId);
    if (!name) continue;
    playlistsByTrack.set(entry.trackId, [...(playlistsByTrack.get(entry.trackId) ?? []), name]);
  }

  const tracks = new Map<string, {
    title: string;
    artist: string | null;
    album: string | null;
    durationSecs: number | null;
    metadata: Omit<RekordboxMetadata, "beatCount" | "firstBeatMs" | "cues">;
  }>();
  for (const row of rows(db, T.TRACKS)) {
    const filePath = text(row.filePath);
    if (!filePath) continue;
    tracks.set(usbPath(filePath), {
      title: text(row.title),
      artist: artists.get(row.artistId) || null,
      album: albums.get(row.albumId) || null,
      durationSecs: row.duration || null,
      metadata: {
        trackId: row.id,
        analysisPath: text(row.analyzePath) || null,
        bpm: row.tempo ? row.tempo / 100 : null,
        musicalKey: keys.get(row.keyId) || null,
        playlistNames: playlistsByTrack.get(row.id) ?? [],
        analysisVersion: 2,
      },
    });
  }

  return {
    trackCount: tracks.size,
    playlistCount: playlistNames.size,
    async match(relativePath: string) {
      const track = tracks.get(usbPath(relativePath));
      if (!track) return null;
      return { ...track, metadata: { ...track.metadata, ...(await readAnalysis(volumeRoot, track.metadata.analysisPath)) } };
    },
  };
}

export async function hasRekordboxLibrary(volumeRoot: string) {
  try {
    await readFile(join(volumeRoot, "PIONEER", "rekordbox", "export.pdb"));
    return true;
  } catch {
    return false;
  }
}
