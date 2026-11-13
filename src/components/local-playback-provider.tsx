"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, ListMusic, Pause, Play, SkipBack, SkipForward, Trash2, Volume2, VolumeX, Shuffle, Repeat, Repeat1, X } from "lucide-react";
import { VirtualTrackList } from "@/components/virtual-track-list";
import { TrackArtwork } from "@/components/track-artwork";
import type { LocalTrack } from "@/lib/local-audio/types";
import { audioQuality } from "@/lib/local-audio/format";

export type PlaybackSample = { time: number; sampledAt: number; advancing: boolean; rate?: number };

type LocalPlaybackContextValue = {
  currentTrack: LocalTrack | null;
  playing: boolean;
  currentTime: number;
  samplePlayback: () => PlaybackSample;
  pause: () => void;
  duration: number;
  error: string | null;
  queue: LocalTrack[];
  canGoPrevious: boolean;
  play: (track: LocalTrack) => Promise<void>;
  playSequence: (track: LocalTrack, sequence: LocalTrack[]) => Promise<void>;
  toggle: () => Promise<void>;
  seek: (seconds: number) => void;
  enqueue: (track: LocalTrack) => void;
  enqueueMany: (tracks: LocalTrack[]) => void;
  prioritizeTrack: (trackId: string) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
};

