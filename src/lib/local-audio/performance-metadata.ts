import "server-only";
import { readFile, writeFile, mkdir, rename, lstat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { LocalTrack } from "./types";
export const metadataPatch = z
  .object({
    bpm: z.number().min(20).max(400).optional(),
    musicalKey: z.string().max(24).optional(),
    firstBeatSecs: z.number().min(0).max(86400).optional(),
    cue: z.number().min(0).max(86400).optional(),
    hotCues: z
      .array(z.number().min(0).max(86400).nullable())
      .length(8)
      .optional(),
    analyzedAt: z.string().max(64).optional(),
  })
  .strict();
export type PerformanceMetadata = z.infer<typeof metadataPatch> & {
  updatedAt?: string;
};
const localPath = join(
  dirname(
    process.env.VAULT_WAV_INDEX_PATH ||
      join(/* turbopackIgnore: true */ process.cwd(), "var/local-library.json"),
  ),
  "performance-metadata.json",
);
type Store = Record<string, PerformanceMetadata>;
async function read(path: string): Promise<Store> {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    if (!value || typeof value !== "object") return {};
    const result: Store = {};
    for (const [key, v] of Object.entries(value)) {
      const parsed = metadataPatch
        .extend({ updatedAt: z.string().optional() })
        .safeParse(v);
      if (parsed.success) result[key] = parsed.data;
    }
    return result;
  } catch {
    return {};
  }
}
async function usbPath(root: string, create = false) {
  const folder = join(root, ".womp");
  try {
    const s = await lstat(folder);
    if (!s.isDirectory() || s.isSymbolicLink())
      throw Error("Unsafe USB metadata folder.");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    if (create) await mkdir(folder);
    else throw e;
  }
  const path = join(folder, "track-metadata.json");
  try {
    if ((await lstat(path)).isSymbolicLink())
      throw Error("Unsafe USB metadata file.");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  return path;
}
async function write(path: string, value: Store) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2));
  await rename(temporary, path);
}
export async function readPerformanceMetadata(
  volumes: { id: string; rootPath: string }[],
) {
  const local = await read(localPath),
    usb = new Map<string, Store>();
  await Promise.all(
    volumes.map(async (v) => {
      try {
        usb.set(v.id, await read(await usbPath(v.rootPath)));
      } catch {}
    }),
  );
  return (track: Omit<LocalTrack, "available">) => {
    const a = local[track.id],
      b = usb.get(track.volumeId)?.[track.relativePath];
    return b && (!a || (b.updatedAt || "") > (a.updatedAt || "")) ? b : a;
  };
}
let pending: Promise<unknown> = Promise.resolve();
export function savePerformanceMetadata(
  track: Omit<LocalTrack, "available">,
  root: string,
  patch: PerformanceMetadata,
) {
  const operation = pending
    .catch(() => {})
    .then(async () => {
      const local = await read(localPath);
      let path: string | null = null,
        portable: Store = {};
      try {
        path = await usbPath(root, true);
        portable = await read(path);
      } catch {}
      const previous =
        [local[track.id], portable[track.relativePath]]
          .filter(Boolean)
          .sort((a, b) =>
            (b.updatedAt || "").localeCompare(a.updatedAt || ""),
          )[0] || {};
      const metadata = {
        ...previous,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      local[track.id] = metadata;
      await write(localPath, local);
      let usbSaved = false;
      if (path) {
        portable[track.relativePath] = metadata;
        try {
          await write(path, portable);
          usbSaved = true;
        } catch {}
      }
      return { metadata, usbSaved };
    });
  pending = operation;
  return operation;
}
