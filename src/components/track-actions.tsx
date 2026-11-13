"use client";
import { ArrowRight, CirclePlus, Info, ListEnd, ListMusic, MoreHorizontal, Play, Trash2, UserRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { LocalPlaylist, LocalTrack } from "@/lib/local-audio/types";

type Props = { track: LocalTrack; playlists: LocalPlaylist[]; inPlaylist: boolean; onPlay: () => void; onQueue: () => void; onNext: () => void; onAdd: (id: string) => void; onRemove: () => void; onInfo: () => void; onArtist: () => void };
export function TrackActions({ track, playlists, inPlaylist, onPlay, onQueue, onNext, onAdd, onRemove, onInfo, onArtist }: Props) {
  return <DropdownMenu><DropdownMenuTrigger aria-label={`Options for ${track.title}`} className="track-more grid size-9 place-items-center rounded-full text-[#b3b3b3] hover:bg-white/10 hover:text-white focus-visible:opacity-100"><MoreHorizontal size={21} strokeWidth={1.7} /></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-56 rounded-md bg-[#282828] p-1.5 shadow-2xl [&_[role=menuitem]]:min-h-10 [&_[role=menuitem]]:gap-3 [&_[role=menuitem]]:px-3">
    <DropdownMenuItem disabled={!track.available} onClick={onPlay}><Play /> Play / pause</DropdownMenuItem>
    <DropdownMenuItem disabled={!track.available} onClick={onNext}><ListMusic /> Play next</DropdownMenuItem>
    <DropdownMenuItem disabled={!track.available} onClick={onQueue}><ListEnd /> Add to queue</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuSub><DropdownMenuSubTrigger className="min-h-10 gap-3 px-3"><CirclePlus /> Add to playlist</DropdownMenuSubTrigger><DropdownMenuSubContent className="min-w-48 bg-[#282828] p-1.5">{playlists.length ? playlists.map(playlist => <DropdownMenuItem key={playlist.id} disabled={playlist.trackIds.includes(track.id) || playlist.usbConnected === false} onClick={() => onAdd(playlist.id)}>{playlist.name}</DropdownMenuItem>) : <DropdownMenuItem disabled>Create a playlist first</DropdownMenuItem>}</DropdownMenuSubContent></DropdownMenuSub>
    {track.artist && <DropdownMenuItem onClick={onArtist}><UserRound /> Go to artist <ArrowRight className="ml-auto" /></DropdownMenuItem>}
    <DropdownMenuItem onClick={onInfo}><Info /> Track information</DropdownMenuItem>
    {inPlaylist && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={onRemove}><Trash2 /> Remove from this playlist</DropdownMenuItem></>}
  </DropdownMenuContent></DropdownMenu>;
}
