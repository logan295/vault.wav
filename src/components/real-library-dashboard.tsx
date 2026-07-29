"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, BookOpen, Check, ChevronRight, Disc3, Download, Home, Library, ListPlus, Pause, Play, Plus, RefreshCw, Search, Trash2, Usb, Waves, X, Zap } from "lucide-react";
import { useLocalPlayback } from "@/components/local-playback-provider";
import { RealWaveform } from "@/components/real-waveform";
import { LaserShowRenderer } from "@/components/laser-show-renderer";
import type { LocalPlaylist, LocalTrack } from "@/lib/local-audio/types";
import { audioBitrateKbps, audioQuality } from "@/lib/local-audio/format";

function clock(seconds: number | null) { if (!seconds) return "—"; const value = Math.round(seconds); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`; }

type SortKey = "title" | "album" | "bpm" | "musicalKey" | "quality" | "source" | "duration";
type SortDirection = "asc" | "desc";
type Surface = "home" | "tracks" | "analysis" | "laser";

function compareNullable(left: string | number | null | undefined, right: string | number | null | undefined, direction: SortDirection) {
  const leftMissing = left === null || left === undefined || left === "";
  const rightMissing = right === null || right === undefined || right === "";
  if (leftMissing || rightMissing) return leftMissing === rightMissing ? 0 : leftMissing ? 1 : -1;
  const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

function SortHeader({ label, column, active, direction, onSort }: { label: string; column: SortKey; active: boolean; direction: SortDirection; onSort: (column: SortKey) => void }) {
  const Icon = active ? direction === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
  return <button type="button" onClick={() => onSort(column)} aria-label={`Sort by ${label}${active ? `, currently ${direction === "asc" ? "ascending" : "descending"}` : ""}`} className={`group inline-flex items-center gap-1 text-left hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral ${active ? "text-foreground" : ""}`}><span>{label}</span><Icon size={11} aria-hidden="true" className={active ? "text-coral" : "opacity-35 group-hover:opacity-70"} /></button>;
}

function TrackTransport({ track, active, playing, reducedMotion, onPlay }: { track: LocalTrack; active: boolean; playing: boolean; reducedMotion: boolean | null; onPlay: () => void }) {
  const isPlaying = active && playing;
  return <motion.button
    type="button"
    whileTap={reducedMotion ? undefined : { scale: .94 }}
    onClick={onPlay}
    disabled={!track.available}
    aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
    className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-[#101112] disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-coral/70 bg-coral text-background shadow-[0_8px_24px_rgba(255,92,77,.22),inset_0_1px_0_rgba(255,255,255,.25)]" : "border-white/10 bg-white/[.035] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] hover:border-white/25 hover:bg-white/[.09] hover:text-white"}`}
  >
    <span className={`absolute inset-x-1.5 bottom-1 h-px transition-opacity ${active ? "bg-background/25 opacity-100" : "bg-white/20 opacity-0 group-hover:opacity-100"}`} />
    {isPlaying ? <Pause size={15} fill="currentColor" strokeWidth={2.4} /> : <Play size={15} fill="currentColor" strokeWidth={2.4} className="translate-x-px" />}
  </motion.button>;
}

const COVER_PALETTES = [["#f05f48", "#642e49"], ["#32b7a2", "#142f3a"], ["#a789dc", "#3f275c"], ["#e7b458", "#633b22"], ["#3b78d8", "#172746"], ["#db6e9e", "#4c2344"], ["#58a4a8", "#213336"], ["#c9875c", "#402c2a"]] as const;
function paletteFor(track: LocalTrack) { let hash = 0; for (const char of track.id) hash = (hash * 31 + char.charCodeAt(0)) | 0; return COVER_PALETTES[Math.abs(hash) % COVER_PALETTES.length]; }
function TrackArtwork({ track, className = "" }: { track: LocalTrack; className?: string }) { const [first, second] = paletteFor(track); const mark = (track.album || track.title).replace(/^\d+[.\s-]*/, "").slice(0, 2).toUpperCase(); return <span className={`relative isolate block overflow-hidden bg-[#202526] ${className}`} style={{ background: `linear-gradient(145deg,${first},${second})` }} aria-hidden><span className="absolute -right-[20%] -top-[18%] h-[78%] w-[78%] rounded-full border border-white/20 shadow-[0_0_0_18px_rgba(255,255,255,.045),0_0_0_38px_rgba(255,255,255,.025)]" /><span className="absolute bottom-3 left-3 text-2xl font-black tracking-[-.08em] text-white/90 mix-blend-overlay">{mark}</span><span className="absolute inset-x-3 bottom-2 h-px bg-white/35" /></span>; }

