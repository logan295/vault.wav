import type { LocalPlaylist, LocalTrack } from "./types";
export type ExportTrack = LocalTrack & { location: string };
function xml(value: unknown) { return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"); }
export function buildRekordboxXml(tracks: ExportTrack[], playlists: LocalPlaylist[]) {
  const ordered = [...tracks].sort((a,b) => a.id.localeCompare(b.id));
  const ids = new Map(ordered.map((track,index) => [track.id,index+1]));
  const names = new Set<string>();
  const nodes = playlists.map(playlist => {
    let name = playlist.name; let suffix = 2;
    while (names.has(name)) name = `${playlist.name} (${suffix++})`;
    names.add(name);
    const keys = playlist.trackIds.flatMap(id => ids.has(id) ? [ids.get(id)!] : []);
    return `      <NODE Type="1" Name="${xml(name)}" Entries="${keys.length}" KeyType="0">\n${keys.map(key => `        <TRACK Key="${key}"/>`).join("\n")}\n      </NODE>`;
  });
  const collection = ordered.map(track => {
    const attributes: Record<string, unknown> = { TrackID: ids.get(track.id), Name:track.title, Artist:track.artist, Album:track.album, Kind:track.codec, Size:track.fileSize, TotalTime:Math.floor(track.durationSecs || 0), AverageBpm:track.bpm || undefined, Tonality:track.musicalKey, SampleRate:track.sampleRate, BitRate:track.bitrateKbps, Location:track.location };
    const attrs = Object.entries(attributes).filter(([,value]) => value !== undefined && value !== null).map(([name,value]) => `${name}="${xml(value)}"`).join(" ");
    const sourceCues = [...(track.rekordbox?.cues || []).filter(cue=>!(track.performance?.hotCues&&cue.kind==="hot")),...(track.performance?.hotCues||[]).flatMap((time,slot)=>time===null?[]:[{kind:"hot" as const,slot:slot+1,timeMs:time*1000,loopEndMs:null,label:String.fromCharCode(65+slot),colorHex:null}]),...(track.performance?.cue!==undefined?[{kind:"memory" as const,slot:null,timeMs:track.performance.cue*1000,loopEndMs:null,label:".womp Cue",colorHex:null}]:[])];
    const cues = sourceCues.filter(cue => Number.isFinite(cue.timeMs) && cue.timeMs >= 0).map(cue => `      <POSITION_MARK Name="${xml(cue.label || "")}" Type="${cue.loopEndMs !== null && cue.loopEndMs > cue.timeMs ? 4 : 0}" Start="${cue.timeMs/1000}"${cue.loopEndMs !== null && cue.loopEndMs > cue.timeMs ? ` End="${cue.loopEndMs/1000}"` : ""} Num="${cue.kind === "hot" && cue.slot !== null ? Math.max(0,cue.slot-1) : -1}"/>`);
    return `    <TRACK ${attrs}>\n${cues.join("\n")}\n    </TRACK>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<DJ_PLAYLISTS Version="1.0.0">\n  <PRODUCT Name=".womp" Version="0.1.0" Company=".womp"/>\n  <COLLECTION Entries="${ordered.length}">\n${collection.join("\n")}\n  </COLLECTION>\n  <PLAYLISTS>\n    <NODE Type="0" Name="ROOT" Count="${nodes.length}">\n${nodes.join("\n")}\n    </NODE>\n  </PLAYLISTS>\n</DJ_PLAYLISTS>\n`;
}
