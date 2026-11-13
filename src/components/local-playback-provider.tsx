"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ListMusic, Pause, Play, SkipBack, SkipForward, Trash2, Volume2, X } from "lucide-react";
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

const LocalPlaybackContext = createContext<LocalPlaybackContextValue | null>(null);

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
  const [queueOpen, setQueueOpen] = useState(false);

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
    try { await audio.play(); } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setPlaying(false);
      if (reason instanceof DOMException && reason.name === "NotAllowedError") { setError("Press play once to allow audio in this browser."); return; }
      throw reason;
    }
  }, [updateHistory, updateQueue]);

  const next = useCallback(async () => {
    const [nextTrack, ...remaining] = queueRef.current;
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
    const handleEnded = () => { cancelAnimationFrame(animationFrame); syncTime(); void nextRef.current(); };
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
  const prioritizeTrack = useCallback((trackId: string) => updateQueue((current) => {
    const track = current.find((item) => item.id === trackId);
    return track ? [track, ...current.filter((item) => item.id !== trackId)] : current;
  }), [updateQueue]);
  const removeFromQueue = useCallback((trackId: string) => updateQueue((current) => current.filter((track) => track.id !== trackId)), [updateQueue]);
  const clearQueue = useCallback(() => updateQueue(() => []), [updateQueue]);
  const playSequence = useCallback(async (track: LocalTrack, sequence: LocalTrack[]) => {
    const position = sequence.findIndex((item) => item.id === track.id);
    updateQueue(() => (position < 0 ? [] : sequence.slice(position + 1)).filter((item) => item.available && item.id !== track.id));
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
  const value = useMemo<LocalPlaybackContextValue>(() => ({ currentTrack, playing, currentTime, samplePlayback, pause, duration, error, queue, canGoPrevious, play: loadAndPlay, playSequence, toggle, seek, enqueue, enqueueMany, prioritizeTrack, removeFromQueue, clearQueue, next, previous }), [currentTrack, playing, currentTime, samplePlayback, pause, duration, error, queue, canGoPrevious, loadAndPlay, playSequence, toggle, seek, enqueue, enqueueMany, prioritizeTrack, removeFromQueue, clearQueue, next, previous]);
  const tap = reducedMotion ? undefined : { scale: 0.94 };

  return <LocalPlaybackContext.Provider value={value}>
    <audio ref={audioRef} preload="metadata" aria-label="Library audio output" className="hidden" />
    {children}
    <AnimatePresence>
      {currentTrack && queueOpen && <motion.aside initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }} className="fixed bottom-[88px] right-4 z-[90] w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-xl border border-white/10 bg-[#0a0f10]/95 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-2xl" aria-label="Play queue">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-glass">Up next</p><p className="mt-0.5 text-xs text-faint">{queue.length ? `${queue.length} track${queue.length === 1 ? "" : "s"}` : "Queue is clear"}</p></div>{queue.length > 0 && <button onClick={clearQueue} className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-faint hover:bg-white/5 hover:text-foreground"><Trash2 size={12} /> Clear</button>}<button onClick={() => setQueueOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-white/5 hover:text-foreground" aria-label="Close queue"><X size={14} /></button></div>
        <div className="max-h-[min(420px,52vh)] overflow-y-auto">{queue.length ? queue.map((track, index) => <motion.div layout={!reducedMotion} key={track.id} className="group flex items-center gap-3 border-b border-white/[.055] px-4 py-3 last:border-0 hover:bg-white/[.035]"><span className="w-5 text-xs tabular-nums text-faint">{String(index + 1).padStart(2, "0")}</span><TrackArtwork track={track} className="size-9" /><button onClick={() => void loadAndPlay(track)} className="min-w-0 flex-1 text-left"><strong className="block truncate text-xs font-medium">{track.title}</strong><span className="mt-0.5 block truncate text-xs text-faint">{track.artist || track.sourceName}</span></button><button onClick={() => removeFromQueue(track.id)} className="grid h-7 w-7 place-items-center rounded-md text-faint opacity-60 hover:bg-white/5 hover:text-coral group-hover:opacity-100" aria-label={`Remove ${track.title} from queue`}><X size={13} /></button></motion.div>) : <div className="px-5 py-8 text-center"><ListMusic size={20} className="mx-auto text-faint" /><p className="mt-2 text-xs text-muted-foreground">Select tracks and add them to play next.</p></div>}</div>
      </motion.aside>}
    </AnimatePresence>
    {currentTrack && <footer className="fixed inset-x-0 bottom-0 z-[80] flex h-[78px] items-center gap-3 border-t border-white/10 bg-[#101010]/98 px-2 sm:px-4 shadow-[0_-20px_50px_rgba(0,0,0,.3)] backdrop-blur-2xl sm:px-6" aria-label="Local audio player">
      <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[30%] sm:gap-3"><TrackArtwork track={currentTrack} className="size-9 sm:size-12" /><span className="min-w-0"><strong className="block truncate text-sm">{currentTrack.title}</strong><small className="mt-0.5 block truncate text-xs text-faint">{currentTrack.artist || currentTrack.sourceName}</small></span></Link>
      <div className="flex min-w-0 flex-[1.4] flex-col items-center"><div className="flex items-center gap-2"><motion.button whileTap={tap} onClick={() => void previous()} disabled={!canGoPrevious} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-25" aria-label="Previous track"><SkipBack size={16} fill="currentColor" /></motion.button><motion.button whileTap={tap} onClick={() => void toggle()} className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</motion.button><motion.button whileTap={tap} onClick={() => void next()} disabled={!queue.length} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-25" aria-label="Next track"><SkipForward size={16} fill="currentColor" /></motion.button></div><div className="mt-1.5 flex w-full max-w-md items-center gap-2 text-xs tabular-nums text-faint"><span>{clock(currentTime)}</span><input type="range" min="0" max={Math.max(duration, 1)} step="0.01" value={Math.min(currentTime, Math.max(duration, 1))} onChange={(event) => seek(Number(event.target.value))} className="h-1 min-w-0 flex-1 accent-[var(--coral)]" aria-label="Seek through track" /><span>{clock(duration)}</span></div></div>
      <div className="flex shrink-0 items-center justify-end gap-2 sm:max-w-[30%] sm:flex-1"><div className="hidden text-right sm:block"><span className="block font-mono text-[9px] text-glass">{audioQuality(currentTrack)}</span><span className="mt-0.5 block max-w-40 truncate text-xs text-faint">{error || currentTrack.sourceName}</span></div><motion.button whileTap={tap} onClick={() => setQueueOpen((open) => !open)} className={`relative grid h-9 w-9 place-items-center rounded-lg border ${queueOpen ? "border-glass/35 bg-glass/10 text-glass" : "border-white/10 text-muted-foreground hover:text-foreground"}`} aria-label={`Open queue, ${queue.length} tracks`} aria-expanded={queueOpen}><ListMusic size={15} />{queue.length > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-coral px-1 font-mono text-[8px] leading-4 text-background">{queue.length}</span>}</motion.button><Volume2 size={15} className="hidden text-faint sm:block" /></div>
    </footer>}
  </LocalPlaybackContext.Provider>;
}

export function useLocalPlayback() {
  const context = useContext(LocalPlaybackContext);
  if (!context) throw new Error("useLocalPlayback must be used inside LocalPlaybackProvider.");
  return context;
}