function MusicShelf({ title, tracks, activeId, playing, onPlay }: { title: string; tracks: LocalTrack[]; activeId?: string; playing: boolean; onPlay: (track: LocalTrack) => void }) {
  const reducedMotion = useReducedMotion();
  return <section className="mt-9"><div className="mb-3 flex items-end justify-between"><h2 className="text-[21px] font-bold tracking-[-.025em]">{title}</h2><button className="inline-flex items-center gap-1 text-xs font-semibold text-white/45 hover:text-white">Show all <ChevronRight size={13} /></button></div><div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{tracks.slice(0, 8).map((track) => { const active = activeId === track.id; return <motion.article key={track.id} whileHover={reducedMotion ? undefined : { y: -3 }} transition={{ duration: .18, ease: [.23, 1, .32, 1] }} className="group w-[clamp(140px,16vw,188px)] shrink-0 rounded-lg p-2.5 transition-colors hover:bg-white/[.055]"><div className="relative"><TrackArtwork track={track} className="aspect-square w-full rounded-md shadow-[0_16px_35px_rgba(0,0,0,.35)]" /><motion.button whileHover={reducedMotion ? undefined : { scale: 1.04 }} whileTap={reducedMotion ? undefined : { scale: .94 }} onClick={() => onPlay(track)} className={`absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full bg-coral text-[#080b0c] shadow-[0_10px_24px_rgba(0,0,0,.45)] transition-all ${active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"}`} aria-label={active && playing ? `Pause ${track.title}` : `Play ${track.title}`}>{active && playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="translate-x-px" />}</motion.button></div><button onClick={() => onPlay(track)} className="mt-3 block w-full text-left"><strong className="block truncate text-[14px] font-semibold text-white">{track.title}</strong><span className="mt-1 block line-clamp-2 min-h-8 text-[12px] leading-4 text-white/45">{track.artist || track.album || track.sourceName}</span></button></motion.article>; })}</div></section>;
}

async function fetchLibrarySnapshot() {
  const [tracksResponse, playlistsResponse] = await Promise.all([fetch("/api/local/tracks", { cache: "no-store" }), fetch("/api/local/playlists", { cache: "no-store" })]);
  const tracksBody = await tracksResponse.json(); const playlistsBody = await playlistsResponse.json();
  if (!tracksResponse.ok) throw new Error(tracksBody.error); if (!playlistsResponse.ok) throw new Error(playlistsBody.error);
  return { tracks: tracksBody.tracks as LocalTrack[], playlists: playlistsBody.playlists as LocalPlaylist[] };
}

