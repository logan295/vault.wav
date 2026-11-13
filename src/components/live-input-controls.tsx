"use client";
import { useState } from "react";
import type { useLiveShow } from "./use-live-show";
export function LiveInputControls({live}:{live:ReturnType<typeof useLiveShow>}) {
 const [search,setSearch]=useState("");
 const status=live.offline?"Receiver offline":!live.state?.packets?"Waiting for TimecodeLink":live.stale?"Signal lost — show held":!live.deck?"Connected · load a track in rekordbox":`Deck ${live.deck.number} · ${live.deck.playing?"Playing":"Paused"} · ${live.deck.bpm.toFixed(1)} BPM · ${Math.floor(live.time/60)}:${String(Math.floor(live.time%60)).padStart(2,"0")} · ${live.deck.title||"Track metadata pending"}`;
 return <div className="vault-live-input">
   <label>Input<select aria-label="Show input" value={live.enabled?"rekordbox":"library"} onChange={e=>live.setEnabled(e.target.value==="rekordbox")}><option value="library">Vault library</option><option value="rekordbox">Rekordbox / FLX10</option></select></label>
   {live.enabled&&<><label>Follow<select aria-label="Live deck" value={live.deckMode} onChange={e=>live.setDeckMode(e.target.value)}><option value="auto">Auto (master / playing)</option>{[1,2,3,4].map(n=><option key={n} value={n}>Deck {n}</option>)}</select></label><span role="status" className={live.stale?"text-amber-200":"text-emerald-200"}>{status}{live.track?" · Song show matched":live.deck?" · Live timing only":""}</span>
   {live.deck&&!live.track&&<details><summary>Link track for song cues</summary><p>Live timing works. Match the track to your library to use its analyzed drops and arrangement.</p><input aria-label="Find live track in library" placeholder="Filter library tracks" value={search} onChange={e=>setSearch(e.target.value)} /><select aria-label="Match live track" value="" onChange={e=>live.mapTrack(e.target.value)}><option value="">Select matching library track…</option>{live.tracks.filter(t=>`${t.title} ${t.artist??""}`.toLowerCase().includes(search.toLowerCase())).slice(0,100).map(t=><option key={t.id} value={t.id}>{t.title} — {t.artist??t.sourceName}</option>)}</select></details>}
   </>}
 </div>;
}
