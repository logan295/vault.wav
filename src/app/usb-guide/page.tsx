import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Disc3, Eye, FileAudio, HardDrive, LockKeyhole, MapPin, Music2, RefreshCw, Usb, Waves } from "lucide-react";

const formats = [
  { name: "WAV", note: "Lossless PCM audio" },
  { name: "AIFF / AIF", note: "Lossless PCM audio" },
  { name: "FLAC", note: "Lossless compressed audio" },
  { name: "MP3", note: "Compressed audio" },
  { name: "M4A / AAC", note: "Compressed audio" },
];

const rekordboxData = [
  "Track title, artist, album, duration, and Rekordbox track ID",
  "BPM, musical key, beatgrid count, and first-beat position",
  "Hot Cues, Memory Cues, and saved loop boundaries",
  "Rekordbox playlist membership",
  "The matching analysis-file path for each exported track",
];

function Sidebar() {
  return <aside className="fixed inset-y-0 left-0 z-30 flex w-[230px] flex-col border-r border-border bg-[#070b0c] max-[760px]:hidden">
    <Link href="/" className="flex h-16 items-center gap-2.5 px-5"><span className="grid h-7 w-7 place-items-center rounded-full bg-coral text-background"><Disc3 size={16} /></span><b className="font-display text-sm">vault<span className="text-coral">.wav</span></b></Link>
    <nav className="px-3" aria-label="USB navigation">
      <Link href="/" className="sidebar-link"><HardDrive size={16} /><span>All USB tracks</span></Link>
      <Link href="/local-library" className="sidebar-link"><Usb size={16} /><span>Manage USBs</span></Link>
      <Link href="/usb-guide" aria-current="page" className="sidebar-link active"><BookOpen size={16} /><span>USB & Rekordbox guide</span></Link>
    </nav>
    <div className="mx-5 mt-auto mb-6 rounded-lg border border-glass/15 bg-glass/[.04] p-3"><p className="font-mono text-xs uppercase tracking-[.15em] text-glass">Read-only by default</p><p className="mt-2 text-sm leading-5 text-muted-foreground">Vault reads your exported USB library without changing its files or Rekordbox database.</p></div>
  </aside>;
}

export default function UsbGuidePage() {
  return <div className="min-h-screen bg-background text-foreground">
    <Sidebar />
    <main className="ml-[230px] px-6 py-8 max-[760px]:ml-0 sm:px-10 xl:px-14">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground min-[761px]:hidden"><ArrowLeft size={14} /> Back to library</Link>
        <header className="mt-5 border-b border-border pb-8 min-[761px]:mt-0">
          <p className="font-mono text-xs uppercase tracking-[.2em] text-glass">USB compatibility</p>
          <h1 className="mt-2 max-w-3xl font-display text-[clamp(34px,5vw,58px)] font-bold leading-[.98] tracking-[-.04em]">What Vault reads from your DJ USB</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground">A reference for supported audio files, imported Rekordbox information, and the boundaries of the current read-only workflow.</p>
        </header>

        <section className="grid gap-4 py-8 md:grid-cols-3" aria-label="USB workflow summary">
          {[{ icon: Usb, label: "Connect", copy: "Mount the exported USB on this Mac." }, { icon: RefreshCw, label: "Scan", copy: "Vault matches audio files to Rekordbox records." }, { icon: Eye, label: "View", copy: "Browse and play without modifying the drive." }].map(({ icon: Icon, label, copy }) => <div key={label} className="rounded-xl border border-border bg-white/[.018] p-5"><Icon size={18} className="text-coral" /><h2 className="mt-4 text-sm font-semibold">{label}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{copy}</p></div>)}
        </section>

        <section className="border-t border-border py-9">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><div><FileAudio size={20} className="text-glass" /><h2 className="mt-4 text-2xl font-semibold">Accepted audio files</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Vault ignores macOS resource-fork files and scans the playable audio already stored on the selected drive.</p></div><div className="overflow-hidden rounded-xl border border-border">{formats.map((format) => <div key={format.name} className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0"><span className="font-mono text-xs font-semibold text-foreground">{format.name}</span><span className="text-xs text-muted-foreground">{format.note}</span></div>)}</div></div>
        </section>

        <section className="border-t border-border py-9">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><div><Waves size={20} className="text-glass" /><h2 className="mt-4 text-2xl font-semibold">Rekordbox information</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Vault reads the legacy Device Library export and its matching analysis files when they are present.</p></div><ul className="space-y-3">{rekordboxData.map((item) => <li key={item} className="flex gap-3 rounded-lg border border-border bg-white/[.012] px-4 py-3 text-sm leading-6 text-muted-foreground"><Check size={15} className="mt-1 shrink-0 text-glass" /><span>{item}</span></li>)}</ul></div>
        </section>

        <section className="grid gap-4 border-t border-border py-9 md:grid-cols-2">
          <div className="rounded-xl border border-border p-6"><LockKeyhole size={19} className="text-coral" /><h2 className="mt-4 text-lg font-semibold">What Vault does not change</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Scanning never edits the audio, cue points, beatgrids, playlists, analysis files, or Rekordbox database on the USB. Rekordbox write-back is not enabled.</p></div>
          <div className="rounded-xl border border-border p-6"><MapPin size={19} className="text-coral" /><h2 className="mt-4 text-lg font-semibold">Current limitations</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Tracks not referenced by the detected Device Library appear as audio-only. Streaming-service downloads and protected files are not extracted or redistributed.</p></div>
        </section>

        <section className="mb-8 flex flex-wrap items-center justify-between gap-5 rounded-xl border border-glass/20 bg-glass/[.045] p-6"><div><div className="flex items-center gap-2"><Music2 size={17} className="text-glass" /><h2 className="text-base font-semibold">Ready to inspect a drive?</h2></div><p className="mt-2 text-sm text-muted-foreground">Connect it first, then choose the volumes Vault should scan.</p></div><Link href="/local-library" className="inline-flex h-10 items-center gap-2 rounded-lg bg-coral px-4 text-xs font-semibold text-background"><Usb size={14} /> Manage USBs</Link></section>
      </div>
    </main>
  </div>;
}
