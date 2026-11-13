"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Save, Upload, ListMusic, ChevronDown } from "lucide-react";
import type { LocalTrack, LocalPlaylist } from "@/lib/local-audio/types";
import { TrackArtwork } from "@/components/track-artwork";
import { VirtualTrackList } from "@/components/virtual-track-list";
import { ResizeHandle } from "./resize-handle";
function initial(key: string, fallback: number, min: number, max: number) {
  try {
    const v = Number(localStorage.getItem(key));
    return v ? Math.min(max, Math.max(min, v)) : fallback;
  } catch {
    return fallback;
  }
}
export function PerformanceBrowser({
  tracks,
  selected,
  load,
  save,
  recall,
  saved,
}: {
  tracks: LocalTrack[];
  selected: number;
  load: (index: number, id: string) => void;
  save: () => void;
  recall: () => void;
  saved: boolean;
}) {
  const [query, setQuery] = useState(""),
    [playlists, setPlaylists] = useState<LocalPlaylist[]>([]),
    [playlist, setPlaylist] = useState("all"),
    [open, setOpen] = useState(true);
  const [width, setWidth] = useState(() =>
      initial("womp-dj-sidebar", 175, 120, 360),
    ),
    [height, setHeight] = useState(() =>
      initial("womp-dj-browser-height", 250, 150, 650),
    );
  const [browseIndex,setBrowseIndex]=useState(0);
  const browserRef = useRef<HTMLElement>(null);
  const [maxHeight, setMaxHeight] = useState(650);
  useEffect(() => {
    const parent = browserRef.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() =>
      setMaxHeight(
        Math.max(
          150,
          Math.min(
            650,
            parent.clientHeight - Math.min(560, parent.clientHeight * (parent.clientHeight < 650 ? 0.78 : 0.64)),
          ),
        ),
      ),
    );
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  const effectiveHeight = Math.min(height, maxHeight);
  useEffect(() => {
    void fetch("/api/local/playlists")
      .then((r) => r.json())
      .then((v) => setPlaylists(v.playlists || []))
      .catch(() => {});
  }, []);
  const active = playlists.find((p) => p.id === playlist);
  const source = active
    ? active.trackIds
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is LocalTrack => !!t)
    : tracks;
  const filtered = source.filter((t) =>
    `${t.title} ${t.artist || ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const controllerRef=useRef({filtered,load,browseIndex});
  useEffect(()=>{controllerRef.current={filtered,load,browseIndex};},[filtered,load,browseIndex]);
  useEffect(()=>{
    const handle=(event:Event)=>{
      const {delta,deck}=(event as CustomEvent<{delta:number;deck?:number}>).detail;
      const current=controllerRef.current;
      const index=Math.max(0,Math.min(current.filtered.length-1,current.browseIndex+delta));
      controllerRef.current.browseIndex=index;setBrowseIndex(index);
      if(deck!==undefined&&current.filtered[index])current.load(deck,current.filtered[index].id);
    };
    window.addEventListener('womp-controller-browser',handle);
    return()=>window.removeEventListener('womp-controller-browser',handle);
  },[]);
  return (
    <section
      ref={browserRef}
      className="perform-browser dj-browser"
      style={{ height: effectiveHeight }}
    >
      <ResizeHandle
        axis="y"
        label="Browser height"
        direction={-1}
        value={effectiveHeight}
        min={150}
        max={maxHeight}
        onChange={(value) => {
          setHeight(value);
          localStorage.setItem("womp-dj-browser-height", String(value));
        }}
      />
      <header>
        <div>
          <h2>{active?.name || "Collection"}</h2>
          <span>
            {filtered.length} tracks · Load into Deck {selected + 1}
          </span>
        </div>
        <label>
          <Search size={14} />
          <input
            aria-label="Search performance library"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks or artists"
          />
        </label>
        <button onClick={save}>
          <Save size={14} />
          {saved ? "Save State again" : "Save State"}
        </button>
        <button onClick={recall}>
          <Upload size={14} /> Recall State
        </button>
      </header>
      <div className="dj-browser-body">
        <aside style={{ width }}>
          <button
            className={playlist === "all" ? "active" : ""}
            onClick={() => setPlaylist("all")}
          >
            <ListMusic size={14} /> Collection <small>{tracks.length}</small>
          </button>
          <button aria-expanded={open} onClick={() => setOpen(!open)}>
            <ChevronDown
              size={14}
              style={{ transform: open ? "" : "rotate(-90deg)" }}
            />{" "}
            Playlists <small>{playlists.length}</small>
          </button>
          {open &&
            playlists.map((p) => (
              <button
                key={p.id}
                className={playlist === p.id ? "active" : ""}
                onClick={() => setPlaylist(p.id)}
              >
                <span>{p.name}</span>
                <small>{p.trackIds.length}</small>
              </button>
            ))}
        </aside>
        <ResizeHandle
          axis="x"
          label="Playlist sidebar width"
          value={width}
          min={120}
          max={360}
          onChange={(value) => {
            setWidth(value);
            localStorage.setItem("womp-dj-sidebar", String(value));
          }}
        />
        <div className="dj-track-table">
          <div className="dj-track-head">
            <span>#</span>
            <span>Title / Artist</span>
            <span>BPM</span>
            <span>Key</span>
            <span>Time</span>
            <span />
          </div>
          <VirtualTrackList
            count={filtered.length}
            rowHeight={34}
            activeIndex={Math.min(browseIndex,filtered.length-1)}
            renderRow={(index) => {
              const track = filtered[index];
              return (
                <div
                  className={`perform-library-row ${index===browseIndex ? "controller-selected" : ""}`}
                  onClick={()=>setBrowseIndex(index)}
                  draggable={track.available}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/x-womp-track",
                      track.id,
                    );
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onDoubleClick={() => load(selected, track.id)}
                >
                  <span className="dj-row-number">{index + 1}</span>
                  <div className="dj-track-name">
                    <TrackArtwork track={track} className="size-6" />
                    <div>
                      <b>{track.title}</b>
                      <span>{track.artist || track.sourceName}</span>
                    </div>
                  </div>
                  <span>{track.bpm || "—"}</span>
                  <span>{track.musicalKey || "—"}</span>
                  <span>
                    {Math.floor((track.durationSecs || 0) / 60)}:
                    {String(
                      Math.floor((track.durationSecs || 0) % 60),
                    ).padStart(2, "0")}
                  </span>
                  <button
                    aria-label={`Load ${track.title} into deck ${selected + 1}`}
                    disabled={!track.available}
                    onClick={() => load(selected, track.id)}
                  >
                    Load {selected + 1}
                  </button>
                </div>
              );
            }}
          />
          {!filtered.length && (
            <p className="dj-empty">
              {active
                ? "No tracks in this playlist. Add tracks from the main library."
                : "No matching tracks."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
