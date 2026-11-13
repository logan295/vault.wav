"use client";

import Image from "next/image";
import { memo, useState } from "react";
import type { LocalTrack } from "@/lib/local-audio/types";

const palettes = [
  ["#485e58", "#1b2925"], ["#465568", "#1c2533"],
  ["#625166", "#2b202f"], ["#6c5d49", "#30291f"],
  ["#52684d", "#222e20"], ["#68504e", "#30201f"],
];
function EmbeddedCover({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? null : <Image unoptimized loading="lazy" decoding="async" src={src} alt="" fill sizes="200px"
    className="object-cover" onError={() => setFailed(true)} />;
}
export const TrackArtwork = memo(function TrackArtwork({ track, className = "" }: { track: LocalTrack; className?: string }) {
  const hash = Array.from(track.album || track.artist || track.id).reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) | 0, 0);
  const [first, second] = palettes[Math.abs(hash) % palettes.length];
  const src = `/api/local/tracks/${encodeURIComponent(track.id)}/artwork?v=${encodeURIComponent(track.artworkVersion || String(track.modifiedAtMs ?? 0))}`;
  return <span aria-hidden="true" className={`record-art relative isolate grid shrink-0 place-items-center overflow-hidden rounded-[4px] ${className}`}
    style={{ background: `linear-gradient(145deg, ${first}, ${second})` }}>
    <span className="record-disc"><span className="record-label" style={{ background: first }}><i /></span></span>
    {track.available && track.hasArtwork === true && <EmbeddedCover key={src} src={src} />}
  </span>;
});
