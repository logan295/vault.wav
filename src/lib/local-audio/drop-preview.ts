/** A silent four-beat build followed by four bars of the real drop rig. */
export function dropPreviewAt(startedAt:number|null,now:number,bpm:number){
 if(startedAt===null)return null;
 const beat=Math.max(0,(now-startedAt)/1000)*Math.max(60,bpm)/60;
 if(beat>=20)return null;
 return {time:beat*60/Math.max(60,bpm),beat,dropBeat:beat<4?null:beat-4,hit:Math.exp(-(beat%1)*12)*.8,build:Math.min(1,beat/4)};
}
