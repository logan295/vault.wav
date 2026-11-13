"use client";
import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { chooseDeck,liveIdentity,matchTrack,type LiveState } from "@/lib/live-sync/transport";
import type { LocalTrack } from "@/lib/local-audio/types";
import type { PlaybackSample } from "./local-playback-provider";
export function useLiveShow() {
 const [enabled,setEnabled]=useState(false),[deckMode,setDeckMode]=useState("auto"),[state,setState]=useState<LiveState|null>(null),[now,setNow]=useState(0),[offline,setOffline]=useState(false);
 const [tracks,setTracks]=useState<LocalTrack[]>([]),[mapping,setMapping]=useState<{identity:string;id:string}|null>(null);
 useEffect(()=>{if(!enabled)return;let active=true;void fetch('/api/local/tracks').then(r=>r.json()).then(data=>{if(active&&Array.isArray(data.tracks))setTracks(data.tracks);}).catch(()=>undefined);return()=>{active=false;};},[enabled]);
 useEffect(()=>{if(!enabled)return;const events=new EventSource('/api/local/live-sync?stream=1');events.onmessage=event=>{try{const value=JSON.parse(event.data);if(value.version===1&&Array.isArray(value.decks)){setState(value);setOffline(false);}}catch{}};events.onerror=()=>setOffline(true);const timer=setInterval(()=>setNow(Date.now()),100);return()=>{events.close();clearInterval(timer);};},[enabled]);
 const deck=chooseDeck(state?.decks??[],deckMode,null);
 const identity=liveIdentity(deck);
 const track=useMemo(()=>mapping?.identity===identity?tracks.find(t=>t.id===mapping.id)??null:matchTrack(deck,tracks),[deck,tracks,mapping,identity]);
 const stale=!state||offline||now-(deck?.receivedAt??state.receivedAt)>1500||!!state.errors.length;
 const latest=useRef({deck,stale});
 useEffect(()=>{latest.current={deck,stale};},[deck,stale]);
 const samplePlayback=useCallback(():PlaybackSample=>{const {deck,stale}=latest.current;return {time:deck?.time??0,sampledAt:deck?.receivedAt??Date.now(),advancing:!!deck?.playing&&!stale,rate:deck?.rate&&deck.rate>0?deck.rate:1};},[]);
 const originalBpm=track?.rekordbox?.bpm||track?.bpm||(deck?.bpm?(deck.rate>0?deck.bpm/deck.rate:deck.bpm):120);
 const liveBeatOffset=deck?.beatAnchorTime!=null&&deck?.beatAnchor ? ((deck.beatAnchorTime-(deck.beatAnchor-1)*60/originalBpm)%(240/originalBpm)+240/originalBpm)%(240/originalBpm) : 0;
 return {liveBeatOffset,enabled,setEnabled,deckMode,setDeckMode,deck,track,tracks,state,stale,offline,originalBpm,samplePlayback,time:deck?.time??0,duration:deck?.duration||track?.durationSecs||0,playing:!!deck?.playing&&!stale,mapTrack:(id:string)=>setMapping(id?{identity,id}:null)};
}
