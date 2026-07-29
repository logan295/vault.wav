"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FileAudio, LoaderCircle, Pause, Play, Upload } from "lucide-react";
import Link from "next/link";
import { DirectPlayer } from "@/lib/audio/direct-player";
import { uploadWav } from "@/lib/audio/upload-wav";
import { createClient } from "@/lib/supabase/client";

type LibraryTrack = {
  id: string;
  title: string;
  artist: string | null;
  original_filename: string;
  file_size: number;
  duration_secs: number | null;
  sample_rate: number | null;
  bit_depth: number | null;
  channels: number | null;
};

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatQuality(track: LibraryTrack) {
  const bits = track.bit_depth ? `${track.bit_depth}-bit` : "WAV";
  const rate = track.sample_rate ? `${track.sample_rate / 1000} kHz` : "unknown rate";
  const channels = track.channels === 2 ? "stereo" : track.channels ? `${track.channels} ch` : null;
  return [bits, rate, channels].filter(Boolean).join(" · ");
}

export function UploadWorkspace() {
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [signinSent, setSigninSent] = useState(false);
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const player = useRef<DirectPlayer | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    void fetch("/api/tracks", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setTracks(body.tracks);
      })
      .catch((error: Error) => setStatus(error.message));
  }, [userEmail]);

  useEffect(() => () => player.current?.destroy(), []);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setStatus(error.message);
    else setSigninSent(true);
  }

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus(`Reading ${file.name}…`);
    setProgress(0);
    try {
      const uploaded = await uploadWav({
        file,
        onProgress: ({ percentage }) => {
          setProgress(percentage);
          setStatus(`Uploading ${file.name}…`);
        },
      });
      const response = await fetch("/api/tracks", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setTracks(body.tracks);
      setStatus(`${uploaded.title} is ready to play.`);
      setProgress(100);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
      setProgress(null);
    } finally {
      event.target.value = "";
    }
  }

  async function toggleTrack(trackId: string) {
    try {
      if (!player.current) {
        player.current = new DirectPlayer();
        player.current.audio.addEventListener("ended", () => setPlayingId(null));
        player.current.audio.addEventListener("pause", () => setPlayingId(null));
      }
      if (playingId === trackId) {
        player.current.pause();
        return;
      }
      setStatus("Preparing private lossless stream…");
      await player.current.play(trackId);
      setPlayingId(trackId);
      setStatus("Direct playback · app DSP bypassed");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Playback failed.");
    }
  }

  if (userEmail === undefined) {
    return <main className="grid min-h-screen place-items-center bg-background text-foreground"><LoaderCircle className="animate-spin text-coral" /></main>;
  }

  if (!userEmail) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
        <form onSubmit={sendMagicLink} className="w-full max-w-md rounded-2xl border border-border bg-white/[.025] p-7">
          <FileAudio className="mb-5 text-coral" />
          <h1 className="font-display text-3xl font-bold">Open your lossless vault</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your email. Your WAV files remain private to this account.</p>
          {signinSent ? (
            <p className="mt-6 rounded-lg border border-glass/25 bg-glass/5 p-4 text-sm text-glass">Check your inbox for the sign-in link.</p>
          ) : (
            <>
              <label className="mt-6 block text-xs font-semibold" htmlFor="email">Email address</label>
              <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-coral" />
              <button className="mt-4 h-11 w-full rounded-lg bg-coral text-sm font-semibold text-background">Email me a sign-in link</button>
            </>
          )}
          {status && <p className="mt-4 text-sm text-coral">{status}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> Back to library</Link>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.2em] text-glass">Private lossless library</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Upload WAV masters</h1>
            <p className="mt-2 text-sm text-muted-foreground">Files upload directly to private storage and resume after network interruptions.</p>
          </div>
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-coral px-5 text-sm font-semibold text-background">
            <Upload size={16} /> Choose WAV
            <input className="sr-only" type="file" accept=".wav,audio/wav,audio/x-wav,audio/wave" onChange={chooseFile} />
          </label>
        </div>

        {progress !== null && progress < 100 && (
          <div className="mt-6" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-coral transition-[width]" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">{progress.toFixed(1)}% · {status}</p>
          </div>
        )}
        {status && (progress === null || progress >= 100) && <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 size={15} className="text-glass" /> {status}</p>}

        <section className="mt-10">
          <h2 className="text-sm font-semibold">Your WAVs <span className="ml-2 font-mono text-[10px] text-faint">{tracks.length}</span></h2>
          {tracks.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Choose your first WAV to test the full upload and playback path.</div>
          ) : (
            <div className="mt-4 divide-y divide-border border-y border-border">
              {tracks.map((track) => (
                <div key={track.id} className="flex items-center gap-4 py-4">
                  <button onClick={() => toggleTrack(track.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground text-background" aria-label={playingId === track.id ? `Pause ${track.title}` : `Play ${track.title}`}>
                    {playingId === track.id ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                  </button>
                  <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{track.title}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{track.artist || track.original_filename}</span></div>
                  <div className="hidden text-right sm:block"><span className="block font-mono text-[10px] text-glass">{formatQuality(track)}</span><span className="mt-1 block font-mono text-[9px] text-faint">{formatBytes(track.file_size)}</span></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
