export type AudioDevice = {id:number;uid:string;name:string;channels:number};
export type AudioStatus = {active:boolean;name?:string;error?:string;queuedFrames?:number;underruns?:number;overruns?:number;droppedPackets?:number};
export type HardwareBridge = {
 listAudio:()=>Promise<AudioDevice[]>;
 startAudio:(config:{uid:string;master:number;cue:number;rate:number})=>Promise<AudioStatus>;
 stopAudio:()=>Promise<void>;
 audioStatus:()=>Promise<AudioStatus>;
 writeAudio:(buffer:ArrayBuffer)=>void;
};
declare global { interface Window {wompHardware?: HardwareBridge} }
