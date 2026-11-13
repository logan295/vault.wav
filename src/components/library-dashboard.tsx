"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SpectralWaveform } from "@/components/spectral-waveform";
import { useLocalPlayback } from "@/components/local-playback-provider";
import {
  Album,
  ArrowDownToLine,
  BookOpen,
  Check,
  ChevronDown,
  Cloud,
  Disc3,
  GripVertical,
  HardDrive,
  Heart,
  Home,
  ListMusic,
  ListPlus,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Speaker,
  Upload,
  Users,
  Volume2,
  Waves,
  Wifi,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
} from "lucide-react";

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  bpm: number;
  key: string;
  duration: string;
  quality: string;
  source: "cloud" | "usb" | "both";
  color: string;
  liked?: boolean;
};

const tracks: Track[] = [
  { id: "undertow", title: "Undertow", artist: "Maravilla", album: "Night Swimming", bpm: 122, key: "8A", duration: "3:37", quality: "24 / 96", source: "both", color: "linear-gradient(145deg,#16393b,#ee604f)" , liked: true},
  { id: "soft-focus", title: "Soft Focus", artist: "K. Otonashi", album: "Glasshouse", bpm: 118, key: "7A", duration: "5:12", quality: "24 / 48", source: "cloud", color: "linear-gradient(145deg,#61574a,#c9b087)" },
  { id: "salt-lines", title: "Salt Lines", artist: "Low Tide Tapes", album: "Still Water", bpm: 126, key: "9A", duration: "4:48", quality: "24 / 96", source: "both", color: "linear-gradient(145deg,#173234,#4fd8c2)" },
  { id: "pale-blue-sun", title: "Pale Blue Sun", artist: "Rest Stops", album: "Exit Music", bpm: 110, key: "3B", duration: "6:03", quality: "16 / 44.1", source: "usb", color: "linear-gradient(145deg,#858c91,#d7c1ad)" },
  { id: "afterimage", title: "Afterimage", artist: "Glasshouse", album: "Blue Hour", bpm: 124, key: "6A", duration: "4:21", quality: "24 / 96", source: "cloud", color: "linear-gradient(145deg,#232749,#a46770)" , liked: true},
  { id: "nocturne-04", title: "Nocturne 04", artist: "Sable", album: "Room Tone", bpm: 128, key: "10A", duration: "7:16", quality: "24 / 48", source: "both", color: "linear-gradient(145deg,#1c2020,#746860)" },
];

const collections = [
  { name: "Sunday morning", count: 24, color: "#d8b88f" },
  { name: "Golden hour", count: 38, color: "#ee604f" },
  { name: "Deep & rolling", count: 61, color: "#4fd8c2" },
  { name: "USB — DJ library", count: 428, color: "#72807d" },
];

const initialSets = [
  { name: "Terrace closing", tracks: 18, range: "118–126", length: "1h 24m", ready: true },
  { name: "Warehouse warm-up", tracks: 14, range: "110–122", length: "58m", ready: false },
];

