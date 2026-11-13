import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import type { VfxClip } from "./types";

export const VFX_LIMIT = 150 * 1024 * 1024;
export const vfxRoot = () => join(dirname(process.env.VAULT_WAV_INDEX_PATH || join(process.cwd(), "var", "local-library.json")), "vfx");
export function vfxPath(id: string, asset: "video" | "poster") {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Error("Clip not found.");
  return join(vfxRoot(), `${id}.${asset === "poster" ? "jpg" : "mp4"}`);
}
export async function listVfx(): Promise<VfxClip[]> {
  await mkdir(vfxRoot(), { recursive: true });
  const files = await readdir(vfxRoot());
  const results = await Promise.all(files.filter(name => /^[a-f0-9]{24}\.json$/.test(name)).map(async name => {
    try { return JSON.parse(await readFile(join(vfxRoot(), name), "utf8")) as VfxClip; } catch { return null; }
  }));
  return results.filter((clip): clip is VfxClip => !!clip).sort((a,b) => a.label.localeCompare(b.label));
}
export async function saveVfx(video: File, poster: File) {
  if (!video.size || video.size > VFX_LIMIT) throw new Error("Choose an MP4 smaller than 150 MB.");
  if (!poster.size || poster.size > 2 * 1024 * 1024) throw new Error("Could not read the clip thumbnail.");
  const bytes = Buffer.from(await video.arrayBuffer());
  if (bytes.toString("ascii",4,8) !== "ftyp") throw new Error("Choose a browser-playable H.264 MP4. Convert MOV, HAP or DXV footage first.");
  const thumbnail = await sharp(Buffer.from(await poster.arrayBuffer())).resize(480,270,{fit:"cover"}).jpeg({quality:80}).toBuffer();
  const id = createHash("sha256").update(bytes).digest("hex").slice(0,24);
  const clip: VfxClip = { id, label: video.name.replace(/\.[^.]+$/," ").trim().slice(0,100), group:"My imports", src:`/api/local/vfx/${id}`, poster:`/api/local/vfx/${id}?poster=1` };
  await mkdir(vfxRoot(),{recursive:true});
  await writeFile(vfxPath(id,"video"),bytes);
  await writeFile(vfxPath(id,"poster"),thumbnail);
  await writeFile(join(vfxRoot(),`${id}.json`),JSON.stringify(clip));
  return clip;
}
