import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LocalPlaylist } from "./types";

const PLAYLIST_PATH = process.env.VAULT_WAV_PLAYLIST_PATH || join(/* turbopackIgnore: true */ process.cwd(), "var", "local-playlists.json");

export async function readPlaylists(): Promise<LocalPlaylist[]> {
  try { return JSON.parse(await readFile(PLAYLIST_PATH, "utf8")) as LocalPlaylist[]; }
  catch { return []; }
}

async function save(playlists: LocalPlaylist[]) {
  await mkdir(dirname(PLAYLIST_PATH), { recursive: true });
  const temporary = `${PLAYLIST_PATH}.tmp`;
  await writeFile(temporary, JSON.stringify(playlists, null, 2), "utf8");
  await rename(temporary, PLAYLIST_PATH);
}

export async function createPlaylist(name: string, trackIds: string[] = []) {
  const playlists = await readPlaylists();
  const now = new Date().toISOString();
  const playlist: LocalPlaylist = { id: randomUUID(), name, trackIds, createdAt: now, updatedAt: now };
  playlists.push(playlist); await save(playlists); return playlist;
}

export async function updatePlaylist(id: string, changes: { name?: string; trackIds?: string[] }) {
  const playlists = await readPlaylists();
  const index = playlists.findIndex((playlist) => playlist.id === id);
  if (index < 0) return null;
  playlists[index] = { ...playlists[index], ...changes, updatedAt: new Date().toISOString() };
  await save(playlists); return playlists[index];
}

export async function deletePlaylist(id: string) {
  const playlists = await readPlaylists();
  const next = playlists.filter((playlist) => playlist.id !== id);
  if (next.length === playlists.length) return false;
  await save(next); return true;
}