export function LibraryDashboard() {
  const { currentTrack: localTrack } = useLocalPlayback();
  const [view, setView] = useState<"home" | "playlist" | "now-playing">("home");
  const [selectedPlaylist, setSelectedPlaylist] = useState(collections[0]);
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(true);
  const [activeTrack, setActiveTrack] = useState(tracks[0]);
  const [djSets, setDjSets] = useState(initialSets);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [direct, setDirect] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [eq, setEq] = useState({ low: 0, mid: 0, high: 0, gain: 0, balance: 0 });
  const [outputName, setOutputName] = useState("Living Room");
  const [queue, setQueue] = useState<Track[]>([tracks[2], tracks[4], tracks[1]]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [trackMenu, setTrackMenu] = useState<string | null>(null);
  const [draggedTrack, setDraggedTrack] = useState<string | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const audioGraph = useRef<{ context: AudioContext; low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode; gain: GainNode; pan: StereoPannerNode } | null>(null);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [view]);

  useEffect(() => {
    if (direct) return;
    if (!audioGraph.current) {
      const context = new AudioContext();
      const low = new BiquadFilterNode(context, { type: "lowshelf", frequency: 180 });
      const mid = new BiquadFilterNode(context, { type: "peaking", frequency: 1200, Q: .8 });
      const high = new BiquadFilterNode(context, { type: "highshelf", frequency: 6500 });
      const gain = new GainNode(context);
      const pan = new StereoPannerNode(context);
      low.connect(mid).connect(high).connect(gain).connect(pan).connect(context.destination);
      audioGraph.current = { context, low, mid, high, gain, pan };
      void context.resume();
    }
    const graph = audioGraph.current;
    graph.low.gain.value = eq.low; graph.mid.gain.value = eq.mid; graph.high.gain.value = eq.high;
    graph.gain.gain.value = Math.pow(10, eq.gain / 20); graph.pan.pan.value = eq.balance / 50;
  }, [direct, eq]);

  async function chooseOutput() {
    const devices = navigator.mediaDevices as MediaDevices & { selectAudioOutput?: () => Promise<MediaDeviceInfo> };
    if (!devices?.selectAudioOutput) { setOutputName("System output"); return; }
    try {
      const device = await devices.selectAudioOutput();
      setOutputName(device.label || "Selected output");
      const context = audioGraph.current?.context as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | undefined;
      if (context?.setSinkId) await context.setSinkId(device.deviceId);
    } catch { /* User dismissed the browser's device picker. */ }
  }

  const filtered = useMemo(() => tracks.filter((track) =>
    `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  function playTrack(track: Track) {
    setActiveTrack(track); setPlaying(true); setQueue((items) => items.filter((item) => item.id !== track.id));
  }
  function playNextTrack() {
    const next = queue[0]; if (!next) return;
    setActiveTrack(next); setQueue((items) => items.slice(1)); setPlaying(true);
  }
  function enqueue(track: Track, position: "next" | "after" | "last") {
    setQueue((current) => {
      const clean = current.filter((item) => item.id !== track.id);
      if (position === "next") return [track, ...clean];
      if (position === "after") return [clean[0], track, ...clean.slice(1)].filter(Boolean) as Track[];
      return [...clean, track];
    });
    setTrackMenu(null); setQueueOpen(true);
  }
  function reorderQueue(targetId: string) {
    if (!draggedTrack || draggedTrack === targetId) return;
    setQueue((current) => {
      const from = current.findIndex((item) => item.id === draggedTrack);
      const to = current.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const result = [...current]; const [moved] = result.splice(from, 1); result.splice(to, 0, moved); return result;
    });
    setDraggedTrack(null);
  }
  function toggleTrackSelection(id: string) {
    setSelectedTracks((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function addSelectionToQueue() {
    const selected = tracks.filter((track) => selectedTracks.has(track.id));
    setQueue((current) => [...current.filter((item) => !selectedTracks.has(item.id)), ...selected]);
    setSelectedTracks(new Set()); setQueueOpen(true);
  }

  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <aside className="library-sidebar">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-[#1DB954] text-background"><Disc3 size={16} /></div>
          <span className="font-display text-[13px] font-bold tracking-tight"><span className="text-[#1DB954]">.womp</span></span>
        </div>

        <nav className="px-3" aria-label="Main navigation">
          <SidebarLink icon={<Home />} label="Home" active={view === "home"} onClick={() => setView("home")} />
          <SidebarLink icon={<Search />} label="Search" shortcut="⌘ K" />
          <SidebarLink icon={<Radio />} label="Listen now" active={view === "now-playing"} onClick={() => setView("now-playing")} />
          <div className="sidebar-label">Your music</div>
          <SidebarLink icon={<ListMusic />} label="Tracks" count="1,284" />
          <SidebarLink icon={<Album />} label="Albums" count="94" />
          <SidebarLink icon={<Users />} label="Artists" count="168" />
          <SidebarLink icon={<Heart />} label="Favorites" count="219" />
          <SidebarLink icon={<Mic2 />} label="Acapellas" count="43" />
          <SidebarLink icon={<Waves />} label="Loops & sounds" count="2,814" />
          <SidebarLink icon={<ArrowDownToLine />} label="Offline" count="86" />
          <Link href="/usb-guide" className="sidebar-link"><BookOpen size={16} /><span>USB & Rekordbox guide</span></Link>
        </nav>

        <div className="mt-5 flex items-center justify-between px-5">
          <span className="sidebar-label !m-0 !p-0">Playlists</span>
          <button className="quiet-icon" aria-label="Create playlist"><Plus size={15} /></button>
        </div>
        <div className="mt-2 px-3">
          {collections.map((item) => (
            item.name === "USB — DJ library" ? <Link key={item.name} href="/local-library" className="playlist-link" aria-label="Open USB DJ library">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: item.color }} />
              <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
              <span className="font-mono text-[10px] text-faint">{item.count}</span>
            </Link> : <button key={item.name} className={`playlist-link ${view === "playlist" && selectedPlaylist.name === item.name ? "active" : ""}`} onClick={() => { setSelectedPlaylist(item); setView("playlist"); }}>
              <span className="h-2 w-2 rounded-[2px]" style={{ background: item.color }} />
              <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
              <span className="font-mono text-[10px] text-faint">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between px-5">
          <span className="sidebar-label !m-0 !p-0">DJ sets</span>
          <button
            className="quiet-icon"
            aria-label="Create DJ set"
            onClick={() => setDjSets((sets) => [...sets, { name: `Untitled set ${sets.length + 1}`, tracks: 0, range: "—", length: "0m", ready: false }])}
          ><Plus size={15} /></button>
        </div>
        <div className="mt-2 px-3">
          {djSets.map((set) => (
            <button key={set.name} className="set-link">
              <span className="set-bars" aria-hidden><i/><i/><i/></span>
              <span className="min-w-0 flex-1 text-left"><b className="block truncate text-[11.5px] font-medium text-foreground">{set.name}</b><small className="mt-0.5 block font-mono text-[8px] uppercase tracking-wide text-faint">{set.tracks} tracks · {set.range} BPM · {set.length}</small></span>
              {set.ready && <Check size={12} className="text-glass" aria-label="Set ready"/>}
            </button>
          ))}
          <button className="create-set-button" onClick={() => setDjSets((sets) => [...sets, { name: `Untitled set ${sets.length + 1}`, tracks: 0, range: "—", length: "0m", ready: false }])}><Sparkles size={12}/> Build a new set</button>
        </div>

        <div className="mt-auto p-3">
          <Link href="/local-library" className="usb-source-card block rounded-xl border border-border bg-white/[.025] p-3.5" aria-label="Manage LOGAN USB local library">
            <div className="flex items-center gap-2 text-xs font-semibold"><HardDrive size={14} className="text-glass" /> LOGAN USB</div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] bg-glass" /></div>
            <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-wider text-faint"><span>428 tracks</span><span>Connected</span></div>
          </Link>
        </div>
      </aside>

      <main className="library-main min-w-0 pb-28">
        <header className="library-header">
          <div className="relative w-full max-w-[520px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="library-search" placeholder="Search tracks, artists, albums..." aria-label="Search your library" />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-faint">⌘ K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="device-pill" onClick={chooseOutput}><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glass opacity-40"/><span className="relative h-2 w-2 rounded-full bg-glass"/></span><Speaker size={14} /> {outputName} <ChevronDown size={13} /></button>
            <Link href="/upload" className="upload-button"><Upload size={15} /> Upload</Link>
            <button className="avatar-button" aria-label="Account menu">LG</button>
          </div>
        </header>

        <div className="mx-auto max-w-[1480px] px-5 py-8 sm:px-8 lg:px-10">
          {view === "home" && <>
          <section className="library-hero compact-hero">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-glass"><Cloud size={12} /> Personal lossless cloud</div>
              <h1 className="font-display text-[clamp(25px,3vw,42px)] font-black leading-tight tracking-[-.04em]">Good afternoon, Logan.</h1>
              <p className="mt-2 text-sm text-muted-foreground">1,284 lossless tracks across your cloud and LOGAN USB.</p>
            </div>
            <div className="sync-strip">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-glass/10 text-glass"><Check size={13}/></span>
              <div><b className="block text-xs">Everything is in sync</b><small className="text-[10px] text-faint">2.8 TB cloud · 86 offline</small></div>
            </div>
          </section>

          <section className="now-console">
            <div className="now-art" style={{background: activeTrack.color}}><span className="now-disc"/><span className="relative font-mono text-[9px] uppercase tracking-widest text-white/65">Now playing</span></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-3">
                <div><h2 className="text-xl font-semibold tracking-tight">{activeTrack.title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{activeTrack.artist} · {activeTrack.album}</p></div>
                <div className="ml-auto flex items-center gap-2"><span className="quality-chip">24-bit / 96 kHz</span><span className={`quality-chip ${direct ? "direct" : "dsp"}`}>{direct ? "Direct" : "DSP"}</span></div>
              </div>
              <div className="wave-toolbar"><span className="font-mono text-[9px] text-muted-foreground">1:23.402</span><div className="ml-auto flex items-center gap-1"><button onClick={() => setZoom(Math.max(1, zoom - .5))} aria-label="Zoom waveform out"><ZoomOut size={13}/></button><input aria-label="Waveform zoom" type="range" min="1" max="8" step=".5" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}/><button onClick={() => setZoom(Math.min(8, zoom + .5))} aria-label="Zoom waveform in"><ZoomIn size={13}/></button><span className="ml-1 w-7 font-mono text-[8px] text-faint">{zoom.toFixed(1)}×</span></div></div>
              <SpectralWaveform zoom={zoom} playing={playing}/>
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Back in rotation" action="See all" />
            <div className="release-grid">
              {tracks.slice(0, 5).map((track, index) => (
                <button key={track.title} className="release-card group text-left" onClick={() => playTrack(track)}>
                  <div className="release-art" style={{ background: track.color }}>
                    <span className="art-index">0{index + 1}</span>
                    <span className="card-play"><Play size={17} fill="currentColor" /></span>
                    <div className="art-grooves" />
                  </div>
                  <div className="mt-3 truncate text-sm font-semibold">{track.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-faint"><SourceIcon source={track.source} /> {track.artist}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <div className="flex flex-wrap items-end gap-3">
              <div><div className="font-mono text-[9px] uppercase tracking-[.2em] text-faint">All audio</div><h2 className="mt-1 text-xl font-semibold tracking-tight">Your library</h2></div>
              <div className="ml-auto flex gap-2">
                <button className="filter-button"><SlidersHorizontal size={13}/> Filter</button>
                <button className="filter-button">Recently added <ChevronDown size={12}/></button>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white/[.015]">
              <div className="track-head track-grid"><span>#</span><span>Title</span><span>Album</span><span>BPM</span><span>Key</span><span>Quality</span><span>Source</span><span className="text-right">Time</span></div>
              <TrackRows items={filtered} activeTrack={activeTrack} playing={playing} menuId={trackMenu} onPlay={playTrack} onMenu={setTrackMenu} onQueue={enqueue}/>
            </div>
          </section>
          </>}

          {view === "playlist" && <section className="playlist-view">
            <div className="playlist-cover" style={{background: `linear-gradient(145deg,${selectedPlaylist.color}44,${selectedPlaylist.color})`}}><ListMusic size={34}/></div>
            <div className="playlist-intro"><span className="font-mono uppercase tracking-[.18em] text-glass">Playlist</span><h1>{selectedPlaylist.name}</h1><p>A focused selection from your lossless library. Cloud and USB tracks stay matched wherever you listen.</p><div className="playlist-meta">{selectedPlaylist.count} tracks · 3 hr 18 min · updated today</div><div className="playlist-actions"><button className="primary-action" onClick={() => playTrack(tracks[0])}><Play size={15} fill="currentColor"/> Play</button><button className="filter-button" onClick={() => tracks.forEach((track) => enqueue(track, "last"))}><ListPlus size={14}/> Add all to queue</button></div></div>
            <div className="selection-toolbar" aria-live="polite">
              <label className="select-all"><input type="checkbox" checked={selectedTracks.size === tracks.length} onChange={() => setSelectedTracks(selectedTracks.size === tracks.length ? new Set() : new Set(tracks.map((track) => track.id)))}/><span>{selectedTracks.size ? `${selectedTracks.size} selected` : "Select tracks"}</span></label>
              {selectedTracks.size > 0 && <><button className="primary-action" onClick={addSelectionToQueue}><ListPlus size={14}/> Add selected to queue</button><button className="filter-button" onClick={()=>setSelectedTracks(new Set())}>Clear</button></>}
            </div>
            <div className="playlist-table"><div className="track-head track-grid"><span>Select</span><span>Title</span><span>Album</span><span>BPM</span><span>Key</span><span>Quality</span><span>Source</span><span className="text-right">Time</span></div><TrackRows items={tracks} activeTrack={activeTrack} playing={playing} menuId={trackMenu} onPlay={playTrack} onMenu={setTrackMenu} onQueue={enqueue} selectable selectedIds={selectedTracks} onSelect={toggleTrackSelection}/></div>
          </section>}

          {view === "now-playing" && <section className="now-playing-view">
            <div className="now-playing-stage">
              <div className="large-art" style={{background: activeTrack.color}}><span className="now-disc"/></div>
              <div className="now-playing-copy"><span className="font-mono uppercase tracking-[.18em] text-glass">Now playing · lossless</span><h1>{activeTrack.title}</h1><p>{activeTrack.artist} · {activeTrack.album}</p><div className="now-stats"><span>{activeTrack.bpm} BPM</span><span>{activeTrack.key}</span><span>{activeTrack.quality} kHz</span><span>{activeTrack.source === "both" ? "Cloud + USB" : activeTrack.source}</span></div><div className="now-controls"><button><SkipBack size={18} fill="currentColor"/></button><button className="hero-play" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor"/>}</button><button onClick={playNextTrack}><SkipForward size={18} fill="currentColor"/></button></div></div>
            </div>
            <div className="expanded-wave"><div className="wave-toolbar"><span>1:23.402 / {activeTrack.duration}</span><div className="ml-auto flex items-center gap-1"><button onClick={() => setZoom(Math.max(1,zoom-.5))}><ZoomOut size={14}/></button><input type="range" min="1" max="8" step=".5" value={zoom} onChange={(e)=>setZoom(Number(e.target.value))}/><button onClick={() => setZoom(Math.min(8,zoom+.5))}><ZoomIn size={14}/></button><span>{zoom.toFixed(1)}×</span></div></div><SpectralWaveform zoom={zoom} playing={playing}/></div>
            <QueuePanel queue={queue} draggedTrack={draggedTrack} onDrag={setDraggedTrack} onDrop={reorderQueue} onPlay={playTrack} onRemove={(id)=>setQueue((items)=>items.filter((item)=>item.id!==id))}/>
          </section>}
        </div>
      </main>

      {queueOpen && view !== "now-playing" && <aside className="queue-drawer" aria-label="Play queue"><div className="queue-drawer-head"><div><span className="font-mono uppercase tracking-[.16em] text-glass">Up next</span><h2>Queue</h2></div><button className="quiet-icon" onClick={()=>setQueueOpen(false)}><X size={16}/></button></div><QueuePanel queue={queue} draggedTrack={draggedTrack} onDrag={setDraggedTrack} onDrop={reorderQueue} onPlay={playTrack} onRemove={(id)=>setQueue((items)=>items.filter((item)=>item.id!==id))}/></aside>}

      {!localTrack && mixerOpen && <section className="mixer-drawer" aria-label="Audio mixer">
        <div className="mixer-heading"><div><span className="font-mono text-[9px] uppercase tracking-[.18em] text-glass">Output processing</span><h2 className="mt-1 text-base font-semibold">Living Room mixer</h2></div><div className="ml-auto flex items-center gap-2"><button className={`mode-toggle ${direct ? "active" : ""}`} onClick={() => setDirect(true)}>Direct</button><button className={`mode-toggle ${!direct ? "active" : ""}`} onClick={() => setDirect(false)}>DSP</button><button className="quiet-icon" aria-label="Close mixer" onClick={() => setMixerOpen(false)}><X size={16}/></button></div></div>
        <div className="mixer-grid">
          <div className="meters"><div><i/><i/><i/><i/><i/><i/><i/><i/></div><div><i/><i/><i/><i/><i/><i/><i/></div><span>L</span><span>R</span></div>
          {(["low","mid","high","gain"] as const).map((band) => <MixerControl key={band} label={band} value={eq[band]} disabled={direct} onChange={(value) => {setDirect(false);setEq({...eq,[band]:value})}}/>)}
          <div className="balance-control"><label>Balance</label><input type="range" min="-50" max="50" value={eq.balance} disabled={direct} onChange={(e)=>{setDirect(false);setEq({...eq,balance:Number(e.target.value)})}}/><span>{eq.balance === 0 ? "Center" : eq.balance < 0 ? `${Math.abs(eq.balance)} L` : `${eq.balance} R`}</span></div>
          <button className="reset-mixer" disabled={direct} onClick={()=>setEq({low:0,mid:0,high:0,gain:0,balance:0})}><RotateCcw size={13}/> Reset</button>
        </div>
        {direct && <div className="direct-note"><Check size={13}/> Direct mode bypasses EQ and gain for an untouched signal path.</div>}
      </section>}
      {!localTrack && <footer className={`player-bar ${mixerOpen ? "mixer-is-open" : ""}`}>
        <div className="flex min-w-0 items-center gap-3 lg:w-[28%]"><div className="h-12 w-12 flex-none rounded-[5px]" style={{background: activeTrack.color}}/><div className="min-w-0"><div className="truncate text-sm font-semibold">{activeTrack.title}</div><div className="truncate text-xs text-faint">{activeTrack.artist}</div></div><Heart size={15} className="ml-2 text-faint"/><button className="mobile-mixer-button" aria-label="Open mixer" onClick={()=>setMixerOpen(true)}><SlidersHorizontal size={14}/></button></div>
        <div className="player-center"><div className="flex items-center justify-center gap-5"><Shuffle size={14} className="text-faint"/><SkipBack size={17} fill="currentColor"/><button onClick={() => setPlaying(!playing)} className="main-play" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button><button onClick={playNextTrack}><SkipForward size={17} fill="currentColor"/></button><span className="font-mono text-[9px] text-glass">LOSSLESS</span></div><div className="mt-2 flex items-center gap-2 font-mono text-[9px] text-faint"><span>1:23</span><div className="play-progress"><div className="w-[38%]"/></div><span>{activeTrack.duration}</span></div></div>
        <div className="hidden items-center justify-end gap-3 lg:flex lg:w-[28%]"><button className={`mixer-button ${queueOpen ? "active" : ""}`} onClick={()=>{setQueueOpen(!queueOpen);setMixerOpen(false)}}><ListMusic size={13}/>Queue <span>{queue.length}</span></button><button className="mixer-button" onClick={()=>{setMixerOpen(!mixerOpen);setQueueOpen(false)}}><SlidersHorizontal size={13}/>{mixerOpen ? "Hide mixer" : "Mixer"}</button><button className="device-output" onClick={chooseOutput}><Wifi size={13} className="text-glass"/><span>{outputName}</span></button><Volume2 size={15}/><div className="h-1 w-20 overflow-hidden rounded bg-white/10"><div className="h-full w-[70%] bg-foreground"/></div></div>
      </footer>}
    </div>
  );
}

function SidebarLink({ icon, label, count, shortcut, active, onClick }: { icon: React.ReactNode; label: string; count?: string; shortcut?: string; active?: boolean; onClick?: () => void }) {
  return <button className={`sidebar-link ${active ? "active" : ""}`} onClick={onClick}><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span><span>{label}</span>{count && <span className="ml-auto font-mono text-[9px] text-faint">{count}</span>}{shortcut && <span className="ml-auto font-mono text-[9px] text-faint">{shortcut}</span>}</button>;
}
function TrackRows({items,activeTrack,playing,menuId,onPlay,onMenu,onQueue,selectable=false,selectedIds=new Set(),onSelect}:{items:Track[];activeTrack:Track;playing:boolean;menuId:string|null;onPlay:(track:Track)=>void;onMenu:(id:string|null)=>void;onQueue:(track:Track,position:"next"|"after"|"last")=>void;selectable?:boolean;selectedIds?:Set<string>;onSelect?:(id:string)=>void}) {
  return items.map((track,index)=><div key={track.id} className={`track-row track-grid ${activeTrack.id===track.id?"is-active":""}`} onDoubleClick={()=>onPlay(track)}>
    <span className="row-number">{selectable?<input className="track-checkbox" type="checkbox" aria-label={`Select ${track.title}`} checked={selectedIds.has(track.id)} onChange={()=>onSelect?.(track.id)} onDoubleClick={(event)=>event.stopPropagation()}/>:activeTrack.id===track.id&&playing?<Volume2 size={13}/>:index+1}</span>
    <span className="flex min-w-0 items-center gap-3"><span className="h-9 w-9 flex-none rounded-[4px]" style={{background:track.color}}/><span className="min-w-0"><b className="block truncate text-foreground">{track.title}</b><small className="block truncate text-faint">{track.artist}</small></span></span>
    <span className="truncate">{track.album}</span><span className="font-mono">{track.bpm}</span><span className="key-chip">{track.key}</span><span className="font-mono">{track.quality}</span><span><SourceBadge source={track.source}/></span>
    <span className="relative flex items-center justify-end gap-3 font-mono"><Heart size={13} className={track.liked?"fill-coral text-coral":"text-faint"}/>{track.duration}<button className="row-menu-button" aria-label={`Queue actions for ${track.title}`} onClick={()=>onMenu(menuId===track.id?null:track.id)}><MoreHorizontal size={15}/></button>{menuId===track.id&&<div className="track-menu" onClick={(e)=>e.stopPropagation()}><button onClick={()=>onQueue(track,"next")}><Play size={12}/>Play next</button><button onClick={()=>onQueue(track,"after")}><ListPlus size={12}/>Play after</button><button onClick={()=>onQueue(track,"last")}><ListMusic size={12}/>Play last</button></div>}</span>
  </div>);
}
function QueuePanel({queue,draggedTrack,onDrag,onDrop,onPlay,onRemove}:{queue:Track[];draggedTrack:string|null;onDrag:(id:string|null)=>void;onDrop:(id:string)=>void;onPlay:(track:Track)=>void;onRemove:(id:string)=>void}) {
  return <div className="queue-panel">{queue.length===0?<div className="empty-queue"><ListMusic size={22}/><b>Your queue is clear</b><span>Add a track with its ••• menu.</span></div>:queue.map((track,index)=><div key={track.id} className={`queue-row ${draggedTrack===track.id?"dragging":""}`} draggable onDragStart={()=>onDrag(track.id)} onDragEnd={()=>onDrag(null)} onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDrop(track.id)}>
    <GripVertical size={14} className="queue-grip"/><button className="queue-track" onDoubleClick={()=>onPlay(track)}><span className="queue-index">{index+1}</span><span className="queue-art" style={{background:track.color}}/><span className="min-w-0"><b>{track.title}</b><small>{track.artist} · {track.bpm} BPM · {track.key}</small></span></button><span className="queue-duration">{track.duration}</span><button className="quiet-icon" aria-label={`Remove ${track.title} from queue`} onClick={()=>onRemove(track.id)}><X size={13}/></button>
  </div>)}</div>;
}
function SectionHeader({ title, action }: { title: string; action: string }) { return <div className="mb-4 flex items-center"><h2 className="text-lg font-semibold tracking-tight">{title}</h2><button className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground">{action}</button></div> }
function SourceIcon({ source }: { source: Track["source"] }) { return source === "usb" ? <HardDrive size={11}/> : source === "cloud" ? <Cloud size={11}/> : <><Cloud size={11}/><span className="text-glass">+</span><HardDrive size={11}/></> }
function SourceBadge({ source }: { source: Track["source"] }) { const label = source === "both" ? "Cloud + USB" : source === "cloud" ? "Cloud" : "USB"; return <span className={`source-badge ${source}`}><SourceIcon source={source}/>{label}</span> }
function MixerControl({label,value,disabled,onChange}:{label:string;value:number;disabled:boolean;onChange:(value:number)=>void}) { return <label className={`mixer-control ${disabled ? "disabled" : ""}`}><span>{label}</span><div className="knob" style={{"--knob":`${value * 2.7}deg`} as React.CSSProperties}><i/></div><input aria-label={`${label} level`} type="range" min="-12" max="12" step="1" value={value} disabled={disabled} onChange={(e)=>onChange(Number(e.target.value))}/><b>{value > 0 ? "+" : ""}{value} dB</b></label> }
