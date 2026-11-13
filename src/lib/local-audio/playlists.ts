import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { discoverVolumes, readIndex } from "./library";
import type { LocalPlaylist } from "./types";

const PLAYLIST_PATH = process.env.VAULT_WAV_PLAYLIST_PATH || join(/* turbopackIgnore: true */ process.cwd(), "var", "local-playlists.json");
const portableSchema = z.object({ version: z.literal(1), id: z.string().uuid(), name: z.string().min(1).max(100), description: z.string().max(500).optional(), coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), coverId: z.string().uuid().nullable().optional(), paths: z.array(z.string()).max(10000), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
let queue = Promise.resolve();
function transaction<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work); queue = result.then(() => {}, () => {}); return result;
}
async function local(): Promise<LocalPlaylist[]> {
  try { return JSON.parse(await readFile(PLAYLIST_PATH, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
async function atomic(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", flag: "wx" }); await rename(temporary, path); }
  finally { await unlink(temporary).catch(() => {}); }
}
async function save(playlists: LocalPlaylist[]) {
  await mkdir(dirname(PLAYLIST_PATH), { recursive: true }); await atomic(PLAYLIST_PATH, playlists);
}
async function driveFolder(root: string, create = false) {
  const folder = join(root, ".womp");
  if (create) await mkdir(folder).catch(error => { if (error.code !== "EEXIST") throw error; });
  if (await realpath(folder) !== folder) throw new Error("The .womp folder must be stored directly on the USB drive.");
  return folder;
}
async function merged(): Promise<LocalPlaylist[]> {
  const playlists = await local();
  const volumes = await discoverVolumes();
  const index = await readIndex();
  for (const volume of volumes) {
    let folder: string;
    try { folder = await driveFolder(volume.rootPath); } catch { continue; }
    for (const file of await readdir(folder)) {
      if (!file.endsWith(".json")) continue;
      try {
        const path = join(folder, file);
        if (await realpath(path) !== path) continue;
        const data = portableSchema.parse(JSON.parse(await readFile(path, "utf8")));
        if (file !== `${data.id}.json`) continue;
        const byPath = new Map(index.tracks.filter(t => t.volumeId === volume.id).map(t => [t.relativePath, t.id]));
        const previous = playlists.find(p => p.id === data.id);
        // Keep unresolved references until the drive has been scanned.
        const trackIds = data.paths.map(path => byPath.get(path));
        if (trackIds.some(id => !id)) continue;
        const restored: LocalPlaylist = { id: data.id, name: data.name, description: data.description, coverColor: data.coverColor, coverId: data.coverId, trackIds: trackIds as string[], createdAt: data.createdAt, updatedAt: data.updatedAt, usbVolumeName: volume.name };
        if (previous) Object.assign(previous, restored); else playlists.push(restored);
      } catch { /* Ignore unrelated or malformed portable files. */ }
    }
  }
  return playlists.map(p => ({ ...p, usbConnected: p.usbVolumeName ? volumes.some(v => v.name === p.usbVolumeName) : undefined }));
}
export function readPlaylists() { return transaction(async () => { const playlists = await merged(); await save(playlists); return playlists; }); }
async function writeToDrive(playlist: LocalPlaylist) {
  if (!playlist.usbVolumeName) return;
  const volume = (await discoverVolumes()).find(v => v.name === playlist.usbVolumeName);
  if (!volume) throw new Error(`Connect ${playlist.usbVolumeName} to save changes to this playlist.`);
  const index = await readIndex();
  const paths = playlist.trackIds.map(id => {
    const track = index.tracks.find(t => t.id === id);
    if (!track || track.volumeId !== volume.id) throw new Error("USB playlists can only contain tracks stored on the chosen drive.");
    return track.relativePath;
  });
  const folder = await driveFolder(volume.rootPath, true);
  if (playlist.coverId) {
    const destination = join(folder, coverFilename(playlist));
    const image = await readFile(cachedCoverPath(playlist)).catch(async () => {
      if (await realpath(destination) !== destination) throw new Error("Invalid playlist image path.");
      return readFile(destination);
    });
    await atomicBytes(destination, image);
  }
  await atomic(join(folder, `${playlist.id}.json`), { version: 1, id: playlist.id, name: playlist.name, description: playlist.description, coverColor: playlist.coverColor, coverId: playlist.coverId, paths, createdAt: playlist.createdAt, updatedAt: playlist.updatedAt });
}
export function createPlaylist(name: string) { return transaction(async () => {
  const playlists = await merged(); const now = new Date().toISOString();
  const playlist: LocalPlaylist = { id: randomUUID(), name, trackIds: [], createdAt: now, updatedAt: now };
  playlists.push(playlist); await save(playlists); return playlist;
}); }
export function updatePlaylist(id: string, changes: { name?: string; description?: string; coverColor?: string; trackIds?: string[]; usbVolumeName?: string }) { return transaction(async () => {
  const playlists = await merged(); const index = playlists.findIndex(p => p.id === id); if (index < 0) return null;
  if (changes.usbVolumeName && playlists[index].usbVolumeName && changes.usbVolumeName !== playlists[index].usbVolumeName) throw new Error("This playlist is already linked to a USB. Create another playlist for a different drive.");
  const playlist = { ...playlists[index], ...changes, updatedAt: new Date().toISOString() };
  await writeToDrive(playlist); playlist.usbConnected = playlist.usbVolumeName ? true : undefined;
  playlists[index] = playlist; await save(playlists); return playlist;
}); }
export function deletePlaylist(id: string) { return transaction(async () => {
  const playlists = await merged(); const playlist = playlists.find(p => p.id === id); if (!playlist) return false;
  if (playlist.usbVolumeName) {
    const volume = (await discoverVolumes()).find(v => v.name === playlist.usbVolumeName);
    if (!volume) throw new Error(`Connect ${playlist.usbVolumeName} to delete its saved playlist.`);
    await unlink(join(await driveFolder(volume.rootPath), `${playlist.id}.json`));
  }
  if (playlist.coverId) {
    await unlink(cachedCoverPath(playlist)).catch(() => {});
    const volume = (await discoverVolumes()).find(v => v.name === playlist.usbVolumeName);
    if (volume) await unlink(join(await driveFolder(volume.rootPath), coverFilename(playlist))).catch(() => {});
  }
  await save(playlists.filter(p => p.id !== id)); return true;
}); }

const COVER_ROOT = join(dirname(PLAYLIST_PATH), "playlist-covers");
function coverFilename(playlist: LocalPlaylist) {
  z.string().uuid().parse(playlist.id); z.string().uuid().parse(playlist.coverId);
  return `${playlist.id}-${playlist.coverId}.jpg`;
}
function cachedCoverPath(playlist: LocalPlaylist) { return join(COVER_ROOT, coverFilename(playlist)); }
async function atomicBytes(path: string, data: Buffer) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, data, { flag: "wx" }); await rename(temporary, path); }
  finally { await unlink(temporary).catch(() => {}); }
}
export async function setPlaylistCover(id: string, input: Buffer | null) {
  if (input && input.length > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
  let image: Buffer | null = null;
  if (input) {
    try {
      const decoder = sharp(input, { limitInputPixels: 40_000_000, animated: false });
      const metadata = await decoder.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw new Error("Unsupported image");
      image = await decoder.rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#181818" }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    } catch { throw new Error("Choose a valid JPG, PNG or WebP image."); }
  }
  return transaction(async () => {
    const playlists = await merged(); const index = playlists.findIndex(p => p.id === id); if (index < 0) return null;
    const previous = playlists[index];
    const playlist = { ...previous, coverId: image ? randomUUID() : null, updatedAt: new Date().toISOString() };
    if (image) { await mkdir(COVER_ROOT, { recursive: true }); await atomicBytes(cachedCoverPath(playlist), image); }
    await writeToDrive(playlist); playlists[index] = playlist; await save(playlists);
    if (previous.coverId) {
      await unlink(cachedCoverPath(previous)).catch(() => {});
      if (previous.usbVolumeName) {
        const volume = (await discoverVolumes()).find(v => v.name === previous.usbVolumeName);
        if (volume) await unlink(join(await driveFolder(volume.rootPath), coverFilename(previous))).catch(() => {});
      }
    }
    return playlist;
  });
}
export function readPlaylistCover(id: string) { return transaction(async () => {
  const playlist = (await merged()).find(p => p.id === id); if (!playlist?.coverId) return null;
  try { return await readFile(cachedCoverPath(playlist)); } catch { /* Read the portable image. */ }
  const volume = (await discoverVolumes()).find(v => v.name === playlist.usbVolumeName); if (!volume) return null;
  const path = join(await driveFolder(volume.rootPath), coverFilename(playlist));
  if (await realpath(path) !== path) return null;
  const image = await readFile(path);
  await mkdir(COVER_ROOT, { recursive: true }); await atomicBytes(cachedCoverPath(playlist), image);
  return image;
}); }