export function RealLibraryDashboard() {
  const player = useLocalPlayback();
  const reducedMotion = useReducedMotion();
  const [tracks, setTracks] = useState<LocalTrack[]>([]); const [playlists, setPlaylists] = useState<LocalPlaylist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null); const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set()); const [newName, setNewName] = useState(""); const [creating, setCreating] = useState(false);
  const [targetPlaylist, setTargetPlaylist] = useState(""); const [message, setMessage] = useState("Loading your USB library…"); const [draggedId, setDraggedId] = useState<string | null>(null); const [rescanning, setRescanning] = useState(false);
  const [analysisByTrack, setAnalysisByTrack] = useState<Record<string, { bpm: number | null; musicalKey: string | null }>>({});
  const [sort, setSort] = useState<{ key: SortKey | null; direction: SortDirection }>({ key: null, direction: "asc" });
  const [surface, setSurface] = useState<Surface>("home");
  const scrollPositionsRef = useRef<Record<Surface, number>>({ home: 0, tracks: 0, analysis: 0, laser: 0 });

  const changeSurface = useCallback((next: Surface) => {
    if (next === surface) return;
    scrollPositionsRef.current[surface] = window.scrollY;
    setSurface(next);
  }, [surface]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo(0, scrollPositionsRef.current[surface]));
    return () => cancelAnimationFrame(frame);
  }, [surface]);

  async function refresh() {
    const snapshot = await fetchLibrarySnapshot(); setTracks(snapshot.tracks); setPlaylists(snapshot.playlists); setMessage("");
  }
  async function rescanLibrary() {
    if (rescanning) return; setRescanning(true); setMessage("Scanning the selected USB drives for new tracks…");
    try {
      const volumesResponse = await fetch("/api/local/volumes", { cache: "no-store" }); const volumesBody = await volumesResponse.json() as { selectedVolumeIds?: string[]; error?: string };
      if (!volumesResponse.ok) throw new Error(volumesBody.error || "Could not detect the selected USB drives.");
      const response = await fetch("/api/local/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ volumeIds: volumesBody.selectedVolumeIds || [] }) }); const body = await response.json() as { indexed?: number; skipped?: number; error?: string };
      if (!response.ok) throw new Error(body.error || "The USB scan failed.");
      const snapshot = await fetchLibrarySnapshot(); setTracks(snapshot.tracks); setPlaylists(snapshot.playlists); setMessage(`${body.indexed || snapshot.tracks.length} tracks indexed${body.skipped ? ` · ${body.skipped} unreadable files skipped` : ""}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The USB scan failed."); }
    finally { setRescanning(false); }
  }
  useEffect(() => { let active = true; void fetchLibrarySnapshot().then((snapshot) => { if (active) { setTracks(snapshot.tracks); setPlaylists(snapshot.playlists); setMessage(""); } }).catch((error: Error) => { if (active) setMessage(error.message); }); return () => { active = false; }; }, []);

  const activePlaylist = playlists.find((playlist) => playlist.id === activePlaylistId) || null;
  const displayed = useMemo(() => {
    const allowed = activePlaylist ? new Set(activePlaylist.trackIds) : null; const needle = query.trim().toLowerCase();
    const filtered = tracks.filter((track) => (!allowed || allowed.has(track.id)) && (!needle || `${track.title} ${track.artist || ""} ${track.album || ""} ${track.sourceName}`.toLowerCase().includes(needle)));
    if (!sort.key) return filtered.sort((a, b) => activePlaylist ? activePlaylist.trackIds.indexOf(a.id) - activePlaylist.trackIds.indexOf(b.id) : a.title.localeCompare(b.title));
    const value = (track: LocalTrack) => {
      const analyzed = analysisByTrack[track.id];
      switch (sort.key) {
        case "title": return track.title;
        case "album": return track.album;
        case "bpm": return analyzed?.bpm ?? track.bpm;
        case "musicalKey": return analyzed?.musicalKey ?? track.musicalKey;
        case "quality": return audioBitrateKbps(track) ?? 0;
        case "source": return track.sourceName;
        case "duration": return track.durationSecs;
      }
    };
    return filtered.sort((a, b) => compareNullable(value(a), value(b), sort.direction) || a.title.localeCompare(b.title));
  }, [tracks, activePlaylist, query, sort, analysisByTrack]);

  function changeSort(key: SortKey) {
    setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  }

  async function createPlaylist(event: React.FormEvent) {
    event.preventDefault(); const response = await fetch("/api/local/playlists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: newName }) }); const body = await response.json();
    if (!response.ok) return setMessage(body.error); setNewName(""); setCreating(false); await refresh(); setActivePlaylistId(body.playlist.id);
  }
  async function patchPlaylist(id: string, changes: Partial<Pick<LocalPlaylist, "name" | "trackIds">>) {
    const response = await fetch(`/api/local/playlists/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(changes) }); const body = await response.json();
    if (!response.ok) throw new Error(body.error); setPlaylists((items) => items.map((item) => item.id === id ? body.playlist : item));
  }
  async function addSelected() {
    const playlist = playlists.find((item) => item.id === targetPlaylist); if (!playlist || !selected.size) return;
    try { await patchPlaylist(playlist.id, { trackIds: [...playlist.trackIds, ...[...selected].filter((id) => !playlist.trackIds.includes(id))] }); setSelected(new Set()); setMessage(`Added to ${playlist.name}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not update playlist."); }
  }
  function queueSelected() {
    const selectedTracks = tracks.filter((track) => selected.has(track.id));
    player.enqueueMany(selectedTracks); setSelected(new Set()); setMessage(`${selectedTracks.length} track${selectedTracks.length === 1 ? "" : "s"} added to the queue.`);
  }
  async function removeTrack(id: string) { if (activePlaylist) await patchPlaylist(activePlaylist.id, { trackIds: activePlaylist.trackIds.filter((trackId) => trackId !== id) }); }
  async function reorder(targetId: string) {
    if (!activePlaylist || !draggedId || draggedId === targetId) return; const ids = [...activePlaylist.trackIds]; const from = ids.indexOf(draggedId); const to = ids.indexOf(targetId); if (from < 0 || to < 0) return;
    const [moved] = ids.splice(from, 1); ids.splice(to, 0, moved); setDraggedId(null); await patchPlaylist(activePlaylist.id, { trackIds: ids });
  }
  async function deleteActive() { if (!activePlaylist || !window.confirm(`Delete “${activePlaylist.name}”? The WAV files will not be touched.`)) return; await fetch(`/api/local/playlists/${activePlaylist.id}`, { method: "DELETE" }); setActivePlaylistId(null); await refresh(); }
  async function renameActive() { if (!activePlaylist) return; const name = window.prompt("Playlist name", activePlaylist.name)?.trim(); if (name) await patchPlaylist(activePlaylist.id, { name }); }

  const progress = player.duration ? player.currentTime / player.duration : 0;
  const handleAnalysis = useCallback((analysis: { bpm: number | null; musicalKey: string | null }) => { if (player.currentTrack) { const trackId = player.currentTrack.id; setAnalysisByTrack((current) => ({ ...current, [trackId]: analysis })); setTracks((current) => current.map((track) => track.id === trackId ? { ...track, ...analysis } : track)); } }, [player.currentTrack]);
  const currentAnalysis = player.currentTrack ? analysisByTrack[player.currentTrack.id] : null;
  const recentTracks = useMemo(() => player.currentTrack ? [player.currentTrack, ...tracks.filter((track) => track.id !== player.currentTrack!.id)] : tracks, [tracks, player.currentTrack]);
  const highResolutionTracks = useMemo(() => [...tracks].sort((a, b) => ((b.sampleRate || 0) + (b.bitDepth || 0) * 100000) - ((a.sampleRate || 0) + (a.bitDepth || 0) * 100000)), [tracks]);
  const allDisplayedSelected = displayed.length > 0 && displayed.every((track) => selected.has(track.id));
  function playTrack(track: LocalTrack) { return player.currentTrack?.id === track.id ? player.toggle() : player.playSequence(track, displayed); }
  return <div className="grid min-h-screen grid-cols-[230px_minmax(0,1fr)] bg-black pb-24 text-foreground max-[760px]:block">
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[230px] flex-col bg-black max-[760px]:hidden">
      <div className="flex h-16 items-center gap-2.5 px-5"><span className="grid h-7 w-7 place-items-center rounded-full bg-coral text-background"><Disc3 size={16} /></span><b className="font-display text-sm">vault<span className="text-coral">.wav</span></b></div>
      <nav className="px-3"><button onClick={() => { changeSurface("home"); setActivePlaylistId(null); }} className={`sidebar-link w-full ${surface === "home" ? "active" : ""}`}><Home size={16} /><span>Home</span></button><button onClick={() => { changeSurface("tracks"); setActivePlaylistId(null); }} className={`sidebar-link w-full ${surface === "tracks" && !activePlaylist ? "active" : ""}`}><Library size={16} /><span>Your Library</span><span className="ml-auto text-[11px] text-faint">{tracks.length}</span></button><button onClick={() => changeSurface("analysis")} className={`sidebar-link w-full ${surface === "analysis" ? "active" : ""}`}><Waves size={16} /><span>Audio analysis</span></button><button onClick={() => changeSurface("laser")} className={`sidebar-link w-full ${surface === "laser" ? "active" : ""}`}><Zap size={16} /><span>Laser show</span></button><div className="my-3 h-px bg-white/[.06]" /><Link href="/local-library" className="sidebar-link"><Usb size={16} /><span>Manage USBs</span></Link><Link href="/usb-guide" className="sidebar-link"><BookOpen size={16} /><span>USB guide</span></Link></nav>
      <div className="mt-6 flex items-center justify-between px-5"><span className="sidebar-label !m-0 !p-0">Playlists</span><button onClick={() => setCreating(true)} aria-label="Create playlist"><Plus size={15} /></button></div>
      {creating && <form onSubmit={createPlaylist} className="mx-3 mt-3 rounded-lg border border-border p-2"><input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Playlist name" className="h-8 w-full bg-transparent px-2 text-xs outline-none" /><div className="mt-1 flex justify-end gap-2"><button type="button" onClick={() => setCreating(false)}><X size={13} /></button><button className="rounded bg-coral px-2 py-1 text-[10px] font-semibold text-background">Create</button></div></form>}
      <div className="mt-2 px-3">{playlists.map((playlist) => <button key={playlist.id} onClick={() => { setActivePlaylistId(playlist.id); changeSurface("tracks"); }} className={`playlist-link ${activePlaylistId === playlist.id ? "active" : ""}`}><span className="h-2 w-2 rounded-sm bg-coral" /><span className="min-w-0 flex-1 truncate text-left">{playlist.name}</span><span className="text-[11px] text-faint">{playlist.trackIds.length}</span></button>)}</div>
    </aside>
    <main className="col-start-2 m-2 min-w-0 overflow-hidden rounded-xl bg-[#101112] px-4 pb-10 sm:px-7 xl:px-9">
      <header className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center gap-2 border-b border-white/[.055] bg-[#101112]/90 px-4 py-3 backdrop-blur-2xl sm:-mx-7 sm:px-7 xl:-mx-9 xl:px-9"><button onClick={() => changeSurface("home")} className="grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white/65 transition-colors hover:bg-black hover:text-white" aria-label="Go home"><Home size={17} /></button><label className="relative min-w-[220px] max-w-[430px] flex-1"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/55" /><input value={query} onFocus={() => changeSurface("tracks")} onChange={(event) => setQuery(event.target.value)} placeholder="What do you want to play?" className="h-11 w-full rounded-full border border-transparent bg-[#252829] pl-11 pr-4 text-[13px] outline-none transition hover:bg-[#2c3031] focus:border-white/30 focus:bg-[#2c3031]" /></label><nav className="ml-auto flex items-center gap-1"><button onClick={() => changeSurface("home")} className={`rounded-full px-3 py-2 text-xs font-semibold transition ${surface === "home" ? "bg-white text-black" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>All</button><button onClick={() => changeSurface("tracks")} className={`rounded-full px-3 py-2 text-xs font-semibold transition ${surface === "tracks" ? "bg-white text-black" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>Music</button><button onClick={() => changeSurface("analysis")} className={`rounded-full px-3 py-2 text-xs font-semibold transition ${surface === "analysis" ? "bg-white text-black" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>Analysis</button><button onClick={() => changeSurface("laser")} className={`rounded-full px-3 py-2 text-xs font-semibold transition ${surface === "laser" ? "bg-white text-black" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>Laser</button></nav><a href="/api/local/export" download className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-3 text-xs font-semibold text-white/75 transition hover:border-white/30 hover:bg-white/5 hover:text-white" title="Download a complete USB backup with Rekordbox data and vault.wav playlists"><Download size={13} /> <span className="hidden lg:inline">Export USB ZIP</span></a><button type="button" onClick={() => void rescanLibrary()} disabled={rescanning} className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-xs font-bold text-black transition hover:scale-[1.02] hover:bg-white/90 disabled:cursor-wait disabled:opacity-65"><RefreshCw size={13} className={rescanning ? "animate-spin" : ""} /> <span className="hidden sm:inline">{rescanning ? "Scanning…" : "Rescan"}</span></button></header>

      {surface === "home" && <motion.div initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, ease: [.23, 1, .32, 1] }} className="pb-8 pt-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-white/45">Your lossless collection</p><h1 className="mt-1 text-[clamp(30px,4vw,48px)] font-bold tracking-[-.045em]">Good evening</h1></div><p className="text-xs text-white/35">{tracks.length} tracks · {new Set(tracks.map((track) => track.sourceName)).size} sources</p></div>{tracks.length ? <><div className="mt-7 grid grid-cols-2 gap-2 lg:grid-cols-3">{recentTracks.slice(0, 6).map((track) => <motion.button key={track.id} whileHover={reducedMotion ? undefined : { y: -2 }} whileTap={reducedMotion ? undefined : { scale: .99 }} onClick={() => void playTrack(track)} className="group flex min-w-0 items-center overflow-hidden rounded-md bg-white/[.075] text-left transition-colors hover:bg-white/[.13]"><TrackArtwork track={track} className="h-16 w-16 shrink-0" /><strong className="min-w-0 flex-1 truncate px-3 text-[13px] font-semibold sm:text-sm">{track.title}</strong><span className="mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100">{player.currentTrack?.id === track.id && player.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</span></motion.button>)}</div><MusicShelf title="Recently played" tracks={recentTracks} activeId={player.currentTrack?.id} playing={player.playing} onPlay={(track) => void playTrack(track)} /><MusicShelf title="Made for your speakers" tracks={highResolutionTracks} activeId={player.currentTrack?.id} playing={player.playing} onPlay={(track) => void playTrack(track)} /><MusicShelf title="From your USB library" tracks={[...tracks].reverse()} activeId={player.currentTrack?.id} playing={player.playing} onPlay={(track) => void playTrack(track)} /></> : <div className="mt-8 grid min-h-[360px] place-items-center rounded-xl bg-white/[.025] p-8 text-center"><div><Disc3 className="mx-auto text-coral" size={38} /><h2 className="mt-5 text-2xl font-bold">Bring your music home</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">Connect a USB drive and index your WAV files to fill this space with your own music.</p><Link href="/local-library" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-black">Manage USBs</Link></div></div>}</motion.div>}

      {surface === "analysis" && <section className="mt-9"><p className="text-xs font-medium text-glass">{player.currentTrack ? `Playing from ${player.currentTrack.sourceName}` : "Local lossless library"}</p><div className="mt-2.5 flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><h1 className="max-w-5xl truncate text-[clamp(28px,2.5vw,42px)] font-bold leading-[1.04] tracking-[-.03em]">{player.currentTrack?.title || "Audio analysis"}</h1><p className="mt-3 truncate text-[15px] text-muted-foreground">{player.currentTrack ? player.currentTrack.artist || player.currentTrack.relativePath : "A detailed, still view of every track you play"}</p>{player.currentTrack && <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-glass/20 bg-glass/[.06] px-3 py-1.5 text-[11px] text-glass">{currentAnalysis?.bpm || player.currentTrack.bpm || "Analyzing"} BPM</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-foreground">{currentAnalysis?.musicalKey || player.currentTrack.musicalKey || "Analyzing key"}</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-muted-foreground">{audioQuality(player.currentTrack)}</span></div>}</div>{player.currentTrack && <button onClick={() => void player.toggle()} className="grid h-12 w-12 place-items-center rounded-full bg-coral text-background shadow-[0_10px_30px_rgba(255,92,77,.2)]">{player.playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>}</div>
        <div className="mt-7">{player.currentTrack ? <RealWaveform trackId={player.currentTrack.id} progress={progress} duration={player.duration} playing={player.playing} onSeek={(value) => player.seek(value * player.duration)} onAnalysis={handleAnalysis} /> : <div className="grid h-[270px] place-items-center rounded-xl border border-dashed border-border text-[15px] text-muted-foreground">Play a USB track to analyze its waveform, BPM and musical key.</div>}</div>
      </section>}

      {surface === "laser" && <section className="mt-7 pb-8"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-glass">Audio-reactive stage</p><h1 className="mt-1 text-[clamp(28px,3vw,44px)] font-bold tracking-[-.04em]">Laser show</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">A full-scale 3D lighting rig mapped to the current track’s beat, energy, and frequency bands.</p></div>{player.currentTrack && <div className="text-right"><p className="max-w-md truncate text-sm font-semibold">{player.currentTrack.title}</p><p className="mt-1 font-mono text-[9px] text-white/40">{currentAnalysis?.bpm || player.currentTrack.bpm || 120} BPM · LIVE PLAYHEAD SYNC</p></div>}</div>{player.currentTrack ? <LaserShowRenderer trackId={player.currentTrack.id} progress={progress} duration={player.duration} playing={player.playing} bpm={currentAnalysis?.bpm || player.currentTrack.bpm || null} onToggle={() => void player.toggle()} /> : <div className="grid min-h-[520px] place-items-center rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center"><div><Zap size={34} className="mx-auto text-glass" /><h2 className="mt-4 text-xl font-semibold">Choose a track to cue the rig</h2><p className="mt-2 text-sm text-white/40">Play any USB track, then return here to render its laser show.</p><button onClick={() => changeSurface("tracks")} className="mt-5 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black">Browse tracks</button></div></div>}</section>}

      {surface === "tracks" && <section className="mt-9 pb-8">
        <div className="flex flex-wrap items-center gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-glass">{activePlaylist ? "Playlist" : "All selected USBs"}</p><h2 className="mt-1 text-xl font-semibold">{activePlaylist?.name || "Tracks"} <span className="ml-2 font-mono text-xs text-faint">{displayed.length}</span></h2></div>{activePlaylist && <div className="ml-auto flex gap-2"><button onClick={() => void renameActive()} className="rounded-lg border border-border px-3 py-2 text-xs">Rename</button><button onClick={() => void deleteActive()} className="rounded-lg border border-border px-3 py-2 text-xs text-coral"><Trash2 size={13} /></button></div>}</div>
        <AnimatePresence initial={false}>{selected.size > 0 && <motion.div initial={reducedMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-glass/25 bg-[linear-gradient(90deg,rgba(116,225,214,.075),rgba(255,255,255,.018))] p-2.5 shadow-[0_12px_35px_rgba(0,0,0,.16)]"><span className="mr-1 inline-flex h-8 items-center gap-2 rounded-lg bg-glass/10 px-3 text-xs font-medium text-glass"><Check size={13} />{selected.size} selected</span><motion.button whileTap={reducedMotion ? undefined : { scale: 0.97 }} onClick={queueSelected} className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium hover:border-white/20 hover:bg-white/5"><ListPlus size={13} /> Add to queue</motion.button><span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" /><label className="sr-only" htmlFor="playlist-target">Playlist</label><select id="playlist-target" value={targetPlaylist} onChange={(event) => setTargetPlaylist(event.target.value)} className="h-8 min-w-40 rounded-lg border border-border bg-[#0b1011] px-2.5 text-xs outline-none focus:border-coral"><option value="">Choose playlist…</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}</select><motion.button whileTap={reducedMotion || !targetPlaylist ? undefined : { scale: 0.97 }} disabled={!targetPlaylist} onClick={() => void addSelected()} className="h-8 rounded-lg bg-coral px-3 text-xs font-semibold text-background shadow-[0_6px_18px_rgba(255,92,77,.16)] disabled:cursor-not-allowed disabled:opacity-35">Add to playlist</motion.button><button onClick={() => setSelected(new Set())} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-foreground" aria-label="Clear track selection"><X size={14} /></button></motion.div>}</AnimatePresence>
        {message && <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">{message}</p>}
        <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-white/[.008] shadow-[0_18px_60px_rgba(0,0,0,.18)]">
          <div className="sticky top-0 z-10 grid min-w-[1080px] grid-cols-[36px_minmax(320px,1fr)_minmax(120px,.55fr)_62px_80px_220px_100px_55px_32px] gap-4 border-b border-border bg-[#0a0f10]/95 px-5 py-3.5 font-mono text-[9px] uppercase tracking-[.13em] text-faint backdrop-blur-xl"><input type="checkbox" checked={allDisplayedSelected} onChange={() => setSelected((current) => { const next = new Set(current); if (allDisplayedSelected) displayed.forEach((track) => next.delete(track.id)); else displayed.forEach((track) => next.add(track.id)); return next; })} aria-label={allDisplayedSelected ? "Deselect all visible tracks" : "Select all visible tracks"} className="h-3.5 w-3.5 accent-[var(--coral)]" /><SortHeader label="Title" column="title" active={sort.key === "title"} direction={sort.direction} onSort={changeSort} /><SortHeader label="Album" column="album" active={sort.key === "album"} direction={sort.direction} onSort={changeSort} /><SortHeader label="BPM" column="bpm" active={sort.key === "bpm"} direction={sort.direction} onSort={changeSort} /><SortHeader label="Key" column="musicalKey" active={sort.key === "musicalKey"} direction={sort.direction} onSort={changeSort} /><SortHeader label="Quality" column="quality" active={sort.key === "quality"} direction={sort.direction} onSort={changeSort} /><SortHeader label="Source" column="source" active={sort.key === "source"} direction={sort.direction} onSort={changeSort} /><SortHeader label="Time" column="duration" active={sort.key === "duration"} direction={sort.direction} onSort={changeSort} /><span /></div>
          {displayed.map((track) => {
            const active = player.currentTrack?.id === track.id; const analyzed = analysisByTrack[track.id]; const sortablePlaylist = !!activePlaylist && !sort.key; const isSelected = selected.has(track.id);
            return <div key={track.id} draggable={sortablePlaylist} onDragStart={() => setDraggedId(track.id)} onDragOver={(event) => { if (sortablePlaylist) event.preventDefault(); }} onDrop={() => void reorder(track.id)} onDoubleClick={() => void playTrack(track)} className={`group relative grid min-h-[72px] min-w-[1080px] grid-cols-[36px_minmax(320px,1fr)_minmax(120px,.55fr)_62px_80px_220px_100px_55px_32px] items-center gap-4 border-l-2 border-t border-t-white/[.045] px-[18px] py-2.5 text-[13px] transition-[background-color,border-color,box-shadow] duration-200 first:border-t-0 hover:bg-white/[.045] ${active ? "border-l-coral bg-[linear-gradient(90deg,rgba(255,92,77,.12),rgba(255,92,77,.035)_38%,rgba(255,255,255,.012))] shadow-[inset_0_1px_0_rgba(255,255,255,.025)]" : isSelected ? "border-l-glass bg-glass/[.045]" : "border-l-transparent"}`}>
              <input type="checkbox" checked={isSelected} aria-label={`Select ${track.title}`} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(track.id)) next.delete(track.id); else next.add(track.id); return next; })} className="h-3.5 w-3.5 accent-[var(--coral)] opacity-55 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" />
              <div className="flex min-w-0 items-center gap-3">
                <TrackTransport track={track} active={active} playing={player.playing} reducedMotion={reducedMotion} onPlay={() => void playTrack(track)} />
                <button onClick={() => void playTrack(track)} className="min-w-0 flex-1 text-left focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-[#101112]">
                  <span className="flex min-w-0 items-center gap-2"><strong className={`truncate text-[14px] font-semibold tracking-[-.01em] ${active ? "text-white" : "text-foreground"}`}>{track.title}</strong>{active && <span className="shrink-0 rounded-full border border-coral/25 bg-coral/10 px-1.5 py-0.5 font-mono text-[7px] font-semibold uppercase tracking-[.12em] text-coral">{player.playing ? "Now playing" : "Paused"}</span>}</span>
                  <span className={`mt-1 block truncate text-[11px] ${active ? "text-white/45" : "text-faint"}`}>{track.artist || track.relativePath}</span>
                </button>
              </div>
              <span className="truncate text-white/45 transition-colors group-hover:text-white/60">{track.album || "—"}</span><span className="font-mono text-[10px] tabular-nums text-white/75">{analyzed?.bpm ?? track.bpm ?? "—"}</span><span className="truncate font-mono text-[10px] text-white/65">{analyzed?.musicalKey ?? track.musicalKey ?? "—"}</span><span className="w-fit rounded-md border border-glass/10 bg-glass/[.045] px-2 py-1 font-mono text-[9px] text-glass">{audioQuality(track)}</span><span className={`truncate text-[11px] ${track.available ? "text-white/45" : "text-coral"}`}>{track.available ? track.sourceName : "Ejected"}</span><span className="font-mono text-[10px] tabular-nums text-white/35">{clock(track.durationSecs)}</span>{activePlaylist ? <button onClick={() => void removeTrack(track.id)} className="grid h-8 w-8 place-items-center rounded-lg text-faint opacity-0 transition-[opacity,color,background-color] hover:bg-white/5 hover:text-coral focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral group-hover:opacity-100" aria-label={`Remove ${track.title} from ${activePlaylist.name}`}><X size={14} /></button> : <motion.button whileTap={reducedMotion ? undefined : { scale: 0.9 }} onClick={() => { player.enqueue(track); setMessage(`Added “${track.title}” to the queue.`); }} disabled={!track.available || player.currentTrack?.id === track.id || player.queue.some((item) => item.id === track.id)} className="grid h-8 w-8 place-items-center rounded-lg text-faint opacity-0 transition-[opacity,color,background-color] hover:bg-white/5 hover:text-glass focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glass disabled:cursor-not-allowed disabled:opacity-10 group-hover:opacity-100" aria-label={`Add ${track.title} to queue`}><ListPlus size={14} /></motion.button>}
            </div>;
          })}
          {!displayed.length && <div className="grid min-h-36 place-items-center text-sm text-muted-foreground">{activePlaylist ? "This playlist is empty. Select tracks from All USB tracks to add them." : "No indexed tracks match this search."}</div>}
        </div>
      </section>}
    </main>
  </div>;
}