type PlaybackControls = Omit<LocalPlaybackContextValue, "currentTime">;
const LocalPlaybackContext = createContext<PlaybackControls | null>(null);
const PlaybackTimeContext = createContext(0);

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function LocalPlaybackProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<LocalTrack | null>(null);
  const queueRef = useRef<LocalTrack[]>([]);
  const historyRef = useRef<LocalTrack[]>([]);
  const nextRef = useRef<() => Promise<void>>(async () => undefined);
  const [currentTrack, setCurrentTrack] = useState<LocalTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<LocalTrack[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const draggedQueueId = useRef<string | null>(null);
  const [queueDropTarget, setQueueDropTarget] = useState<string | null>(null);
  const [queueAnnouncement, setQueueAnnouncement] = useState("");
  const [queueOpen, setQueueOpen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(false);
  const sequenceRef = useRef<LocalTrack[]>([]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { if (audioRef.current) { audioRef.current.volume = volume; audioRef.current.muted = muted; } }, [volume, muted]);

  const updateQueue = useCallback((updater: (current: LocalTrack[]) => LocalTrack[]) => {
    setQueue((current) => { const nextQueue = updater(current); queueRef.current = nextQueue; return nextQueue; });
  }, []);

  const updateHistory = useCallback((updater: (current: LocalTrack[]) => LocalTrack[]) => {
    const nextHistory = updater(historyRef.current); historyRef.current = nextHistory; setHistoryCount(nextHistory.length);
  }, []);

  const loadAndPlay = useCallback(async (track: LocalTrack, recordHistory = true) => {
    if (!track.available) throw new Error(`Reconnect ${track.sourceName} to play this track.`);
    const audio = audioRef.current;
    if (!audio) throw new Error("The local player is still starting.");
    setError(null);
    const previousTrack = currentTrackRef.current;
    if (previousTrack?.id !== track.id) {
      if (recordHistory && previousTrack) updateHistory((current) => [...current.slice(-49), previousTrack]);
      audio.src = `/api/local/tracks/${track.id}/stream`;
      audio.load();
      currentTrackRef.current = track;
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(track.durationSecs || 0);
      updateQueue((current) => current.filter((item) => item.id !== track.id));
    }
    if (audio.ended) audio.currentTime = 0;
    try { await audio.play(); } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setPlaying(false);
      if (reason instanceof DOMException && reason.name === "NotAllowedError") { setError("Press play once to allow audio in this browser."); return; }
      throw reason;
    }
  }, [updateHistory, updateQueue]);

  const next = useCallback(async () => {
    const upcoming = queueRef.current.length ? queueRef.current : repeatRef.current === "all" ? sequenceRef.current.filter(track => track.available) : [];
    const [nextTrack, ...remaining] = upcoming;
    if (!nextTrack) { setPlaying(false); return; }
    queueRef.current = remaining; setQueue(remaining);
    await loadAndPlay(nextTrack);
  }, [loadAndPlay]);

  const previous = useCallback(async () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; setCurrentTime(0); return; }
    const previousTrack = historyRef.current.at(-1);
    if (!previousTrack) { if (audio) { audio.currentTime = 0; setCurrentTime(0); } return; }
    updateHistory((current) => current.slice(0, -1));
    const outgoing = currentTrackRef.current;
    if (outgoing) updateQueue((current) => [outgoing, ...current.filter((track) => track.id !== outgoing.id)]);
    await loadAndPlay(previousTrack, false);
  }, [loadAndPlay, updateHistory, updateQueue]);

  useEffect(() => { nextRef.current = next; }, [next]);

  useEffect(() => {
    const audio = audioRef.current!;
    audio.preload = "metadata";
    let animationFrame = 0;
    const syncTime = () => setCurrentTime(audio.currentTime);
    let lastPublishedAt = 0;
    const animate = (timestamp: number) => {
      if (timestamp - lastPublishedAt >= 100) { lastPublishedAt = timestamp; setCurrentTime(audio.currentTime); }
      if (!audio.paused && !audio.ended) animationFrame = requestAnimationFrame(animate);
    };
    const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlay = () => { setPlaying(true); cancelAnimationFrame(animationFrame); animationFrame = requestAnimationFrame(animate); };
    const handlePause = () => { setPlaying(false); cancelAnimationFrame(animationFrame); syncTime(); };
    const handleEnded = () => { cancelAnimationFrame(animationFrame); syncTime(); if (repeatRef.current === "one") { audio.currentTime = 0; void audio.play(); } else void nextRef.current(); };
    const handleError = () => { setPlaying(false); setError("Playback stopped because the WAV or USB drive became unavailable."); };
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("seeked", syncTime);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("seeked", syncTime);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      cancelAnimationFrame(animationFrame);
      audio.removeAttribute("src");
      audio.load();
    };
  }, []);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrackRef.current) return;
    if (audio.paused) {
      try { await audio.play(); } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setPlaying(false);
        if (reason instanceof DOMException && reason.name === "NotAllowedError") { setError("Press play once to allow audio in this browser."); return; }
        throw reason;
      }
    } else audio.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, Number.isFinite(audio.duration) ? audio.duration : seconds));
    setCurrentTime(audio.currentTime);
  }, []);

  const enqueueMany = useCallback((tracks: LocalTrack[]) => {
    updateQueue((current) => {
      const ids = new Set([currentTrackRef.current?.id, ...current.map((track) => track.id)]);
      return [...current, ...tracks.filter((track) => track.available && !ids.has(track.id) && ids.add(track.id))];
    });
  }, [updateQueue]);
  const enqueue = useCallback((track: LocalTrack) => enqueueMany([track]), [enqueueMany]);
  const moveQueueTrack = useCallback((fromId: string, targetId: string, after = false) => {
    updateQueue(current => {
      const from = current.findIndex(track => track.id === fromId);
      const target = current.findIndex(track => track.id === targetId);
      if (from < 0 || target < 0 || from === target) return current;
      const next = [...current]; const [moved] = next.splice(from, 1);
      const position = next.findIndex(track => track.id === targetId) + (after ? 1 : 0);
      next.splice(position, 0, moved);
      return next;
    });
  }, [updateQueue]);
  const prioritizeTrack = useCallback((trackId: string) => updateQueue((current) => {
    const track = current.find((item) => item.id === trackId);
    return track ? [track, ...current.filter((item) => item.id !== trackId)] : current;
  }), [updateQueue]);
  const removeFromQueue = useCallback((trackId: string) => updateQueue((current) => current.filter((track) => track.id !== trackId)), [updateQueue]);
  const clearQueue = useCallback(() => updateQueue(() => []), [updateQueue]);
  const playSequence = useCallback(async (track: LocalTrack, sequence: LocalTrack[]) => {
    sequenceRef.current = sequence;
    const position = sequence.findIndex((item) => item.id === track.id);
    updateQueue(() => {
      const upcoming = (position < 0 ? [] : shuffleRef.current ? sequence : sequence.slice(position + 1)).filter(item => item.available && item.id !== track.id);
      if (shuffleRef.current) for (let i = upcoming.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]]; }
      return upcoming;
    });
    await loadAndPlay(track);
  }, [loadAndPlay, updateQueue]);

  const pause = useCallback(() => { audioRef.current?.pause(); }, []);

  const samplePlayback = useCallback((): PlaybackSample => {
    const audio = audioRef.current;
    return {
      time: audio?.currentTime ?? 0,
      sampledAt: performance.timeOrigin + performance.now(),
      advancing: !!audio && !audio.paused && !audio.ended && !audio.seeking && audio.readyState >= 3,
    };
  }, []);

  const canGoPrevious = historyCount > 0 || currentTime > 0;
  const value = useMemo<PlaybackControls>(() => ({ currentTrack, playing, samplePlayback, pause, duration, error, queue, canGoPrevious, play: loadAndPlay, playSequence, toggle, seek, enqueue, enqueueMany, prioritizeTrack, removeFromQueue, clearQueue, next, previous }), [currentTrack, playing, samplePlayback, pause, duration, error, queue, canGoPrevious, loadAndPlay, playSequence, toggle, seek, enqueue, enqueueMany, prioritizeTrack, removeFromQueue, clearQueue, next, previous]);

  return <LocalPlaybackContext.Provider value={value}><PlaybackTimeContext.Provider value={currentTime}>
    <audio ref={audioRef} preload="metadata" aria-label="Library audio output" className="hidden" />
    {children}
    <AnimatePresence>
      {currentTrack && queueOpen && <motion.aside initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }} className="fixed bottom-[88px] right-4 z-[90] w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-xl border border-white/10 bg-[#181818]/98 shadow-[0_24px_70px_rgba(0,0,0,.55)] " aria-label="Play queue">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-glass">Up next</p><p className="mt-0.5 text-xs text-faint">{queue.length ? `${queue.length} track${queue.length === 1 ? "" : "s"}` : "Queue is clear"}</p></div>{queue.length > 0 && <button onClick={clearQueue} className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-faint hover:bg-white/5 hover:text-foreground"><Trash2 size={12} /> Clear</button>}<button onClick={() => setQueueOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-white/5 hover:text-foreground" aria-label="Close queue"><X size={14} /></button></div>
        <p className="px-4 py-2 text-[11px] text-faint">Drag the grip to reorder · Use ↑ / ↓ when focused</p><p className="sr-only" role="status" aria-live="polite">{queueAnnouncement}</p>
        <div className="queue-track-list max-h-[min(420px,52vh)] overflow-y-auto">{queue.length ? <VirtualTrackList count={queue.length} renderRow={index => { const track = queue[index]; return <div key={track.id} data-queue-track={track.id} onDragOver={event => { if (!draggedQueueId.current) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setQueueDropTarget(track.id); const scroll = event.currentTarget.closest(".track-scroll"); if (scroll) { const bounds = scroll.getBoundingClientRect(); if (event.clientY < bounds.top + 40) scroll.scrollTop -= 28; else if (event.clientY > bounds.bottom - 40) scroll.scrollTop += 28; } }} onDrop={event => { event.preventDefault(); const from = draggedQueueId.current; if (from) { const bounds = event.currentTarget.getBoundingClientRect(); moveQueueTrack(from, track.id, event.clientY > bounds.top + bounds.height / 2); setQueueAnnouncement("Queue order updated."); } draggedQueueId.current = null; setQueueDropTarget(null); }} className={`group relative flex h-14 items-center gap-2 border-b border-white/[.055] px-3 py-2 last:border-0 hover:bg-white/[.035] ${queueDropTarget === track.id ? "bg-[#1db954]/10 ring-1 ring-inset ring-[#1db954]" : ""}`}><button type="button" draggable onDragStart={event => { draggedQueueId.current = track.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", track.id); }} onDragEnd={() => { draggedQueueId.current = null; setQueueDropTarget(null); }} onKeyDown={event => { if (!["ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); const direction = event.key === "ArrowUp" ? -1 : 1; const target = queue[index + direction]; if (target) { moveQueueTrack(track.id, target.id, direction > 0); setQueueAnnouncement(`${track.title} moved ${direction < 0 ? "up" : "down"}.`); requestAnimationFrame(() => { document.querySelector<HTMLButtonElement>(`[data-queue-track="${track.id}"] [draggable]`)?.focus(); }); } }} aria-label={`Reorder ${track.title}`} title="Drag to reorder, or use arrow keys" className="grid h-9 w-5 shrink-0 cursor-grab place-items-center rounded text-faint hover:text-white focus-visible:outline-2 focus-visible:outline-[#1db954] active:cursor-grabbing"><GripVertical size={16} strokeWidth={1.6} /></button><span className="w-4 shrink-0 text-[10px] tabular-nums text-faint">{index + 1}</span><TrackArtwork track={track} className="size-9" /><button onClick={() => void loadAndPlay(track)} className="min-w-0 flex-1 text-left"><strong className="block truncate text-xs font-medium">{track.title}</strong><span className="mt-0.5 block truncate text-xs text-faint">{track.artist || track.sourceName}</span></button><button onClick={() => removeFromQueue(track.id)} className="grid h-7 w-7 place-items-center rounded-md text-faint opacity-60 hover:bg-white/5 hover:text-coral group-hover:opacity-100" aria-label={`Remove ${track.title} from queue`}><X size={13} /></button></div>; }} /> : <div className="px-5 py-8 text-center"><ListMusic size={20} className="mx-auto text-faint" /><p className="mt-2 text-xs text-muted-foreground">Select tracks and add them to play next.</p></div>}</div>
      </motion.aside>}
    </AnimatePresence>
    {currentTrack && <footer className="fixed inset-x-0 bottom-0 z-[80] grid h-[88px] grid-cols-[minmax(0,1fr)_minmax(220px,1.35fr)_minmax(0,1fr)] items-center gap-4 border-t border-white/8 bg-[#000] px-4 max-[640px]:h-[76px] max-[640px]:grid-cols-[minmax(0,1fr)_170px] max-[640px]:gap-2" aria-label="Local audio player">
      <Link href="/" className="flex min-w-0 items-center gap-3"><TrackArtwork track={currentTrack} className="size-12 shrink-0 sm:size-14" /><span className="min-w-0"><strong className="block truncate text-[13px] font-medium text-white">{currentTrack.title}</strong><small className="mt-1 block truncate text-[11px] text-[#b3b3b3]">{currentTrack.artist || currentTrack.sourceName}</small></span></Link>
      <div className="flex min-w-0 flex-col items-center gap-1.5"><div className="flex items-center gap-4"><button type="button" aria-label="Shuffle" aria-pressed={shuffle} onClick={() => { shuffleRef.current = !shuffle; setShuffle(!shuffle); if (!shuffle) updateQueue(current => { const mixed = [...current]; for (let i = mixed.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [mixed[i], mixed[j]] = [mixed[j], mixed[i]]; } return mixed; }); }} className={`hidden size-7 place-items-center sm:grid ${shuffle ? "text-coral" : "text-[#a7a7a7] hover:text-white"}`}><Shuffle size={16} strokeWidth={1.8} /></button><button type="button" onClick={() => void previous()} disabled={!canGoPrevious} className="text-[#b3b3b3] transition-colors hover:text-white disabled:opacity-30" aria-label="Previous track"><SkipBack size={17} fill="currentColor" strokeWidth={1.4} /></button><button type="button" onClick={() => void toggle()} className="record-play grid size-8 place-items-center rounded-full bg-white text-black hover:scale-105" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={16} fill="currentColor" strokeWidth={1.4} /> : <Play size={16} fill="currentColor" strokeWidth={1.4} className="translate-x-px" />}</button><button type="button" onClick={() => void next()} disabled={!queue.length && repeat !== "all"} className="text-[#b3b3b3] transition-colors hover:text-white disabled:opacity-30" aria-label="Next track"><SkipForward size={17} fill="currentColor" strokeWidth={1.4} /></button><button type="button" aria-label={`Repeat: ${repeat}`} aria-pressed={repeat !== "off"} onClick={() => setRepeat(current => current === "off" ? "all" : current === "all" ? "one" : "off")} className={`hidden size-7 place-items-center sm:grid ${repeat !== "off" ? "text-coral" : "text-[#a7a7a7] hover:text-white"}`}>{repeat === "one" ? <Repeat1 size={16} strokeWidth={1.8} /> : <Repeat size={16} strokeWidth={1.8} />}</button></div><div className="flex w-full max-w-[540px] items-center gap-2 text-[10px] tabular-nums text-[#a7a7a7]"><span className="w-8 text-right">{clock(currentTime)}</span><input type="range" min={0} max={Math.max(duration,1)} step={.01} value={Math.min(currentTime,Math.max(duration,1))} onChange={event => seek(Number(event.target.value))} style={{background:`linear-gradient(to right, #fff ${duration ? currentTime/duration*100 : 0}%, #ffffff35 0)`}} className="player-range min-w-0 flex-1" aria-label="Seek through track" /><span className="w-8">{clock(duration)}</span></div></div>
      <div className="flex min-w-0 items-center justify-end gap-3 max-[640px]:hidden"><span title={audioQuality(currentTrack)} className="hidden rounded border border-white/15 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-[#b3b3b3] xl:block">{currentTrack.codec?.toUpperCase() || "AUDIO"}</span><button type="button" onClick={() => setQueueOpen(open => !open)} className={`relative grid size-8 place-items-center rounded-full transition-colors ${queueOpen ? "text-[#1db954]" : "text-[#b3b3b3] hover:text-white"}`} aria-label={`Open queue, ${queue.length} tracks`} aria-expanded={queueOpen}><ListMusic size={19} strokeWidth={1.7} />{queue.length > 0 && <i className="absolute bottom-0 size-1 rounded-full bg-[#1db954]" />}</button><button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(value => !value)} className="text-[#b3b3b3] hover:text-white">{muted || volume === 0 ? <VolumeX size={18} strokeWidth={1.7} /> : <Volume2 size={18} strokeWidth={1.7} />}</button><input aria-label="Volume" type="range" min={0} max={1} step={.01} value={muted ? 0 : volume} onChange={event => {setVolume(Number(event.target.value));setMuted(false);}} style={{background:`linear-gradient(to right, #fff ${muted ? 0 : volume*100}%, #ffffff35 0)`}} className="player-range w-20 lg:w-24" /></div>
      {error && <p role="alert" className="absolute bottom-full inset-x-0 bg-[#282828] px-4 py-2 text-center text-xs text-red-200">{error}</p>}
    </footer>}

  </PlaybackTimeContext.Provider></LocalPlaybackContext.Provider>;
}

export function useLocalPlaybackControls() {
  const context = useContext(LocalPlaybackContext);
  if (!context) throw new Error("useLocalPlayback must be used inside LocalPlaybackProvider.");
  return context;
}

export function useLocalPlayback() {
  const controls = useLocalPlaybackControls();
  const currentTime = useContext(PlaybackTimeContext);
  return { ...controls, currentTime };
}
