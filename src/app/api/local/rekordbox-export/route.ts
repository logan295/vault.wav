import { realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { assertLocalRequest, discoverVolumes, listTracks } from "@/lib/local-audio/library";
import { readPlaylists } from "@/lib/local-audio/playlists";
import { buildRekordboxXml, type ExportTrack } from "@/lib/local-audio/rekordbox-export";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    const [tracks, allPlaylists, volumes] = await Promise.all([listTracks(),readPlaylists(),discoverVolumes()]);
    const playlistId = new URL(request.url).searchParams.get("playlist");
    const playlists = playlistId ? allPlaylists.filter(p => p.id === playlistId) : allPlaylists;
    if (playlistId && !playlists.length) return Response.json({error:"Playlist not found."},{status:404});
    const scope = playlistId ? new Set(playlists[0].trackIds) : null;
    const prepared: ExportTrack[] = [];
    for (const track of tracks) {
      if (!track.available || (scope && !scope.has(track.id))) continue;
      const volume = volumes.find(v => v.id === track.volumeId); if (!volume) continue;
      const path = await realpath(resolve(volume.rootPath,track.relativePath)).catch(() => null);
      if (!path || !path.startsWith(volume.rootPath+sep)) continue;
      prepared.push({...track,location:pathToFileURL(path).href.replace(/^file:\/\//,"file://localhost")});
    }
    return new Response(buildRekordboxXml(prepared,playlists),{headers:{"content-type":"application/xml; charset=utf-8","content-disposition":"attachment; filename=\"womp-rekordbox.xml\"","cache-control":"no-store","x-womp-exported-tracks":String(prepared.length),"x-womp-export-mode":"xml-bridge-not-direct-device-writeback"}});
  } catch(error) { return Response.json({error:error instanceof Error ? error.message : "Export failed."},{status:500}); }
}
