"use client";

import Link from "next/link";
import { TrackArtwork } from "@/components/track-artwork";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Disc3, HardDrive, Library, LoaderCircle, MapPin, Pause, Play, RefreshCw, Search, Usb, Waves } from "lucide-react";
import type { LocalTrack, LocalVolume } from "@/lib/local-audio/types";
import { audioQuality } from "@/lib/local-audio/format";
import { useLocalPlayback } from "@/components/local-playback-provider";

type VolumeResponse = { volumes: LocalVolume[]; selectedVolumeIds: string[]; error?: string };
type TracksResponse = { tracks: LocalTrack[]; scannedAt: string | null; error?: string };

async function fetchSnapshot() {
  const [volumeResponse, trackResponse] = await Promise.all([
    fetch("/api/local/volumes", { cache: "no-store" }),
    fetch("/api/local/tracks", { cache: "no-store" }),
  ]);
  const volumeBody = await volumeResponse.json() as VolumeResponse;
  const trackBody = await trackResponse.json() as TracksResponse;
  if (!volumeResponse.ok) throw new Error(volumeBody.error || "Could not detect USB drives.");
  if (!trackResponse.ok) throw new Error(trackBody.error || "Could not load the local library.");
  return { volumeBody, trackBody };
}

function duration(seconds: number | null) {
  if (!seconds) return "—";
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

export function LocalLibraryWorkspace() {
  const [volumes, setVolumes] = useState<LocalVolume[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { currentTrack, playing, play, toggle } = useLocalPlayback();

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const { volumeBody, trackBody } = await fetchSnapshot();
      setVolumes(volumeBody.volumes);
      setSelected(new Set(volumeBody.selectedVolumeIds));
      setTracks(trackBody.tracks);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Local library is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetchSnapshot().then(({ volumeBody, trackBody }) => {
      if (!active) return;
      setVolumes(volumeBody.volumes);
      setSelected(new Set(volumeBody.selectedVolumeIds));
      setTracks(trackBody.tracks);
    }).catch((error: Error) => {
      if (active) setMessage(error.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  async function scan() {
    setScanning(true);
    setMessage(selected.size ? "Reading tracks and Rekordbox data from the selected drives…" : "Clearing active drive selection…");
    try {
      const response = await fetch("/api/local/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ volumeIds: [...selected] }),
      });
      const body = await response.json() as { indexed?: number; skipped?: number; error?: string };
      if (!response.ok) throw new Error(body.error || "Scan failed.");
      await load();
      setMessage(`${body.indexed || 0} track${body.indexed === 1 ? "" : "s"} indexed${body.skipped ? ` · ${body.skipped} unreadable file${body.skipped === 1 ? "" : "s"} skipped` : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function togglePlay(track: LocalTrack) {
    if (!track.available) {
      setMessage(`Reconnect ${track.sourceName} to play this track.`);
      return;
    }
    try {
      if (currentTrack?.id === track.id) await toggle();
      else await play(track);
      setMessage(`Playing directly from ${track.sourceName} · app DSP bypassed`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The browser could not start playback. Check the USB connection and try again.");
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter((track) => `${track.title} ${track.artist || ""} ${track.album || ""} ${track.sourceName}`.toLowerCase().includes(needle));
  }, [query, tracks]);

  return (
    <main className="min-h-screen bg-background px-5 py-7 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 min-h-11 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> Back to library</Link>
          <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[.16em] text-glass"><span className="h-1.5 w-1.5 rounded-full bg-glass" /> Local only</span>
        </div>

        <header className="mt-8 border-b border-border pb-7">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-coral text-background"><Usb size={21} /></span>
            <div><p className="font-mono text-xs uppercase tracking-[.2em] text-glass">USB source manager</p><h1 className="mt-1 font-display text-4xl font-bold tracking-tight">Rekordbox USB library</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">View the tracks, cues, beatgrids, keys, and playlists already exported to your USB. .womp reads the drive without changing it.</p></div>
          </div>
        </header>

        <section className="mt-7 rounded-xl border border-border bg-white/[.02] p-5" aria-labelledby="drives-heading">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 id="drives-heading" className="text-sm font-semibold">Connected drives</h2><p className="mt-1 text-xs text-muted-foreground">Selections combine into one library.</p></div><div className="flex gap-2"><button onClick={() => void load()} disabled={loading || scanning} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 min-h-11 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Detect drives</button><button onClick={() => void scan()} disabled={loading || scanning} className="inline-flex h-9 items-center gap-2 rounded-lg bg-coral px-4 text-xs font-semibold text-background disabled:opacity-50">{scanning ? <LoaderCircle size={13} className="animate-spin" /> : <Waves size={13} />} {scanning ? "Indexing…" : "Save & scan"}</button></div></div>

          {loading ? <div className="mt-5 flex items-center gap-3 py-5 text-sm text-muted-foreground"><LoaderCircle size={16} className="animate-spin text-coral" /> Looking for mounted USB drives…</div> : volumes.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No external volumes are mounted. Connect a USB drive, wait for it to appear in Finder, then choose Detect drives.</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{volumes.map((volume) => { const checked = selected.has(volume.id); return <label key={volume.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${checked ? "border-glass/40 bg-glass/5" : "border-border hover:border-white/20"}`}><input type="checkbox" className="sr-only" checked={checked} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(volume.id)) next.delete(volume.id); else next.add(volume.id); return next; })} /><span className={`grid h-9 w-9 place-items-center rounded-lg ${checked ? "bg-glass text-background" : "bg-white/5 text-muted-foreground"}`}>{checked ? <Check size={16} /> : <HardDrive size={16} />}</span><span className="min-w-0"><strong className="block truncate text-sm">{volume.name}</strong><small className={`mt-0.5 block font-mono text-xs uppercase tracking-wide ${volume.rekordboxDetected ? "text-glass" : "text-faint"}`}>{volume.rekordboxDetected ? "Rekordbox library found" : checked ? "Selected" : "Audio files only"}</small></span></label>; })}</div>}
        </section>

        {message && <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">{message}</p>}

        <section className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[.18em] text-glass">All selected USBs</p><h2 className="mt-1 text-xl font-semibold">Indexed tracks <span className="ml-2 font-mono text-xs text-faint">{tracks.length}</span></h2></div><label className="relative block w-full sm:w-72"><span className="sr-only">Search local tracks</span><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracks, artists, drives…" className="h-10 w-full rounded-lg border border-border bg-white/[.025] pl-9 pr-3 text-xs outline-none focus:border-coral" /></label></div>

          {tracks.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-border p-10 text-center"><Disc3 className="mx-auto text-faint" /><p className="mt-3 text-sm text-muted-foreground">Select at least one drive and scan it to build your local library.</p></div> : <div className="mt-5 divide-y divide-border border-y border-border">{filtered.map((track) => { const isPlaying = currentTrack?.id === track.id && playing; return <div key={track.id} className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-3.5 ${track.available ? "" : "opacity-45"}`}><button onClick={() => void togglePlay(track)} disabled={!track.available} className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background disabled:cursor-not-allowed" aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}>{isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button><TrackArtwork track={track} className="size-10" /><div className="min-w-0"><strong className="block truncate text-base">{track.title}</strong><span className="mt-0.5 block truncate text-xs text-muted-foreground">{track.artist || track.album || track.relativePath}</span>{track.rekordbox && <span className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wide text-glass"><span className="inline-flex items-center gap-1"><Waves size={10} /> {track.rekordbox.bpm ?? "—"} BPM</span><span className="inline-flex items-center gap-1"><MapPin size={10} /> {track.rekordbox.cues.length} cues</span><span className="inline-flex items-center gap-1"><Library size={10} /> {track.rekordbox.playlistNames.length} playlists</span></span>}</div><div className="hidden items-center gap-8 text-right sm:flex"><div><span className="block font-mono text-xs uppercase tracking-wide text-faint">Source</span><span className={`mt-1 block text-xs ${track.available ? "text-glass" : "text-coral"}`}>{track.available ? track.sourceName : `${track.sourceName} ejected`}</span></div><div className="w-52"><span className="block font-mono text-[10px] text-muted-foreground">{audioQuality(track)}</span><span className="mt-1 block font-mono text-xs text-faint">{duration(track.durationSecs)}</span></div></div></div>; })}</div>}
          {tracks.length > 0 && filtered.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">No indexed audio files match “{query}”.</p>}
        </section>
      </div>
    </main>
  );
}
