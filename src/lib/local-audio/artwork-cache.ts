import "server-only";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
const entrySchema = z.object({ relativePath: z.string(), url: z.string().url().refine(value => { try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "soundcloud.com"; } catch { return false; } }), title: z.string(), uploader: z.string(), verifiedAt: z.string() });
const manifestSchema = z.object({ version: z.literal(1), entries: z.record(z.string().regex(/^[a-f0-9]{24}$/), entrySchema) });
export type ArtworkEntry = z.infer<typeof entrySchema>;
export function artworkKey(relativePath: string) { return createHash("sha256").update(relativePath).digest("hex").slice(0, 24); }
export async function readUsbArtwork(root: string): Promise<Record<string, ArtworkEntry>> {
  try {
    const folder = join(root,".womp","artwork");
    if (await realpath(folder) !== folder) return {};
    const path = join(folder,"manifest.json"); if (await realpath(path) !== path) return {};
    return manifestSchema.parse(JSON.parse(await readFile(path,"utf8"))).entries;
  } catch { return {}; }
}
export async function readCachedTrackArtwork(root: string, relativePath: string) {
  const key = artworkKey(relativePath); const entry = (await readUsbArtwork(root))[key];
  if (!entry || entry.relativePath !== relativePath) return null;
  try {
    const path = join(root,".womp","artwork",`${key}.jpg`);
    if (await realpath(path) !== path || (await stat(path)).size > 5 * 1024 * 1024) return null;
    return await readFile(path);
  } catch { return null; }
}
