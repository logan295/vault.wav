"use client";

import Image from "next/image";
import { PlaylistArtwork, playlistCoverUrl } from "@/components/playlist-artwork";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, BookOpen, Check, ChevronRight, Disc3, Download, Home, Library, ListPlus, Pause, Play, Plus, RefreshCw, Search, Trash2, Usb, Users, Waves, X, Zap } from "lucide-react";
import { useLocalPlayback, useLocalPlaybackControls } from "@/components/local-playback-provider";
import { VirtualTrackList } from "@/components/virtual-track-list";
import { TrackActions } from "@/components/track-actions";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TrackArtwork } from "@/components/track-artwork";
const RealWaveform = dynamic(() => import("@/components/real-waveform").then(module => module.RealWaveform), { loading: () => <div className="h-64 animate-pulse rounded-lg bg-white/5" /> });
const LaserShowRenderer = dynamic(() => import("@/components/laser-show-renderer").then(module => module.LaserShowRenderer), { ssr: false, loading: () => <div className="grid h-64 place-items-center text-sm text-muted-foreground">Opening stage…</div> });
import type { LocalPlaylist, LocalTrack, LocalVolume } from "@/lib/local-audio/types";
import { audioBitrateKbps, audioQuality } from "@/lib/local-audio/format";

function clock(seconds: number | null) { if (!seconds) return "—"; const value = Math.round(seconds); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`; }

type SortKey = "title" | "album" | "bpm" | "musicalKey" | "quality" | "source" | "duration";
type SortDirection = "asc" | "desc";
type Surface = "home" | "tracks" | "artists" | "analysis" | "laser" | "playlists";

function compareNullable(left: string | number | null | undefined, right: string | number | null | undefined, direction: SortDirection) {
  const leftMissing = left === null || left === undefined || left === "";
  const rightMissing = right === null || right === undefined || right === "";
  if (leftMissing || rightMissing) return leftMissing === rightMissing ? 0 : leftMissing ? 1 : -1;
  const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

function SortHeader({ label, column, active, direction, onSort, className = "" }: { label: string; column: SortKey; active: boolean; direction: SortDirection; onSort: (column: SortKey) => void; className?: string }) {
  const Icon = active ? direction === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
  return <button type="button" onClick={() => onSort(column)} aria-label={`Sort by ${label}${active ? `, currently ${direction === "asc" ? "ascending" : "descending"}` : ""}`} className={`${className} group inline-flex items-center gap-1 text-left hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral ${active ? "text-foreground" : ""}`}><span>{label}</span><Icon size={11} aria-hidden="true" className={active ? "text-coral" : "opacity-35 group-hover:opacity-70"} /></button>;
}

function TrackTransport({ track, active, playing, onPlay }: { track: LocalTrack; active: boolean; playing: boolean; reducedMotion: boolean | null; onPlay: () => void }) {
  return <button type="button" onClick={onPlay} disabled={!track.available} aria-label={active && playing ? `Pause ${track.title}` : `Play ${track.title}`} data-active={active} className="row-play-overlay record-play absolute inset-0 grid place-items-center rounded-[4px] bg-black/60 text-white disabled:cursor-not-allowed disabled:opacity-40">{active && playing ? <Pause size={20} fill="currentColor" strokeWidth={1.3} /> : <Play size={20} fill="currentColor" strokeWidth={1.3} className="translate-x-px" />}</button>;
}

function searchText(value: string | null | undefined) {
  return (value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function searchRank(track: LocalTrack, words: string[], phrase: string) {
  const title = searchText(track.title);
  const artist = searchText(track.artist);
  const album = searchText(track.album);
  const details = searchText(`${track.relativePath} ${track.sourceName} ${track.bpm ?? ""} ${track.musicalKey ?? ""}`);
  if (!words.every((word) => [title, artist, album, details].some((field) => field.includes(word)))) return -1;
  if (title === phrase) return 100;
  if (title.startsWith(phrase)) return 80;
  if (artist === phrase) return 70;
  if (album === phrase) return 60;
  return words.reduce((score, word) => score + (title.includes(word) ? 8 : artist.includes(word) ? 5 : album.includes(word) ? 3 : 1), 0);
}

type ArtistEntry = { key: string; name: string; tracks: readonly LocalTrack[]; cover: LocalTrack };

function LibraryView({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button type="button" onClick={onClick} aria-pressed={active}
    className="min-h-11 rounded-full bg-white/8 px-4 text-sm text-white hover:bg-white/15 aria-pressed:bg-white aria-pressed:text-black aria-pressed:hover:bg-white">{children}</button>;
}

function ArtistGrid({ artists, onSelect }: { artists: ArtistEntry[]; onSelect: (key: string) => void }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,144px),1fr))] gap-3 sm:gap-4">
    {artists.map((artist) => <button type="button" key={artist.key} onClick={() => onSelect(artist.key)} className="min-w-0 rounded-xl p-2 text-left hover:bg-white/8 sm:p-3">
      <TrackArtwork track={artist.cover} className="aspect-square w-full rounded-full!" />
      <strong className="mt-3 block truncate text-base font-bold">{artist.name}</strong>
      <span className="block text-sm text-muted-foreground">{artist.tracks.length} {artist.tracks.length === 1 ? "track" : "tracks"}</span>
    </button>)}
  </div>;
}

function MusicShelf({ title, tracks, activeId, playing, onPlay, onShowAll }: { title: string; tracks: LocalTrack[]; activeId?: string; playing: boolean; onPlay: (track: LocalTrack) => void; onShowAll?: () => void }) {
  const reducedMotion = useReducedMotion();
  return <section className="mt-9"><div className="mb-3 flex items-end justify-between"><h2 className="text-2xl font-bold tracking-[-.025em]">{title}</h2>{onShowAll && <button type="button" onClick={onShowAll} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-white">Show all <ChevronRight size={13} /></button>}</div><div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{tracks.slice(0, 8).map((track) => { const active = activeId === track.id; return <motion.article key={track.id} whileHover={reducedMotion ? undefined : { y: -3 }} transition={{ duration: .18, ease: [.23, 1, .32, 1] }} className="group w-[clamp(140px,16vw,188px)] shrink-0 rounded-lg p-2.5 transition-colors hover:bg-white/[.055]"><div className="relative"><TrackArtwork track={track} className="aspect-square w-full rounded-md shadow-[0_16px_35px_rgba(0,0,0,.35)]" /><motion.button whileHover={reducedMotion ? undefined : { scale: 1.04 }} whileTap={reducedMotion ? undefined : { scale: .94 }} onClick={() => onPlay(track)} className={`absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full bg-coral text-[#080b0c] shadow-[0_10px_24px_rgba(0,0,0,.45)] transition-all ${active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"}`} aria-label={active && playing ? `Pause ${track.title}` : `Play ${track.title}`}>{active && playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="translate-x-px" />}</motion.button></div><button onClick={() => onPlay(track)} className="mt-3 block w-full text-left"><strong className="block truncate text-base font-semibold text-white">{track.title}</strong><span className="mt-1 block line-clamp-2 min-h-8 text-sm leading-5 text-muted-foreground">{track.artist || track.album || track.sourceName}</span></button></motion.article>; })}</div></section>;
}

async function fetchLibrarySnapshot() {
  const [tracksResponse, playlistsResponse] = await Promise.all([fetch("/api/local/tracks", { cache: "no-store" }), fetch("/api/local/playlists", { cache: "no-store" })]);
  const tracksBody = await tracksResponse.json(); const playlistsBody = await playlistsResponse.json();
  if (!tracksResponse.ok) throw new Error(tracksBody.error); if (!playlistsResponse.ok) throw new Error(playlistsBody.error);
  return { tracks: tracksBody.tracks as LocalTrack[], playlists: playlistsBody.playlists as LocalPlaylist[] };
}

function PlaybackWaveform({ trackId, onAnalysis }: { trackId: string; onAnalysis: (value: { bpm: number | null; musicalKey: string | null }) => void }) {
  const player = useLocalPlayback();
  return <RealWaveform trackId={trackId} progress={player.duration ? player.currentTime / player.duration : 0} duration={player.duration} playing={player.playing} onSeek={value => player.seek(value * player.duration)} onAnalysis={onAnalysis} />;
}
function PlaybackLaser({ visible, bpm }: { visible: boolean; bpm: number | null }) {
  const player = useLocalPlayback();
  return <LaserShowRenderer visible={visible} trackId={player.currentTrack?.id ?? null} progress={player.duration ? player.currentTime / player.duration : 0} duration={player.duration} playing={player.playing} bpm={bpm} onToggle={() => void player.toggle()} />;
}

export function RealLibraryDashboard() {
  const player = useLocalPlaybackControls();
  const reducedMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<LocalTrack[]>([]); const [playlists, setPlaylists] = useState<LocalPlaylist[]>([]);
  const [infoTrack, setInfoTrack] = useState<LocalTrack | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const [editingDescription, setEditingDescription] = useState("");
  const [editingColor, setEditingColor] = useState("#365942");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [usbVolumes, setUsbVolumes] = useState<LocalVolume[]>([]);
  const [usbTarget, setUsbTarget] = useState("");
  const [savingUsb, setSavingUsb] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null); const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set()); const [newName, setNewName] = useState(""); const [creating, setCreating] = useState(false);
  const [targetPlaylist, setTargetPlaylist] = useState(""); const [message, setMessage] = useState("Loading your USB library…"); const [draggedId, setDraggedId] = useState<string | null>(null); const [rescanning, setRescanning] = useState(false);
  const [analysisByTrack, setAnalysisByTrack] = useState<Record<string, { bpm: number | null; musicalKey: string | null }>>({});
  const [sort, setSort] = useState<{ key: SortKey | null; direction: SortDirection }>({ key: null, direction: "asc" });
  const [surface, setSurface] = useState<Surface>("home");
  const [artistKey, setArtistKey] = useState<string | null>(null);
  const [artistAlbum, setArtistAlbum] = useState<string | null>(null);
  const [artistFilter, setArtistFilter] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [showOpened, setShowOpened] = useState(false);
  const scrollPositionsRef = useRef<Record<Surface, number>>({ home: 0, tracks: 0, artists: 0, analysis: 0, laser: 0, playlists: 0 });

  const changeSurface = useCallback((next: Surface) => {
    if (next === surface) return;
    scrollPositionsRef.current[surface] = window.scrollY;
    if (next === "laser") setShowOpened(true);
    setSurface(next);
  }, [surface]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo(0, scrollPositionsRef.current[surface]));
    return () => cancelAnimationFrame(frame);
  }, [surface]);

  const openTracks = () => { setActivePlaylistId(null); setArtistKey(null); setArtistAlbum(null); setQuery(""); changeSurface("tracks"); };
  const openArtists = () => { setArtistKey(null); setArtistFilter(""); changeSurface("artists"); };
  function openArtist(key: string) {
    setArtistKey(key);
    setArtistAlbum(null);
    setActivePlaylistId(null);
    setQuery("");
    changeSurface("tracks");
    window.scrollTo(0, 0);
  }

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

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
  useEffect(() => { let active = true; void fetchLibrarySnapshot().then((snapshot) => { if (active) { setTracks(snapshot.tracks); setPlaylists(snapshot.playlists); setMessage(""); setLoading(false); } }).catch((error: Error) => { if (active) { setMessage(error.message); setLoading(false); } }); return () => { active = false; }; }, []);

  useEffect(() => {
    let disposed = false;
    const sync = async () => {
      try {
        const [snapshot, response] = await Promise.all([fetchLibrarySnapshot(), fetch("/api/local/volumes", { cache: "no-store" })]);
        const body = await response.json();
        if (!disposed) { setTracks(current => JSON.stringify(current) === JSON.stringify(snapshot.tracks) ? current : snapshot.tracks); setPlaylists(current => JSON.stringify(current) === JSON.stringify(snapshot.playlists) ? current : snapshot.playlists); if (response.ok) setUsbVolumes(body.volumes); }
      } catch { /* Keep the last snapshot while the server is unavailable. */ }
    };
    void fetch("/api/local/volumes").then(response => response.json()).then(body => { if (!disposed) setUsbVolumes(body.volumes || []); }).catch(() => {});
    const timer = window.setInterval(() => void sync(), 10000);
    window.addEventListener("focus", sync);
    return () => { disposed = true; clearInterval(timer); window.removeEventListener("focus", sync); };
  }, []);
  async function savePlaylistToUsb() {
    if (!activePlaylistId || !usbTarget || savingUsb) return;
    setSavingUsb(true);
    try { await patchPlaylist(activePlaylistId, { usbVolumeName: usbTarget }); setMessage(`Saved to ${usbTarget}. Future edits save to this USB automatically.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save to USB."); }
    finally { setSavingUsb(false); }
  }
  function openPlaylist(playlist: LocalPlaylist) {
    setArtistKey(null); setArtistAlbum(null); setQuery(""); setSort({ key: null, direction: "asc" }); setSelected(new Set()); setActivePlaylistId(playlist.id); changeSurface("tracks");
  }

  const activePlaylist = playlists.find((playlist) => playlist.id === activePlaylistId) || null;
  const artists = useMemo(() => {
    const catalog = new Map<string, ArtistEntry>();
    for (const track of tracks) {
      const name = track.artist?.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      const entry = catalog.get(key);
      if (!entry) catalog.set(key, { key, name, tracks: [track], cover: track });
      else {
        const quality = (item: LocalTrack) => item.available ? item.hasArtwork === true ? 3 : item.hasArtwork === false ? 1 : 2 : 0;
        catalog.set(key, { ...entry, tracks: [...entry.tracks, track], cover: quality(track) > quality(entry.cover) ? track : entry.cover });
      }
    }
    return [...catalog.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);
  const artist = useMemo(() => artists.find((entry) => entry.key === artistKey), [artists, artistKey]);
  const artistTracks = artist?.tracks;
  const artistAlbums = artist ? [...new Set(artist.tracks.flatMap((track) => track.album ? [track.album] : []))].sort((a, b) => a.localeCompare(b)) : [];
  const phrase = searchText(query);
  const words = useMemo(() => phrase.split(" ").filter(Boolean), [phrase]);
  const matchingArtists = phrase ? artists.filter((entry) => words.every((word) => searchText(entry.name).includes(word))) : [];
  const displayed = useMemo(() => {
    const allowed = activePlaylist ? new Set(activePlaylist.trackIds) : null;
    const scope = artistTracks ?? tracks;
    const ranked = scope.filter((track) => (!allowed || allowed.has(track.id)) && (!artistAlbum || track.album === artistAlbum))
      .map((track) => ({ track, rank: phrase ? searchRank(track, words, phrase) : 0 }))
      .filter(({ rank }) => rank >= 0);
    if (!sort.key) return ranked.sort((a, b) => b.rank - a.rank || (activePlaylist
      ? activePlaylist.trackIds.indexOf(a.track.id) - activePlaylist.trackIds.indexOf(b.track.id)
      : a.track.title.localeCompare(b.track.title))).map(({ track }) => track);
    const filtered = ranked.map(({ track }) => track);
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
  }, [tracks, activePlaylist, artistTracks, artistAlbum, phrase, words, sort, analysisByTrack]);

  function changeSort(key: SortKey) {
    setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  }

  async function createPlaylist(event: React.FormEvent) {
    event.preventDefault(); const response = await fetch("/api/local/playlists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: newName }) }); const body = await response.json();
    if (!response.ok) return setMessage(body.error); setNewName(""); setCreating(false); await refresh(); setActivePlaylistId(body.playlist.id); setArtistKey(null); setArtistAlbum(null); setQuery(""); changeSurface("tracks");
  }
  async function patchPlaylist(id: string, changes: Partial<Pick<LocalPlaylist, "name" | "description" | "coverColor" | "trackIds" | "usbVolumeName">>) {
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
  async function removeTrack(id: string) { try { if (activePlaylist) await patchPlaylist(activePlaylist.id, { trackIds: activePlaylist.trackIds.filter((trackId) => trackId !== id) }); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove track."); } }
  async function reorder(targetId: string) {
    if (!activePlaylist || !draggedId || draggedId === targetId) return; const ids = [...activePlaylist.trackIds]; const from = ids.indexOf(draggedId); const to = ids.indexOf(targetId); if (from < 0 || to < 0) return;
    const [moved] = ids.splice(from, 1); ids.splice(to, 0, moved); setDraggedId(null); try { await patchPlaylist(activePlaylist.id, { trackIds: ids }); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not reorder playlist."); }
  }
  async function deleteActive() { if (!activePlaylist || !window.confirm(`Delete “${activePlaylist.name}”? The WAV files will not be touched.`)) return; const response = await fetch(`/api/local/playlists/${activePlaylist.id}`, { method: "DELETE" }); if (!response.ok) { const body = await response.json(); setMessage(body.error); return; } setActivePlaylistId(null); await refresh(); }
  function renameActive() { if (activePlaylist) { setImageFile(null); setImagePreview(null); setRemoveImage(false); setEditingName(activePlaylist.name); setEditingDescription(activePlaylist.description || ""); setEditingColor(activePlaylist.coverColor || "#365942"); setMessage(""); } }
  async function saveEditedName(event: React.FormEvent) {
    event.preventDefault(); if (!activePlaylist || !editingName?.trim() || savingDetails) return; setSavingDetails(true);
    try { await patchPlaylist(activePlaylist.id, { name: editingName.trim(), description: editingDescription.trim(), coverColor: editingColor }); if (imageFile || removeImage) {
      const form = new FormData(); if (imageFile) form.append("image", imageFile);
      const response = await fetch(`/api/local/playlists/${activePlaylist.id}/cover`, { method: imageFile ? "POST" : "DELETE", ...(imageFile ? { body: form } : {}) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setPlaylists(items => items.map(item => item.id === activePlaylist.id ? body.playlist : item));
    }
    setEditingName(null); setImagePreview(null); setImageFile(null); setMessage("Playlist updated."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not update playlist."); }
    finally { setSavingDetails(false); }
  }
  async function addTrackToPlaylist(track: LocalTrack, playlistId: string) {
    const playlist = playlists.find(item => item.id === playlistId); if (!playlist) return;
    try { await patchPlaylist(playlistId, { trackIds: [...new Set([...playlist.trackIds, track.id])] }); setMessage(`Added to ${playlist.name}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not add track."); }
  }



  const handleAnalysis = useCallback((analysis: { bpm: number | null; musicalKey: string | null }) => { if (player.currentTrack) { const trackId = player.currentTrack.id; setAnalysisByTrack((current) => ({ ...current, [trackId]: analysis })); setTracks((current) => current.map((track) => track.id === trackId ? { ...track, ...analysis } : track)); } }, [player.currentTrack]);
  const currentAnalysis = player.currentTrack ? analysisByTrack[player.currentTrack.id] : null;
  const recentTracks = useMemo(() => player.currentTrack ? [player.currentTrack, ...tracks.filter((track) => track.id !== player.currentTrack!.id)] : tracks, [tracks, player.currentTrack]);
  const highResolutionTracks = useMemo(() => tracks.filter((track) => (track.bitDepth ?? 0) > 16 || (track.sampleRate ?? 0) > 48000).sort((a, b) => ((b.sampleRate || 0) + (b.bitDepth || 0) * 100000) - ((a.sampleRate || 0) + (a.bitDepth || 0) * 100000)), [tracks]);
  const allDisplayedSelected = displayed.length > 0 && displayed.every((track) => selected.has(track.id));
  function playTrack(track: LocalTrack) { return player.currentTrack?.id === track.id ? player.toggle() : player.playSequence(track, displayed); }
  return <div className="grid min-h-screen grid-cols-[clamp(205px,19vw,272px)_minmax(0,1fr)] gap-2 bg-black p-2 pb-28 text-foreground max-[760px]:block">
    <aside className="sticky top-2 z-30 flex max-h-[calc(100dvh-6.5rem)] min-w-0 flex-col overflow-y-auto rounded-xl bg-[#141414] pb-4 max-[760px]:hidden">
      <div className="flex h-16 items-center gap-2.5 px-5"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#1DB954] text-background"><Disc3 size={16} /></span><b className="text-lg font-bold"><span className="text-[#1DB954]">.womp</span></b></div>
      <nav className="px-3"><Link href="/perform" className="sidebar-link"><Play size={17} /><span>Perform</span><span className="ml-auto rounded bg-[#1db954]/10 px-1.5 py-0.5 text-[9px] text-[#1db954]">LAB</span></Link><button onClick={() => changeSurface("playlists")} className={`sidebar-link w-full ${surface === "playlists" ? "active" : ""}`}><ListPlus size={17} /><span>Playlists</span><span className="ml-auto text-xs text-faint">{playlists.length}</span></button><button onClick={() => { changeSurface("home"); setActivePlaylistId(null); }} className={`sidebar-link w-full ${surface === "home" ? "active" : ""}`}><Home size={16} /><span>Home</span></button><button onClick={openTracks} className={`sidebar-link w-full ${surface === "tracks" && !activePlaylist && !artist ? "active" : ""}`}><Library size={16} /><span>Your Library</span><span className="ml-auto text-xs text-faint">{tracks.length}</span></button><button onClick={openArtists} className={`sidebar-link w-full ${surface === "artists" || artist ? "active" : ""}`}><Users size={17} /><span>Artists</span></button><button onClick={() => changeSurface("analysis")} className={`sidebar-link w-full ${surface === "analysis" ? "active" : ""}`}><Waves size={16} /><span>Audio analysis</span></button><button onClick={() => changeSurface("laser")} className={`sidebar-link w-full ${surface === "laser" ? "active" : ""}`}><Zap size={16} /><span>Laser show</span></button><div className="my-3 h-px bg-white/[.06]" /><Link href="/local-library" className="sidebar-link"><Usb size={16} /><span>Manage USBs</span></Link><Link href="/usb-guide" className="sidebar-link"><BookOpen size={16} /><span>USB guide</span></Link></nav>
      <div className="mt-6 flex items-center justify-between px-5"><span className="sidebar-label !m-0 !p-0">Playlists</span><button onClick={() => setCreating(true)} aria-label="Create playlist"><Plus size={15} /></button></div>

      <div className="mt-2 px-3">{playlists.map((playlist) => <button key={playlist.id} onClick={() => openPlaylist(playlist)} className={`playlist-link ${activePlaylistId === playlist.id ? "active" : ""}`}><PlaylistArtwork playlist={playlist} className="size-10" /><span className="min-w-0 flex-1 truncate text-left">{playlist.name}<span className="mt-1 block text-[11px] font-normal text-muted-foreground">{playlist.usbVolumeName ? `USB · ${playlist.usbVolumeName}` : "Playlist · On this Mac"}</span></span><span className="text-xs text-faint">{playlist.trackIds.length}</span></button>)}</div>
    </aside>
    <main className="col-start-2 min-h-[calc(100dvh-7rem)] min-w-0 rounded-xl bg-[linear-gradient(180deg,#232323_0,#141414_22rem)] px-3 pb-10 sm:px-6 xl:px-9">
      <header className="sticky top-0 z-20 -mx-3 rounded-t-xl border-b border-white/8 bg-[#171717] px-3 py-3 sm:-mx-6 sm:px-6 xl:-mx-9 xl:px-9">
        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => changeSurface("home")} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/8 text-white hover:bg-white/15" aria-label="Go home"><Home size={20} /></button>
          <div className="relative min-w-0 flex-1 sm:max-w-[520px]">
            <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input ref={searchRef} aria-label="Search library" type="search" value={query} placeholder="What do you want to play?"
              onChange={(event) => { setQuery(event.target.value); setSort({ key: null, direction: "asc" }); setArtistKey(null); setArtistAlbum(null); setActivePlaylistId(null); changeSurface("tracks"); }}
              onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }}
              className="h-12 w-full rounded-full bg-[#292929] pl-12 pr-4 text-base placeholder:text-muted-foreground hover:bg-[#323232] focus-visible:outline-white" />
          </div>
          <a href={activePlaylist ? `/api/local/rekordbox-export?playlist=${activePlaylist.id}` : "/api/local/rekordbox-export"} download className="ml-auto hidden shrink-0 rounded-full border border-white/20 px-3 py-2.5 text-xs font-medium text-white/80 hover:border-white/50 sm:block" title="Export playlists and available cues for import into Rekordbox">Rekordbox XML</a>
          <a href="/api/local/export" download className="hidden size-11 shrink-0 place-items-center rounded-full border sm:grid border-white/15 text-white/85 hover:bg-white/10" aria-label="Export USB ZIP" title="Export USB ZIP"><Download size={18} /></a>
          <button type="button" onClick={() => void rescanLibrary()} disabled={rescanning} aria-label={rescanning ? "Scanning library" : "Rescan library"} className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-black disabled:opacity-50" title="Rescan library"><RefreshCw size={17} className={rescanning ? "animate-spin" : ""} /></button>
        </div>
        <nav aria-label="Library views" className="mt-3 flex flex-wrap items-center gap-2">
          <LibraryView active={surface === "home"} onClick={() => changeSurface("home")}>Home</LibraryView>
          <LibraryView active={surface === "tracks" && !artist && !activePlaylist} onClick={openTracks}>Music</LibraryView>
          <LibraryView active={surface === "artists" || !!artist} onClick={openArtists}>Artists</LibraryView>
          <LibraryView active={surface === "playlists" || !!activePlaylist} onClick={() => changeSurface("playlists")}>Playlists</LibraryView>
          <LibraryView active={surface === "analysis"} onClick={() => changeSurface("analysis")}>Analysis</LibraryView>
          <LibraryView active={surface === "laser"} onClick={() => changeSurface("laser")}>Laser</LibraryView>
          <Link href="/local-library" className="inline-flex min-h-11 items-center rounded-full bg-white/8 px-4 text-sm min-[761px]:hidden">USBs</Link>
          {!!playlists.length && <select aria-label="Open playlist" value={activePlaylistId ?? ""} onChange={(event) => { if (!event.target.value) { openTracks(); return; } setArtistKey(null); setArtistAlbum(null); setQuery(""); setActivePlaylistId(event.target.value); changeSurface("tracks"); }} className="h-11 max-w-full rounded-full bg-[#292929] px-3 text-sm min-[761px]:hidden"><option value="">Playlists</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}</select>}
        </nav>
      </header>

      {loading && <section role="status" aria-label="Loading library" className="mt-6 space-y-3"><span className="sr-only">Loading your library…</span>{[0,1,2,3,4].map(row => <div key={row} className="h-14 animate-pulse rounded-md bg-white/5" />)}</section>}
      <div hidden={loading}>
      {(surface === "home" || surface === "playlists") && <section aria-label="Saved playlists" className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-3"><h1 className="text-2xl font-bold tracking-tight">Your playlists</h1><button type="button" onClick={() => setCreating(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#1db954] px-4 text-sm font-bold text-black hover:bg-[#1ed760]"><Plus size={17} /> Create playlist</button></div>
        <p className="mb-4 text-sm text-muted-foreground">Your mixes, in your order. Save a playlist to USB to take it with you.</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">{playlists.map(playlist => <button key={playlist.id} type="button" onClick={() => openPlaylist(playlist)} className="group rounded-lg p-3 text-left transition-colors hover:bg-white/8"><span className="relative block aspect-square"><PlaylistArtwork playlist={playlist} className="aspect-square w-full shadow-xl" /><span className="absolute bottom-3 right-3 grid size-12 translate-y-2 place-items-center rounded-full bg-[#1db954] text-black opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100"><Play size={21} fill="currentColor" /></span></span><strong className="mt-3 block truncate text-base">{playlist.name}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{playlist.trackIds.length} tracks · {playlist.usbVolumeName ? `${playlist.usbVolumeName}${playlist.usbConnected ? " · Connected" : " · Offline"}` : "On this Mac"}</span></button>)}</div>
        {!playlists.length && <div className="rounded-lg bg-white/5 p-6"><h2 className="font-bold">Create your first playlist</h2><p className="mt-2 text-sm text-muted-foreground">Give it a name, then select tracks in Music and choose Add to playlist.</p></div>}
      </section>}
      {creating && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-5" onClick={() => setCreating(false)}><section role="dialog" aria-modal="true" aria-labelledby="new-playlist-title" className="w-full max-w-md rounded-xl bg-[#282828] p-6 shadow-2xl" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="new-playlist-title" className="text-xl font-bold">Create playlist</h2><button type="button" aria-label="Close playlist form" onClick={() => setCreating(false)}><X size={22} /></button></div><form onSubmit={event => void createPlaylist(event).catch(error => setMessage(error.message))} className="mt-5"><label htmlFor="new-playlist-name" className="text-sm text-muted-foreground">Name</label><input id="new-playlist-name" autoFocus required maxLength={100} value={newName} onChange={event => setNewName(event.target.value)} placeholder="My playlist" className="mt-2 h-12 w-full rounded border border-white/15 bg-[#3e3e3e] px-3 outline-none focus:border-white" /><p className="mt-3 text-xs text-muted-foreground">Starts on this Mac. Open it and choose Save to USB to make it portable.</p>{message && <p role="status" className="mt-3 text-xs">{message}</p>}<button className="mt-5 rounded-full bg-[#1db954] px-6 py-3 text-sm font-bold text-black">Create</button></form></section></div>}
      {surface === "home" && <motion.div initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, ease: [.23, 1, .32, 1] }} className="pb-8 pt-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-white/75">Your lossless collection</p><h1 className="mt-1 text-[clamp(30px,4vw,48px)] font-bold tracking-[-.045em]">Your music</h1></div><p className="text-xs text-white/75">{tracks.length} tracks · {new Set(tracks.map((track) => track.sourceName)).size} USB sources</p></div>{tracks.length ? <><div className="mt-7 grid grid-cols-2 gap-2 lg:grid-cols-3">{recentTracks.slice(0, 6).map((track) => <motion.button key={track.id} whileHover={reducedMotion ? undefined : { y: -2 }} whileTap={reducedMotion ? undefined : { scale: .99 }} onClick={() => void playTrack(track)} className="group flex min-w-0 items-center overflow-hidden rounded-md bg-white/[.075] text-left transition-colors hover:bg-white/[.13]"><TrackArtwork track={track} className="h-16 w-16 shrink-0" /><strong className="min-w-0 flex-1 truncate px-3 text-[13px] font-semibold sm:text-sm">{track.title}</strong><span className="mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100">{player.currentTrack?.id === track.id && player.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</span></motion.button>)}</div><MusicShelf title="From your library" onShowAll={openTracks} tracks={recentTracks} activeId={player.currentTrack?.id} playing={player.playing} onPlay={(track) => void playTrack(track)} />{highResolutionTracks.length > 0 && <MusicShelf title="High-resolution tracks" tracks={highResolutionTracks} activeId={player.currentTrack?.id} playing={player.playing} onPlay={(track) => void playTrack(track)} />}{artists.length > 0 && <section className="mt-8"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-2xl font-bold">Artists</h2><button type="button" onClick={openArtists} className="min-h-11 px-2 text-sm text-muted-foreground hover:text-white">Show all artists</button></div><ArtistGrid artists={artists.slice(0, 6)} onSelect={openArtist} /></section>}</> : <div className="mt-8 grid min-h-[360px] place-items-center rounded-xl bg-white/[.025] p-8 text-center"><div><Disc3 className="mx-auto text-[#1DB954]" size={38} /><h2 className="mt-5 text-2xl font-bold">Bring your music home</h2><p className="mx-auto mt-2 max-w-md text-base leading-6 text-muted-foreground">Connect a USB drive and index your WAV files to fill this space with your own music.</p><Link href="/local-library" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-black">Manage USBs</Link></div></div>}</motion.div>}

      {surface === "analysis" && <section className="library-section-enter mt-9"><p className="text-xs font-medium text-glass">{player.currentTrack ? `Playing from ${player.currentTrack.sourceName}` : "Local lossless library"}</p><div className="mt-2.5 flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><h1 className="max-w-5xl truncate text-[clamp(28px,2.5vw,42px)] font-bold leading-[1.04] tracking-[-.03em]">{player.currentTrack?.title || "Audio analysis"}</h1><p className="mt-3 truncate text-[15px] text-muted-foreground">{player.currentTrack ? player.currentTrack.artist || player.currentTrack.relativePath : "A detailed, still view of every track you play"}</p>{player.currentTrack && <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-glass/20 bg-glass/[.06] px-3 py-1.5 text-xs text-glass">{currentAnalysis?.bpm || player.currentTrack.bpm || "Analyzing"} BPM</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-foreground">{currentAnalysis?.musicalKey || player.currentTrack.musicalKey || "Analyzing key"}</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground">{audioQuality(player.currentTrack)}</span></div>}</div>{player.currentTrack && <button onClick={() => void player.toggle()} className="grid h-12 w-12 place-items-center rounded-full bg-coral text-background shadow-[0_10px_30px_rgba(29,185,84,.2)]">{player.playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>}</div>
        <div className="mt-7">{player.currentTrack ? <PlaybackWaveform trackId={player.currentTrack.id} onAnalysis={handleAnalysis} /> : <div className="grid h-[270px] place-items-center rounded-xl border border-dashed border-border text-[15px] text-muted-foreground">Play a USB track to analyze its waveform, BPM and musical key.</div>}</div>
        <aside aria-label="About audio analysis" className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
          <h2 className="text-sm font-semibold">About audio analysis</h2>
          <dl className="mt-3 grid gap-4 text-xs leading-5 text-muted-foreground sm:grid-cols-3">
            <div><dt className="font-semibold text-[#1DB954]">BPM</dt><dd>Estimated beats per minute, using the first 60 seconds. Some tracks may read at half or double tempo.</dd></div>
            <div><dt className="font-semibold text-[#1DB954]">Musical key</dt><dd>Estimated tonal center and major or minor scale from the first 60 seconds. Use your ears to confirm a harmonic match.</dd></div>
            <div><dt className="font-semibold text-[#1DB954]">Waveforms</dt><dd>See the full track’s energy, frequency bands and stereo channels. Click the waveform to seek.</dd></div>
          </dl>
          <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-muted-foreground">Analysis runs locally on this Mac. Your audio stays on its source drive; results are cached for faster loading next time.</p>
        </aside>
      </section>}

      {showOpened && <section hidden={surface !== "laser"} className="mt-7 pb-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-[clamp(28px,3vw,44px)] font-bold tracking-tight">Laser show</h1>
            <p className="mt-1 text-base text-muted-foreground">{player.currentTrack ? player.currentTrack.title : "Stage preview. Play a track to sync the show to music."}</p></div>
          {!player.currentTrack && <button type="button" onClick={openTracks} className="min-h-11 rounded-full bg-white px-5 text-sm font-bold text-black">Browse tracks</button>}
        </div>
        <PlaybackLaser visible={surface === "laser"} bpm={currentAnalysis?.bpm || player.currentTrack?.bpm || null} />
      </section>}

      {surface === "artists" && <section className="py-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-4xl font-bold tracking-tight">Artists</h1><p className="mt-1 text-muted-foreground">{artists.length} artists in your library</p></div>
          <input aria-label="Filter artists" type="search" value={artistFilter} onChange={(event) => setArtistFilter(event.target.value)} placeholder="Filter artists" className="h-11 w-full rounded-full bg-white/10 px-4 sm:max-w-64" />
        </div>
        <ArtistGrid artists={artists.filter((entry) => searchText(entry.name).includes(searchText(artistFilter)))} onSelect={openArtist} />
        {!artists.some((entry) => searchText(entry.name).includes(searchText(artistFilter))) && <p className="py-8 text-muted-foreground">{artists.length ? "No artists match this filter." : "Tracks with artist tags will appear here."}</p>}
      </section>}

      {surface === "tracks" && <section key={activePlaylistId || artistKey || "tracks"} className="library-section-enter mt-5 pb-5">
        {artist && <div className="mb-7">
          <button type="button" onClick={openArtists} className="mb-3 min-h-11 text-sm text-muted-foreground hover:text-white">← All artists</button>
          <div className="flex items-end gap-4 sm:gap-6"><TrackArtwork track={artist.cover} className="size-20 rounded-full! sm:size-36" /><div className="min-w-0"><p className="text-sm text-muted-foreground">Artist</p><h1 className="break-words text-[clamp(1.8rem,5vw,4.25rem)] leading-none font-bold tracking-tight">{artist.name}</h1><p className="mt-2 text-sm text-muted-foreground">{artist.tracks.length} tracks · {artistAlbums.length} albums</p></div></div>
          {!!artistAlbums.length && <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter by album"><button type="button" aria-pressed={!artistAlbum} onClick={() => setArtistAlbum(null)} className="min-h-11 rounded-full bg-white/8 px-4 text-sm aria-pressed:bg-white aria-pressed:text-black aria-pressed:hover:bg-white">All tracks</button>{artistAlbums.map((album) => <button type="button" key={album} aria-pressed={artistAlbum === album} onClick={() => setArtistAlbum(album)} className="min-h-11 max-w-full rounded-full bg-white/8 px-4 text-sm break-words aria-pressed:bg-white aria-pressed:text-black aria-pressed:hover:bg-white">{album}</button>)}</div>}
        </div>}
        {!!matchingArtists.length && <section className="mb-7"><h2 className="mb-3 text-2xl font-bold">Matching artists</h2><ArtistGrid artists={matchingArtists.slice(0, 8)} onSelect={openArtist} /></section>}
        {activePlaylist && <section aria-label="Playlist details" style={{ background: `linear-gradient(180deg, ${activePlaylist.coverColor || "#365942"}, #171b18)` }} className="relative isolate -mx-3 mb-6 overflow-hidden bg-gradient-to-b from-[#365942] to-[#18271e] px-4 py-7 sm:-mx-6 sm:px-6 xl:-mx-9 xl:px-9">{activePlaylist.coverId && <><Image unoptimized src={playlistCoverUrl(activePlaylist)} alt="" fill sizes="100vw" className="pointer-events-none -z-20 object-cover opacity-45" /><div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#121212] via-black/30 to-black/15" /></>}<div className="flex items-end gap-5"><button type="button" onClick={renameActive} aria-label="Edit playlist image" className="group relative shrink-0"><PlaylistArtwork playlist={activePlaylist} className="size-24 shadow-2xl sm:size-40" /><span className="absolute inset-0 grid place-items-center rounded-md bg-black/60 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Edit image</span></button><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider">Playlist</p><h1 className="mt-3 break-words text-[clamp(30px,5vw,72px)] font-extrabold leading-none tracking-tight">{activePlaylist.name}</h1><p className="mt-3 text-sm text-white/65">{activePlaylist.description}</p><p className="mt-4 text-sm text-white/70">.womp · {displayed.length} songs · {clock(displayed.reduce((total, track) => total + (track.durationSecs || 0), 0))}</p></div></div>
          <div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" disabled={!displayed.some(track => track.available)} onClick={() => { const first = displayed.find(track => track.available); if (first) void player.playSequence(first, displayed); }} aria-label="Play playlist" className="grid size-14 place-items-center rounded-full bg-[#1db954] text-black hover:scale-105 disabled:opacity-40"><Play fill="currentColor" size={25} /></button><label className="sr-only" htmlFor="usb-playlist-target">Save playlist to drive</label><select id="usb-playlist-target" value={usbTarget} onChange={event => setUsbTarget(event.target.value)} className="max-w-full rounded-full border border-white/25 bg-[#202a23] px-4 py-2.5 text-xs"><option value="">Choose USB drive…</option>{usbVolumes.map(volume => <option key={volume.id} value={volume.name}>{volume.name}</option>)}</select><button type="button" disabled={!usbTarget || savingUsb} onClick={() => void savePlaylistToUsb()} className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2.5 text-xs font-semibold hover:border-white disabled:opacity-40"><Usb size={15} />{savingUsb ? "Saving…" : "Save to USB"}</button><span role="status" className="text-xs text-white/70">{activePlaylist.usbVolumeName ? `${activePlaylist.usbConnected ? "Saved to" : "Reconnect"} ${activePlaylist.usbVolumeName}${activePlaylist.usbConnected ? " · Auto-save on" : " to edit"}` : "Saved on this Mac"}</span></div><p className="mt-3 text-xs leading-5 text-white/60">USB playlists reference music on that drive. Names and track order are restored when you reconnect; on another Mac, scan the drive first.</p>
        </section>}
        <div className="flex flex-wrap items-center gap-3"><div><h2 className="text-2xl font-bold">{activePlaylist?.name || (phrase ? "Matching tracks" : artistAlbum || "Tracks")}</h2><p className="text-sm text-muted-foreground">{displayed.length} {displayed.length === 1 ? "track" : "tracks"}</p></div>{activePlaylist && <div className="ml-auto flex gap-2"><button onClick={() => void renameActive()} className="rounded-lg border border-border px-3 py-2 text-xs">Edit details</button><button onClick={() => void deleteActive()} aria-label="Delete playlist" className="rounded-lg border border-border px-3 py-2 text-xs text-red-400"><Trash2 size={13} /></button></div>}</div>
        <AnimatePresence initial={false}>{selected.size > 0 && <motion.div initial={reducedMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-glass/25 bg-[linear-gradient(90deg,rgba(116,225,214,.075),rgba(255,255,255,.018))] p-2.5 shadow-[0_12px_35px_rgba(0,0,0,.16)]"><span className="mr-1 inline-flex h-8 items-center gap-2 rounded-lg bg-glass/10 px-3 text-xs font-medium text-glass"><Check size={13} />{selected.size} selected</span><motion.button whileTap={reducedMotion ? undefined : { scale: 0.97 }} onClick={queueSelected} className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium hover:border-white/20 hover:bg-white/5"><ListPlus size={13} /> Add to queue</motion.button><span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" /><label className="sr-only" htmlFor="playlist-target">Playlist</label><select id="playlist-target" value={targetPlaylist} onChange={(event) => setTargetPlaylist(event.target.value)} className="h-8 min-w-40 rounded-lg border border-border bg-[#0b1011] px-2.5 text-xs outline-none focus:border-coral"><option value="">Choose playlist…</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}</select><motion.button whileTap={reducedMotion || !targetPlaylist ? undefined : { scale: 0.97 }} disabled={!targetPlaylist} onClick={() => void addSelected()} className="h-8 rounded-lg bg-coral px-3 text-xs font-semibold text-background shadow-[0_6px_18px_rgba(29,185,84,.16)] disabled:cursor-not-allowed disabled:opacity-35">Add to playlist</motion.button><button onClick={() => setSelected(new Set())} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-foreground" aria-label="Clear track selection"><X size={14} /></button></motion.div>}</AnimatePresence>
        {message && <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">{message}</p>}
        <div className="vault-track-list mt-2 rounded-lg">
          <div className="vault-track-row border-b border-white/10 px-2 py-2 text-xs text-muted-foreground sm:px-3"><input type="checkbox" checked={allDisplayedSelected} onChange={() => setSelected((current) => { const next = new Set(current); if (allDisplayedSelected) displayed.forEach((track) => next.delete(track.id)); else displayed.forEach((track) => next.add(track.id)); return next; })} aria-label={allDisplayedSelected ? "Deselect all visible tracks" : "Select all visible tracks"} className="h-3.5 w-3.5 accent-[var(--coral)]" /><SortHeader label="Title" column="title" active={sort.key === "title"} direction={sort.direction} onSort={changeSort} /><SortHeader className="track-album" label="Album" column="album" active={sort.key === "album"} direction={sort.direction} onSort={changeSort} /><SortHeader className="track-dj" label="BPM" column="bpm" active={sort.key === "bpm"} direction={sort.direction} onSort={changeSort} /><SortHeader className="track-dj" label="Key" column="musicalKey" active={sort.key === "musicalKey"} direction={sort.direction} onSort={changeSort} /><SortHeader className="track-dj" label="Quality" column="quality" active={sort.key === "quality"} direction={sort.direction} onSort={changeSort} /><SortHeader className="track-source" label="Source" column="source" active={sort.key === "source"} direction={sort.direction} onSort={changeSort} /><SortHeader label="Time" column="duration" active={sort.key === "duration"} direction={sort.direction} onSort={changeSort} /><span /></div>
          {displayed.length > 0 && <VirtualTrackList count={displayed.length} renderRow={(index) => {
            const track = displayed[index];
            const active = player.currentTrack?.id === track.id; const analyzed = analysisByTrack[track.id]; const sortablePlaylist = !!activePlaylist && !sort.key; const isSelected = selected.has(track.id);
            return <div key={track.id} draggable={sortablePlaylist} onDragStart={() => setDraggedId(track.id)} onDragOver={(event) => { if (sortablePlaylist) event.preventDefault(); }} onDrop={() => void reorder(track.id)} onDoubleClick={() => void playTrack(track)} className={`vault-track-row group relative h-14 rounded-md border-l-2 px-2 py-1.5 text-sm sm:px-3 transition-[background-color,border-color,box-shadow] duration-200 first:border-t-0 hover:bg-white/[.045] ${active ? "border-l-transparent bg-white/[.055]" : isSelected ? "border-l-glass bg-glass/[.045]" : "border-l-transparent"}`}>
              <input type="checkbox" checked={isSelected} aria-label={`Select ${track.title}`} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(track.id)) next.delete(track.id); else next.add(track.id); return next; })} className="h-3.5 w-3.5 accent-[var(--coral)] opacity-0 checked:opacity-100 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" />
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div className="relative size-10 shrink-0"><TrackArtwork track={track} className="size-10" /><TrackTransport track={track} active={active} playing={player.playing} reducedMotion={reducedMotion} onPlay={() => void playTrack(track)} /></div>
                <button onClick={() => void playTrack(track)} className="min-w-0 flex-1 text-left focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-[#101112]">
                  <span className="flex min-w-0 items-center gap-2"><strong className={`truncate text-[14px] font-medium ${active ? "text-coral" : "text-foreground"}`}>{track.title}</strong></span>
                  <span className={`block truncate text-sm ${active ? "text-white/75" : "text-faint"}`}>{track.artist || track.sourceName}</span>
                </button>
              </div>
              <span className="track-album truncate text-muted-foreground">{track.album || "—"}</span><span className="track-dj tabular-nums text-muted-foreground">{analyzed?.bpm ?? track.bpm ?? "—"}</span><span className="track-dj truncate text-muted-foreground">{analyzed?.musicalKey ?? track.musicalKey ?? "—"}</span><span className="track-dj min-w-0 truncate text-xs text-muted-foreground" title={audioQuality(track)}>{audioQuality(track)}</span><span className={`track-source truncate text-sm ${track.available ? "text-white/75" : "text-coral"}`}>{track.available ? track.sourceName : "Ejected"}</span><span className="text-sm tabular-nums text-muted-foreground">{clock(track.durationSecs)}</span><TrackActions track={track} playlists={playlists} inPlaylist={!!activePlaylist} onPlay={() => void playTrack(track)} onQueue={() => { player.enqueue(track); setMessage(`Added “${track.title}” to the queue.`); }} onNext={() => { player.enqueue(track); player.prioritizeTrack(track.id); setMessage(`“${track.title}” will play next.`); }} onAdd={id => void addTrackToPlaylist(track, id)} onRemove={() => void removeTrack(track.id)} onInfo={() => setInfoTrack(track)} onArtist={() => openArtist(track.artist!.trim().toLocaleLowerCase())} />
            </div>;
          }} />}
          {!displayed.length && <div className="grid min-h-36 place-items-center text-sm text-muted-foreground">{activePlaylist ? "This playlist is empty. Select tracks in Music, then choose Add to playlist." : "No indexed tracks match this search."}</div>}
        </div>
      </section>}
      <Dialog open={editingName !== null} onOpenChange={open => { if (!open) setEditingName(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto bg-[#282828] p-6 sm:max-w-md"><DialogTitle className="text-2xl font-bold">Edit playlist</DialogTitle><DialogDescription>Changes save to {activePlaylist?.usbVolumeName || "this Mac"}.</DialogDescription><form onSubmit={event => void saveEditedName(event)}><div className="mb-5 flex items-center gap-4"><div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-white/5">{imagePreview ? <Image unoptimized src={imagePreview} alt="New playlist image preview" fill className="object-cover" /> : activePlaylist && !removeImage ? <PlaylistArtwork playlist={activePlaylist} className="size-24" /> : <div className="grid h-full place-items-center"><ListPlus size={30} /></div>}</div><div><label className="inline-flex cursor-pointer rounded-full border border-white/30 px-4 py-2 text-xs font-semibold hover:border-white">Choose image<input type="file" aria-label="Playlist image" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setMessage("Choose an image smaller than 5 MB."); return; } setImageFile(file); setImagePreview(URL.createObjectURL(file)); setRemoveImage(false); setMessage(""); }} /></label><p className="mt-2 text-[11px] text-muted-foreground">JPG, PNG or WebP · Up to 5 MB</p>{(imageFile || activePlaylist?.coverId) && !removeImage && <button type="button" onClick={() => { setRemoveImage(true); setImageFile(null); setImagePreview(null); }} className="mt-2 text-xs text-muted-foreground hover:text-white">Remove image</button>}</div></div><label htmlFor="edit-playlist-name" className="text-xs font-semibold">Playlist name</label><input id="edit-playlist-name" required maxLength={100} value={editingName || ""} onChange={event => setEditingName(event.target.value)} className="mt-2 h-12 w-full rounded bg-white/10 px-3 outline-none focus:ring-1 focus:ring-white" /><label htmlFor="playlist-description" className="mt-4 block text-xs font-semibold">Description</label><textarea id="playlist-description" maxLength={500} value={editingDescription} onChange={event => setEditingDescription(event.target.value)} placeholder="Add a description" className="mt-2 min-h-24 w-full resize-none rounded bg-white/10 p-3 text-sm outline-none focus:ring-1 focus:ring-white" /><label htmlFor="playlist-color" className="mt-3 flex items-center justify-between text-sm">Playlist color<input id="playlist-color" type="color" value={editingColor} onChange={event => setEditingColor(event.target.value)} className="size-9 cursor-pointer rounded border-0 bg-transparent" /></label><button disabled={savingDetails} className="mt-5 rounded-full bg-white px-6 py-3 text-sm font-bold text-black disabled:opacity-50">{savingDetails ? "Saving…" : "Save"}</button>{message && <p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p>}</form></DialogContent></Dialog>
      <Dialog open={!!infoTrack} onOpenChange={open => { if (!open) setInfoTrack(null); }}><DialogContent className="bg-[#282828] p-6 sm:max-w-md"><DialogTitle className="text-xl font-bold">Track information</DialogTitle><DialogDescription>Original file details from your local library.</DialogDescription>{infoTrack && <><div className="flex items-center gap-4"><TrackArtwork track={infoTrack} className="size-20" /><div className="min-w-0"><h3 className="text-lg font-bold">{infoTrack.title}</h3><p className="text-sm text-muted-foreground">{infoTrack.artist || "Unknown artist"}</p></div></div><dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">{[["Album", infoTrack.album || "—"], ["Duration", clock(infoTrack.durationSecs)], ["BPM", analysisByTrack[infoTrack.id]?.bpm || infoTrack.bpm || "Not analyzed"], ["Key", analysisByTrack[infoTrack.id]?.musicalKey || infoTrack.musicalKey || "Not analyzed"], ["Quality", audioQuality(infoTrack)], ["Source", infoTrack.sourceName], ["File", infoTrack.relativePath], ["Status", infoTrack.available ? "Connected" : "Drive offline"]].map(([label, value]) => <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words">{value}</dd></div>)}</dl>{infoTrack.soundcloudUrl && <a href={infoTrack.soundcloudUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-[#1db954] hover:underline">Artwork from {infoTrack.soundcloudArtist || "the uploader"} on SoundCloud ↗</a>}</>}</DialogContent></Dialog>
      </div>
    </main>
  </div>;
}
