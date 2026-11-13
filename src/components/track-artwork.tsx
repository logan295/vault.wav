"use client";

import Image from "next/image";
import { Disc3 } from "lucide-react";
import { useState } from "react";
import type { LocalTrack } from "@/lib/local-audio/types";

const palettes = [
  ["#ea634c", "#512e42"], ["#3a978f", "#192e3d"],
  ["#8c73ca", "#36304f"], ["#c78a46", "#5d3434"],
];

function EmbeddedCover({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? null : <Image unoptimized src={src} alt="" fill sizes="(max-width: 640px) 160px, 200px"
    className="object-cover" onError={() => setFailed(true)} />;
}

export function TrackArtwork({ track, className = "" }: { track: LocalTrack; className?: string }) {
  const hash = Array.from(track.id).reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) | 0, 0);
  const [first, second] = palettes[Math.abs(hash) % palettes.length];
  const src = `/api/local/tracks/${encodeURIComponent(track.id)}/artwork?v=${track.modifiedAtMs ?? 0}`;

  return <span aria-hidden="true" className={`relative isolate grid shrink-0 place-items-center overflow-hidden rounded-md ${className}`}
    style={{ background: `linear-gradient(145deg, ${first}, ${second})` }}>
    <Disc3 className="h-[43%] w-[43%] text-white/75" strokeWidth={1.35} />
    {track.available && track.hasArtwork !== false && <EmbeddedCover key={src} src={src} />}
  </span>;
}
