"use client";
import Image from "next/image";
import { ListMusic } from "lucide-react";
import type { LocalPlaylist } from "@/lib/local-audio/types";
export function playlistCoverUrl(playlist: LocalPlaylist) { return `/api/local/playlists/${playlist.id}/cover?v=${playlist.coverId || "none"}`; }
export function PlaylistArtwork({ playlist, className = "" }: { playlist: LocalPlaylist; className?: string }) {
  return <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-md ${className}`} style={{ background: `linear-gradient(135deg, ${playlist.coverColor || "#386b4b"}, #14261b)` }}>{playlist.coverId ? <Image unoptimized src={playlistCoverUrl(playlist)} alt="" fill sizes="240px" className="object-cover" /> : <ListMusic className="h-[42%] w-[42%] text-white/85" strokeWidth={1.35} />}</span>;
}
