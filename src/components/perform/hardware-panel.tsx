"use client";
import {useEffect,useRef,useState} from 'react';
import {Headphones,PlugZap} from 'lucide-react';
import type {PerformEngine} from '@/lib/perform/engine';
import {Flx10Mapping} from '@/lib/perform/flx10';
import type {AudioDevice,AudioStatus} from '@/lib/perform/hardware';
export function HardwarePanel({engine,onSelect}:{engine:PerformEngine;onSelect:(index:number)=>void}){
 const [midi,setMidi]=useState('MIDI disconnected'),[devices,setDevices]=useState<AudioDevice[]>([]),[uid,setUid]=useState(''),[master,setMaster]=useState(0),[cue,setCue]=useState(2),[status,setStatus]=useState<AudioStatus>({active:false}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const cleanup=useRef<(()=>void)|null>(null),selectRef=useRef(onSelect);useEffect(()=>{selectRef.current=onSelect;},[onSelect]);
 async function refresh(){try{const outputs=await window.wompHardware?.listAudio()||[];setDevices(outputs);setUid(current=>outputs.some(d=>d.uid===current)?current:outputs.find(d=>/flx.?10/i.test(d.name))?.uid||outputs.find(d=>d.channels>=4)?.uid||'');}catch(e){setError(String(e));}}
 useEffect(()=>{const initial=setTimeout(()=>void refresh(),0);const timer=setInterval(()=>{const bridge=window.wompHardware;if(bridge)void bridge.audioStatus().then(s=>{setStatus(s);if(engine.nativeOutput&&!s.active){engine.stopAll();void engine.disableNativeOutput();setError(s.error||'Audio device disconnected. Playback stopped.');}});},1000);return()=>{clearTimeout(initial);clearInterval(timer);cleanup.current?.();};},[engine]);
 async function connectMidi(){
  setError('');cleanup.current?.();
  try{
   if(!navigator.requestMIDIAccess)throw Error('Web MIDI is unavailable in this browser. Open the .womp desktop app.');
   const access=await navigator.requestMIDIAccess({sysex:false});
   const mapping=new Flx10Mapping(engine,(delta,deck)=>window.dispatchEvent(new CustomEvent('womp-controller-browser',{detail:{delta,deck}})),i=>selectRef.current(i));
   let inputs:MIDIInput[]=[],outputs:MIDIOutput[]=[],previous=new Map<string,number>();
   const discover=()=>{
    for(const input of inputs)input.onmidimessage=null;
    mapping.release();previous=new Map();
    inputs=Array.from(access.inputs.values()).filter(p=>p.state==='connected'&&/flx.?10/i.test(p.name||''));
    outputs=Array.from(access.outputs.values()).filter(p=>p.state==='connected'&&/flx.?10/i.test(p.name||''));
    inputs.forEach(input=>{input.onmidimessage=event=>{if(event.data)mapping.receive(event.data);};});
    setMidi(inputs.length?`FLX10 MIDI connected · ${inputs.length} input${inputs.length===1?'':'s'}`:'Waiting for FLX10 USB MIDI');
    void refresh();
   };
   const leds=setInterval(()=>{for(const data of mapping.leds()){const key=data.slice(0,2).join(':');if(previous.get(key)===data[2])continue;for(const output of outputs){try{output.send(data);}catch{}}previous.set(key,data[2]);}},100);
   access.onstatechange=discover;discover();
   cleanup.current=()=>{clearInterval(leds);access.onstatechange=null;inputs.forEach(input=>{input.onmidimessage=null;});mapping.release();for(const output of outputs)for(const bytes of mapping.leds()){try{output.send([bytes[0],bytes[1],0]);}catch{}}setMidi('MIDI disconnected');};
  }catch(e){setMidi('MIDI unavailable');setError(e instanceof Error?e.message:String(e));}
 }
 const device=devices.find(d=>d.uid===uid),pairs=Array.from({length:Math.floor((device?.channels||0)/2)},(_,i)=>i*2);
 return <details className="perform-hardware"><summary><PlugZap size={14}/> Controller & audio <span>{midi} · {status.active?`${status.name} · separate cue`:engine.defaultOutputConnected?'Default stereo master':'Output stopped'}</span></summary>
 <div className="perform-hardware-body">
 <div><button onClick={()=>void connectMidi()}>Connect FLX10 MIDI</button><button onClick={()=>void refresh()}>Refresh outputs</button><small>Set channel inputs to the USB port you connected. Jog wheels seek/nudge; vinyl scratching, stems and jog displays are not implemented.</small></div>
 {typeof window!=='undefined'&&window.wompHardware?<div className="perform-output-controls"><label>Audio device<select aria-label="DJ audio device" value={uid} onChange={e=>{setUid(e.target.value);setMaster(0);setCue(2);}}><option value="">Choose multichannel output</option>{devices.map(d=><option key={d.uid} value={d.uid}>{d.name} · {d.channels} outputs</option>)}</select></label>
 <label>Master<select aria-label="Master channel pair" value={master} onChange={e=>setMaster(Number(e.target.value))}>{pairs.map(n=><option value={n} key={n}>{n+1} / {n+2}</option>)}</select></label>
 <label>Headphones<select aria-label="Headphone channel pair" value={cue} onChange={e=>setCue(Number(e.target.value))}>{pairs.map(n=><option value={n} key={n}>{n+1} / {n+2}</option>)}</select></label>
 <button disabled={busy||!device||device.channels<4||master===cue} onClick={async()=>{setBusy(true);setError('');try{const s=await engine.enableNativeOutput(window.wompHardware!,uid,master,cue);setStatus(s||{active:true,name:device?.name});}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}}>Enable separate outputs</button>
 <button disabled={busy} onClick={async()=>{await engine.disableNativeOutput(true);setStatus({active:false});}}>Use default stereo</button>
 <small>Playback stops when changing outputs. Select the physical master and phones pairs reported by your device; confirm at low volume before mixing.</small>
 </div>:<p>Open the .womp Mac app for native multichannel headphone routing.</p>}
 <div className="perform-phones"><Headphones size={16}/><label>Cue / Master<input aria-label="Headphone cue master mix" type="range" min={0} max={1} step={.01} value={engine.phonesMix} onChange={e=>engine.setHeadphones({mix:Number(e.target.value)})}/></label><label>Headphone level<input aria-label="Headphone volume" type="range" min={0} max={1} step={.01} value={engine.phonesLevel} onChange={e=>engine.setHeadphones({level:Number(e.target.value)})}/></label><button aria-pressed={engine.masterCue} onClick={()=>engine.setHeadphones({masterCue:!engine.masterCue})}>Master cue</button><small>{status.active?`Buffered ${status.queuedFrames||0} frames · underruns ${status.underruns||0} · drops ${(status.overruns||0)+(status.droppedPackets||0)}`:'Channel CUE is silent until separate outputs are enabled.'}</small></div>
 {error&&<p role="alert">{error}</p>}
 </div></details>;
}
