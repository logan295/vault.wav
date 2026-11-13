import type { LocalTrack } from "@/lib/local-audio/types";
export type LiveDeck={number:number;time:number;duration:number;state:number;playing:boolean;rate:number;bpm:number;beat:number;trackId:number;title:string;artist:string;master:boolean;onAir:number|null;receivedAt:number;beatAnchorTime?:number|null;beatAnchor?:number|null};
export type LiveState={version:number;protocol:string;receivedAt:number;packets:number;errors:string[];decks:LiveDeck[];generatedAt:number};
export function chooseDeck(decks:LiveDeck[],mode:string,previous:number|null) {
 const available=decks.filter(d=>d.trackId||d.title||d.duration>0);
 if(mode!=="auto")return available.find(d=>d.number===Number(mode))??null;
 return available.find(d=>d.master&&d.playing)??available.filter(d=>d.playing&&(d.onAir??0)>0).sort((a,b)=>(b.onAir??0)-(a.onAir??0))[0]??available.find(d=>d.number===previous&&d.playing)??available.find(d=>d.playing)??available.find(d=>d.master)??available.find(d=>d.number===previous)??available[0]??null;
}
const normalize=(text:string)=>text.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
export function matchTrack(deck:LiveDeck|null,tracks:LocalTrack[]) {
 if(!deck?.title)return null;
 const candidates=tracks.filter(track=>normalize(track.title)===normalize(deck.title)&&(!deck.artist||normalize(track.artist??"")===normalize(deck.artist))&&(!deck.duration||!track.durationSecs||Math.abs(track.durationSecs-deck.duration)<2));
 return candidates.length===1?candidates[0]:null;
}
export function liveIdentity(deck:LiveDeck|null){return deck?`${deck.number}:${deck.trackId}:${deck.title}:${deck.artist}:${Math.round(deck.duration)}`:"";}
