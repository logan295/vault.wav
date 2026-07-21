import archiver from "archiver";
import { Readable } from "node:stream";
import { posix, sep } from "node:path";
import { assertLocalRequest, discoverVolumes, listTracks, readIndex } from "@/lib/local-audio/library";
import { readPlaylists } from "@/lib/local-audio/playlists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeName(value: string) {
  return value.replace(/[\\/:*?"<>|\0-\x1f]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "Playlist";
}

function playlistFile(playlistName: string, paths: string[]) {
  return ["#EXTM3U", `#PLAYLIST:${playlistName}`, ...paths.map((path) => `../${path.split(sep).join("/")}`)].join("\n") + "\n";
}

export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    const [index, mounted, tracks, playlists] = await Promise.all([readIndex(), discoverVolumes(), listTracks(), readPlaylists()]);
    const selected = mounted.filter((volume) => index.selectedVolumeIds.includes(volume.id));
    if (!selected.length) return Response.json({ error: "Reconnect and select a USB drive before exporting." }, { status: 409 });

    const selectedIds = new Set(selected.map((volume) => volume.id));
    if (index.selectedVolumeIds.some((id) => !selectedIds.has(id))) return Response.json({ error: "One of the selected USB drives is disconnected. Reconnect it before exporting." }, { status: 409 });

    const archive = archiver("zip", { forceZip64: true, zlib: { level: 0 } });
    archive.on("warning", (error) => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") archive.destroy(error); });

    const trackById = new Map(tracks.map((track) => [track.id, track]));
    for (const volume of selected) {
      archive.directory(volume.rootPath, safeName(volume.name));
      const usedNames = new Set<string>();
      for (const playlist of playlists) {
        const paths = playlist.trackIds.map((id) => trackById.get(id)).filter((track) => track?.volumeId === volume.id).map((track) => track!.relativePath);
        if (!paths.length) continue;
        const base = safeName(playlist.name); let name = base; let suffix = 2;
        while (usedNames.has(name.toLowerCase())) name = `${base} ${suffix++}`;
        usedNames.add(name.toLowerCase());
        archive.append(playlistFile(playlist.name, paths), { name: posix.join(safeName(volume.name), "_VAULT PLAYLISTS", `${name}.m3u8`) });
      }
      archive.append(JSON.stringify({ exportedAt: new Date().toISOString(), source: volume.name, playlists: playlists.map(({ id, name, trackIds }) => ({ id, name, trackIds: trackIds.filter((trackId) => trackById.get(trackId)?.volumeId === volume.id) })).filter((playlist) => playlist.trackIds.length) }, null, 2), { name: posix.join(safeName(volume.name), "_VAULT PLAYLISTS", "vault-playlists.json") });
      archive.append("This export preserves the original USB folder tree and Rekordbox PIONEER data.\nThe _VAULT PLAYLISTS folder adds the playlists currently organized in vault.wav as portable M3U8 files. Track files are referenced in place and are not duplicated.\n", { name: posix.join(safeName(volume.name), "_VAULT PLAYLISTS", "README.txt") });
    }

    void archive.finalize();
    const date = new Date().toISOString().slice(0, 10);
    return new Response(Readable.toWeb(archive) as ReadableStream<Uint8Array>, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="vault-usb-backup-${date}.zip"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "USB export could not start." }, { status: 500 });
  }
}
