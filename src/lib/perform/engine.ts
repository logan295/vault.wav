import type { HardwareBridge } from "./hardware";
import type { FrequencyPeaks } from "./draw-waveform";
import type { SoundTouchNode } from "@soundtouchjs/audio-worklet";
import { keyShift } from "./key";
import { beatAt, changeTempo, nextBoundary, type MusicalClock } from "./clock";
import type { LocalTrack } from "../local-audio/types";
export type DeckSettings = {
  quantize: boolean;
  headphoneCue: boolean;
  crossfade: "A" | "B" | "thru";
  level: number;
  trim: number;
  low: number;
  mid: number;
  high: number;
  filter: number;
  muted: boolean;
  solo: boolean;
  sync: boolean;
  pitch: number;
  loopBars: number;
  loop: boolean;
  loopStart: number;
  loopEnd: number | null;
  cue: number;
  keyLock: boolean;
  keyShift: number;
  echo: number;
  echoBeats: number;
};
export type Deck = {
  track: LocalTrack | null;
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  shifter: SoundTouchNode | null;
  envelope: GainNode | null;
  offset: number;
  startedAt: number;
  rate: number;
  playing: boolean;
  pending: boolean;
  transport: number;
  cueHeld: boolean;
  scrubPlaying: boolean | null;
  hotCues: (number | null)[];
  settings: DeckSettings;
  peaks: number[];
  bands: FrequencyPeaks | null;
  status: string;
  generation: number;
};
export const defaults = (): DeckSettings => ({
  quantize: true,
  headphoneCue: false,
  crossfade: "thru",
  level: 0.75,
  trim: 0,
  low: 0,
  mid: 0,
  high: 0,
  filter: 0,
  muted: false,
  solo: false,
  sync: true,
  pitch: 0,
  loopBars: 4,
  loop: false,
  loopStart: 0,
  loopEnd: null,
  cue: 0,
  keyLock: true,
  keyShift: 0,
  echo: 0,
  echoBeats: 0.5,
});
export class PerformEngine {
  context: AudioContext;
  clock: MusicalClock;
  quantum = 1;
  crossfader = 0;
  djMode = false;
  master: GainNode;
  limiter: DynamicsCompressorNode;
  meter: AnalyserNode;
  headphonesOutput: DynamicsCompressorNode;
  headphones: GainNode;
  cueBus: GainNode;
  cueMix: GainNode;
  masterToPhones: GainNode;
  phonesMix = 0;
  phonesLevel = 0.5;
  masterCue = false;
  nativeOutput = false;
  defaultOutputConnected = true;
  hardwareCrossfader = false;
  nativeTap: AudioWorkletNode | null = null;
  nativeMerger: ChannelMergerNode | null = null;
  nativeSplits: ChannelSplitterNode[] = [];
  bridge: HardwareBridge | null = null;
  channels: {
    preFader: GainNode;
    cue: GainNode;
    input: GainNode;
    low: BiquadFilterNode;
    mid: BiquadFilterNode;
    high: BiquadFilterNode;
    hp: BiquadFilterNode;
    lp: BiquadFilterNode;
    delay: DelayNode;
    feedback: GainNode;
    wet: GainNode;
    level: GainNode;
    meter: AnalyserNode;
  }[];
  decks: Deck[];
  shifterClass: typeof SoundTouchNode | null = null;
  metadataCache = new Map<string, NonNullable<LocalTrack["performance"]>>();
  disposed = false;
  onChange: () => void;
  constructor(onChange: () => void) {
    this.onChange = onChange;
    this.context = new AudioContext({ latencyHint: "interactive" });
    this.clock = {
      bpm: 128,
      anchorBeat: 0,
      anchorTime: this.context.currentTime,
      owner: "header",
      locked: false,
    };
    this.master = this.context.createGain();
    this.master.gain.value = 0.6;
    this.limiter = this.context.createDynamicsCompressor();
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.12;
    this.meter = this.context.createAnalyser();
    this.meter.fftSize = 256;
    this.master
      .connect(this.limiter)
      .connect(this.meter)
      .connect(this.context.destination);
    this.headphones = this.context.createGain();
    this.cueBus = this.context.createGain();
    this.cueMix = this.context.createGain();
    this.masterToPhones = this.context.createGain();
    const phonesLimiter = this.context.createDynamicsCompressor();
    phonesLimiter.threshold.value = -3;
    phonesLimiter.ratio.value = 20;
    this.cueBus.connect(this.cueMix).connect(this.headphones);
    this.meter.connect(this.masterToPhones).connect(this.headphones);
    this.headphones.connect(phonesLimiter);
    // The headphone bus remains disconnected until a distinct physical output is selected.
    this.headphonesOutput = phonesLimiter;
    this.channels = Array.from({ length: 4 }, () => {
      const c = {
        preFader: this.context.createGain(),
        cue: this.context.createGain(),
        input: this.context.createGain(),
        low: this.context.createBiquadFilter(),
        mid: this.context.createBiquadFilter(),
        high: this.context.createBiquadFilter(),
        hp: this.context.createBiquadFilter(),
        lp: this.context.createBiquadFilter(),
        delay: this.context.createDelay(4),
        feedback: this.context.createGain(),
        wet: this.context.createGain(),
        level: this.context.createGain(),
        meter: this.context.createAnalyser(),
      };
      c.feedback.gain.value = 0.3;
      c.delay.connect(c.feedback).connect(c.delay);
      c.lp.connect(c.delay).connect(c.wet).connect(c.preFader);
      c.preFader.connect(c.cue).connect(this.cueBus);
      c.preFader.connect(c.level);
      c.low.type = "lowshelf";
      c.low.frequency.value = 250;
      c.mid.type = "peaking";
      c.mid.frequency.value = 1000;
      c.mid.Q.value = 0.7;
      c.high.type = "highshelf";
      c.high.frequency.value = 4000;
      c.hp.type = "highpass";
      c.hp.frequency.value = 20;
      c.lp.type = "lowpass";
      c.lp.frequency.value = 20000;
      c.meter.fftSize = 256;
      c.input
        .connect(c.low)
        .connect(c.mid)
        .connect(c.high)
        .connect(c.hp)
        .connect(c.lp)
        .connect(c.preFader);
      c.level
        .connect(c.meter)
        .connect(this.master);
      return c;
    });
    this.decks = Array.from({ length: 4 }, (_, i) => ({
      track: null,
      buffer: null,
      source: null,
      shifter: null,
      envelope: null,
      offset: 0,
      startedAt: 0,
      rate: 1,
      playing: false,
      pending: false,
      transport: 0,
      cueHeld: false,
      scrubPlaying: null,
      hotCues: Array(8).fill(null),
      settings: {...defaults(),crossfade:i%2===0?"A":"B"},
      peaks: [],
      bands: null,
      status: "Empty",
      generation: 0,
    }));
    this.updateMix();
  }
  async initialize() {
    const { SoundTouchNode } = await import("@soundtouchjs/audio-worklet");
    await SoundTouchNode.register(
      this.context,
      "/audio/soundtouch-processor.js",
    );
    this.shifterClass = SoundTouchNode;
    this.decks.forEach((d, i) => {
      const shifter = new SoundTouchNode({ context: this.context });
      shifter.setStretchParameters({
        sequenceMs: 40,
        seekWindowMs: 15,
        overlapMs: 8,
      });
      this.channels[i].input.disconnect();
      this.channels[i].input.connect(shifter).connect(this.channels[i].low);
      d.shifter = shifter;
      this.updatePitch(i);
    });
  }
  beat() {
    return beatAt(this.clock, this.context.currentTime);
  }
  position(index: number) {
    const d = this.decks[index];
    if (!d.buffer) return d.offset;
    let value =
      d.offset +
      (d.playing
        ? Math.max(0, this.context.currentTime - d.startedAt) * d.rate
        : 0);
    if (d.settings.loop && d.source) {
      const a = d.source.loopStart,
        b = d.source.loopEnd;
      if (b > a && value >= b) value = a + ((value - a) % (b - a));
    }
    return Math.min(d.buffer.duration, Math.max(0, value));
  }
  async load(index: number, track: LocalTrack) {
    const cached = this.metadataCache.get(track.id);
    if (cached)
      track = {
        ...track,
        performance: cached,
        ...(cached.bpm ? { bpm: cached.bpm } : {}),
        ...(cached.musicalKey ? { musicalKey: cached.musicalKey } : {}),
      };
    const d = this.decks[index];
    const wasEmpty = this.decks.every((deck) => !deck.track);
    this.stop(index, false);
    const generation = ++d.generation;
    d.track = track;
    d.settings.cue = 0;
    d.settings.loop = false;
    d.settings.loopStart = 0;
    d.settings.loopEnd = null;
    d.cueHeld = false;
    d.hotCues = Array(8).fill(null);
    for (const cue of track.rekordbox?.cues || []) {
      if (
        cue.kind === "hot" &&
        cue.slot !== null &&
        cue.slot >= 1 &&
        cue.slot <= 8
      )
        d.hotCues[cue.slot - 1] = cue.timeMs / 1000;
    }
    try {
      const saved = JSON.parse(
        localStorage.getItem(`womp-cues-v1:${track.id}`) || "null",
      );
      if (saved) {
        if (Number.isFinite(saved.cue) && saved.cue >= 0)
          d.settings.cue = saved.cue;
        if (Array.isArray(saved.hotCues))
          d.hotCues = Array.from({ length: 8 }, (_, i) =>
            Number.isFinite(saved.hotCues[i]) && saved.hotCues[i] >= 0
              ? saved.hotCues[i]
              : null,
          );
      }
    } catch {}
    if (track.performance) {
      if (track.performance.cue !== undefined)
        d.settings.cue = track.performance.cue;
      if (track.performance.hotCues) d.hotCues = [...track.performance.hotCues];
    }
    d.buffer = null;
    d.peaks = [];
    d.bands = null;
    d.offset = 0;
    d.status = "Decoding audio…";
    this.onChange();
    try {
      if (!track.available) throw new Error(`Reconnect ${track.sourceName}.`);
      const response = await fetch(`/api/local/tracks/${track.id}/stream`);
      if (!response.ok) throw new Error("Audio file is unavailable.");
      const bytes = await response.arrayBuffer();
      if (generation !== d.generation || this.disposed) return;
      const buffer = await this.context.decodeAudioData(bytes);
      if (generation !== d.generation || this.disposed) return;
      d.buffer = buffer;
      const samples = buffer.getChannelData(0);
      const width = 600;
      const stride = Math.max(1, Math.floor(samples.length / width));
      d.peaks = Array.from({ length: width }, (_, i) => {
        let peak = 0;
        for (
          let j = i * stride;
          j < Math.min(samples.length, (i + 1) * stride);
          j += 32
        )
          peak = Math.max(peak, Math.abs(samples[j]));
        return peak;
      });
      void this.loadBands(index, generation);
      d.status = "Ready";
      if (wasEmpty && !this.clock.locked) {
        this.clock.owner = index;
        this.setTempo(track.bpm || 128);
        d.settings.sync = false;
      }
      this.onChange();
    } catch (error) {
      if (generation === d.generation) {
        d.status =
          error instanceof Error ? error.message : "Could not decode audio.";
        this.onChange();
      }
    }
  }
  async loadBands(index: number, generation = this.decks[index].generation) {
    const d = this.decks[index],
      id = d.track?.id;
    if (!id) return;
    try {
      const response = await fetch(`/api/local/tracks/${id}/waveform`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const value = await response.json();
      if (generation !== d.generation || this.disposed) return;
      if (
        value.peaks?.full?.length &&
        value.peaks?.low?.length === value.peaks.full.length &&
        value.peaks?.mid?.length === value.peaks.full.length &&
        value.peaks?.high?.length === value.peaks.full.length
      ) {
        d.bands = value.peaks;
        this.onChange();
      }
    } catch {}
  }
  desiredRate(index: number) {
    const d = this.decks[index];
    const native = d.track?.bpm || this.clock.bpm;
    return d.settings.sync
      ? this.clock.bpm / native
      : 1 + d.settings.pitch / 100;
  }
  async play(index: number, offset?: number, quantized = true) {
    const d = this.decks[index];
    if (!d.buffer) return;
    const transport = ++d.transport;
    const generation = d.generation;
    if (this.context.state !== "running") await this.context.resume();
    if (
      this.disposed ||
      !d.buffer ||
      transport !== d.transport ||
      generation !== d.generation
    )
      return;
    if (d.playing) this.stop(index, false, true);
    const source = this.context.createBufferSource(),
      envelope = this.context.createGain();
    source.buffer = d.buffer;
    d.rate = this.desiredRate(index);
    source.playbackRate.value = d.rate;
    const when = quantized
      ? nextBoundary(this.clock, this.context.currentTime, this.quantum)
      : this.context.currentTime + 0.005;
    d.offset = Math.min(
      d.buffer.duration - 0.001,
      Math.max(0, offset ?? (d.offset >= d.buffer.duration ? 0 : d.offset)),
    );
    d.startedAt = when;
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(1, when + 0.006);
    source.connect(envelope);
    this.updatePitch(index);
    envelope.connect(this.channels[index].input);
    d.source = source;
    d.envelope = envelope;
    d.playing = true;
    d.pending = true;
    d.status = "Queued";
    this.applyLoop(index);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();

      if (d.source === source) {
        d.offset = d.buffer?.duration || 0;
        d.playing = false;
        d.pending = false;
        d.source = null;
        d.status = "Ended";
        this.handoff(index);
        this.updateMix();
        this.onChange();
      }
    };
    this.updateMix();
    source.start(when, d.offset);
    this.onChange();
  }
  stop(index: number, handoff = true, preserveOutput = false) {
    const d = this.decks[index];
    d.transport++;
    d.offset = this.position(index);
    const source = d.source,
      envelope = d.envelope;
    d.source = null;
    d.playing = false;
    d.pending = false;
    if (source) {
      source.onended = null;
      const now = this.context.currentTime;
      envelope?.gain.cancelScheduledValues(now);
      if (envelope) {
        envelope.gain.setValueAtTime(envelope.gain.value, now);
        envelope.gain.linearRampToValueAtTime(0, now + 0.008);
      }
      try {
        source.stop(now + 0.009);
      } catch {}
      setTimeout(() => {
        source.disconnect();
        envelope?.disconnect();
      }, 30);
    }
    d.status = d.buffer ? "Paused" : d.status;
    if (handoff) this.handoff(index);
    if (!preserveOutput) this.updateMix();
    this.onChange();
  }
  toggle(index: number) {
    if (this.decks[index].cueHeld) {
      this.decks[index].cueHeld = false;
      return;
    }
    if (this.decks[index].playing) this.stop(index);
    else void this.play(index);
  }
  seek(index: number, seconds: number) {
    const d = this.decks[index];
    const playing = d.playing;
    this.stop(index, false);
    d.offset = Math.max(0, Math.min(seconds, d.buffer?.duration || 0));
    if (playing) void this.play(index, d.offset, false);
    else this.onChange();
  }
  beginScrub(index: number) {
    const d = this.decks[index];
    d.scrubPlaying = d.playing;
  }
  scrubTo(index: number, seconds: number) {
    const d = this.decks[index];
    if (!d.buffer || !Number.isFinite(seconds)) return;
    const target = Math.max(0, Math.min(d.buffer.duration - 0.001, seconds));
    if (d.scrubPlaying) void this.play(index, target, false);
    else {
      this.stop(index, false);
      d.offset = target;
      this.onChange();
    }
  }
  endScrub(index: number) {
    this.decks[index].scrubPlaying = null;
  }
  cue(index: number) {
    const d = this.decks[index];
    this.stop(index, false);
    d.offset = d.settings.cue;
    d.status = "Cued";
    this.onChange();
  }
  cueDown(index: number) {
    const d = this.decks[index];
    if (!d.buffer) return;
    if (d.playing) {
      this.cue(index);
      return;
    }
    d.settings.cue = this.snapPosition(index,this.position(index));
    this.persistCues(index);
    d.cueHeld = true;
    void this.play(index, d.settings.cue, false);
  }
  cueUp(index: number) {
    const d = this.decks[index];
    if (!d.cueHeld) return;
    d.cueHeld = false;
    this.cue(index);
  }
  releaseCues() {
    this.decks.forEach((_, i) => this.cueUp(i));
  }
  setCue(index: number) {
    this.decks[index].settings.cue = this.snapPosition(index,this.position(index));
    this.persistCues(index);
    this.onChange();
  }
  persistCues(index: number) {
    const d = this.decks[index];
    if (!d.track) return;
    try {
      localStorage.setItem(
        `womp-cues-v1:${d.track.id}`,
        JSON.stringify({ cue: d.settings.cue, hotCues: d.hotCues }),
      );
    } catch {}
    void this.saveMetadata(index, {
      cue: d.settings.cue,
      hotCues: [...d.hotCues],
    });
  }
  async saveMetadata(
    index: number,
    patch: NonNullable<LocalTrack["performance"]>,
  ) {
    const d = this.decks[index],
      track = d.track;
    if (!track) return;
    try {
      const response = await fetch(`/api/local/tracks/${track.id}/metadata`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      this.metadataCache.set(track.id, result.metadata);
      if (d.track?.id === track.id) {
        d.track = {
          ...track,
          ...(result.metadata.bpm ? { bpm: result.metadata.bpm } : {}),
          ...(result.metadata.musicalKey
            ? { musicalKey: result.metadata.musicalKey }
            : {}),
          performance: result.metadata,
        };
        if (patch.bpm) {
          if (this.clock.owner === index) this.setTempo(patch.bpm);
          else this.setTempo(this.clock.bpm);
        }
        d.status = result.usbSaved
          ? "Metadata saved · Mac + USB"
          : "Metadata saved on Mac · USB write failed";
        this.onChange();
      }
    } catch {
      if (d.track?.id === track.id) {
        d.status = "Cue kept in browser · reconnect USB to save metadata";
        this.onChange();
      }
    }
  }
  async analyze(index: number) {
    const d = this.decks[index],
      track = d.track;
    if (!track) return;
    d.status = "Analyzing BPM, key and grid…";
    this.onChange();
    try {
      const response = await fetch(`/api/local/tracks/${track.id}/metadata`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      this.metadataCache.set(track.id, result.metadata);
      if (d.track?.id === track.id) {
        d.track = {
          ...track,
          bpm: result.metadata.bpm || track.bpm,
          musicalKey: result.metadata.musicalKey || track.musicalKey,
          performance: result.metadata,
        };
        if (this.clock.owner === index) this.setTempo(d.track.bpm || 128);
        void this.loadBands(index);
        d.status = result.usbSaved
          ? "Analyzed · saved on Mac + USB"
          : "Analyzed · saved on Mac";
        this.onChange();
      }
    } catch (error) {
      d.status = error instanceof Error ? error.message : "Analysis failed";
      this.onChange();
    }
  }
  setHotCue(index: number, slot: number) {
    const d = this.decks[index];
    if (!d.buffer || slot < 0 || slot > 7) return;
    d.hotCues[slot] = this.snapPosition(index,this.position(index));
    this.persistCues(index);
    this.onChange();
  }
  phraseCues(index: number) {
    const d = this.decks[index];
    if (!d.buffer) return;
    const bar = 240 / (d.track?.bpm || this.clock.bpm),
      anchor =
        d.track?.performance?.firstBeatSecs ??
        (d.track?.rekordbox?.firstBeatMs || 0) / 1000;
    const bars = (d.buffer.duration - anchor) / bar;
    const step = [32, 16, 8, 4, 2, 1].find((n) => n * 7 < bars) || 1;
    for (let i = 0; i < 8; i++) {
      const point = anchor + i * step * bar;
      if (d.hotCues[i] === null && point < d.buffer.duration)
        d.hotCues[i] = point;
    }
    this.persistCues(index);
    d.status = "Empty cues filled at regular phrase intervals · refine by ear";
    this.onChange();
  }
  hotCue(index: number, slot: number, clear = false) {
    const d = this.decks[index];
    if (!d.buffer || slot < 0 || slot > 7) return;
    if (clear) {
      d.hotCues[slot] = null;
      this.persistCues(index);
      this.onChange();
      return;
    }
    const cue = d.hotCues[slot];
    if (cue === null) {
      d.hotCues[slot] = this.snapPosition(index,this.position(index));
      this.persistCues(index);
      this.onChange();
    } else void this.play(index, cue);
  }
  snapPosition(index:number,seconds:number){
    const d=this.decks[index],beat=60/(d.track?.bpm||this.clock.bpm),anchor=d.track?.performance?.firstBeatSecs??(d.track?.rekordbox?.firstBeatMs||0)/1000;
    return Math.max(0,Math.min(d.buffer?.duration||0,d.settings.quantize ? anchor+Math.round((seconds-anchor)/beat)*beat : seconds));
  }
  beatJump(index:number,beats:number){
    const d=this.decks[index];if(!d.buffer||!Number.isFinite(beats))return;
    const delta=beats*60/(d.track?.bpm||this.clock.bpm);
    if(d.settings.loop){
      const length=(d.settings.loopEnd??d.settings.loopStart+d.settings.loopBars*4*60/(d.track?.bpm||this.clock.bpm))-d.settings.loopStart;
      const start=Math.max(0,Math.min(d.buffer.duration-length,d.settings.loopStart+delta));
      const actual=start-d.settings.loopStart;const position=this.position(index);
      this.set(index,{loopStart:start,loopEnd:start+length});this.seek(index,position+actual);
    }else this.jog(index,delta);
  }
  autoLoop(index:number,beats:number){
    const d=this.decks[index];if(!d.buffer||!Number.isFinite(beats)||beats<=0)return;
    const length=beats*60/(d.track?.bpm||this.clock.bpm);
    const start=Math.min(Math.max(0,d.buffer.duration-length),this.snapPosition(index,this.position(index)));
    this.set(index,{loop:true,loopStart:start,loopEnd:Math.min(d.buffer.duration,start+length),loopBars:beats/4});
  }
  resizeLoop(index:number,factor:number){
    const d=this.decks[index],beat=60/(d.track?.bpm||this.clock.bpm);
    const length=(d.settings.loopEnd??d.settings.loopStart+d.settings.loopBars*4*beat)-d.settings.loopStart;
    const next=Math.max(beat/4,Math.min(256*beat,length*factor));
    this.set(index,{loopBars:next/beat/4,loopEnd:Math.min(d.buffer?.duration||0,d.settings.loopStart+next)});
    if(d.settings.loop&&this.position(index)>d.settings.loopStart+next)this.seek(index,d.settings.loopStart);
  }
  jog(index: number, seconds: number) {
    const d = this.decks[index];
    if (!d.buffer) return;
    const position = Math.max(
      0,
      Math.min(d.buffer.duration - 0.001, this.position(index) + seconds),
    );
    if (d.playing) void this.play(index, position, false);
    else {
      d.offset = position;
      this.onChange();
    }
  }
  setDjMode(enabled: boolean) {
    if (enabled) {
      this.stop(2);
      this.stop(3);
    }
    this.djMode = enabled;
    this.updateMix();
    this.onChange();
  }
  setCrossfader(value: number) {
    if (!Number.isFinite(value)) return;
    this.crossfader = Math.max(-1, Math.min(1, value));
    this.updateMix();
    this.onChange();
  }
  eject(index: number) {
    this.stop(index);
    const d = this.decks[index];
    d.generation++;
    d.buffer = null;
    d.track = null;
    d.peaks = [];
    d.bands = null;
    d.offset = 0;
    d.status = "Empty";
    this.onChange();
  }
  setTempo(bpm: number) {
    if (!Number.isFinite(bpm)) return;
    bpm = Math.max(20, Math.min(999, bpm));
    if (typeof this.clock.owner === "number") {
      const master = this.decks[this.clock.owner];
      master.settings.pitch = (bpm / (master.track?.bpm || 128) - 1) * 100;
    }
    const now = this.context.currentTime;
    this.clock = changeTempo(this.clock, bpm, now);
    for (let i = 0; i < 4; i++) {
      const d = this.decks[i];
      if (d.playing && d.source) {
        d.offset = this.position(i);
        d.startedAt = Math.max(now, d.startedAt);
        d.rate = this.desiredRate(i);
        d.source.playbackRate.setValueAtTime(d.rate, now);
        this.updatePitch(i);
      }
    }
    this.updateMix();
    this.onChange();
  }
  setOwner(owner: "header" | number) {
    if (this.clock.locked && owner !== "header") return;
    const previous = this.clock.owner;
    if (typeof previous === "number" && previous !== owner)
      this.decks[previous].settings.sync = true;
    this.clock.owner = owner;
    if (typeof owner === "number") {
      const d = this.decks[owner];
      d.settings.sync = false;
      d.settings.pitch =
        (this.clock.bpm / (d.track?.bpm || this.clock.bpm) - 1) * 100;
    }
    this.onChange();
  }
  setLocked(locked: boolean) {
    this.setOwner("header");
    this.clock.locked = locked;
    this.onChange();
  }
  handoff(stopped: number) {
    if (this.clock.locked || this.clock.owner !== stopped) return;
    const next = this.decks.findIndex((d) => d.playing && d.settings.sync);
    this.setOwner(next < 0 ? "header" : next);
  }
  set(index: number, changes: Partial<DeckSettings>) {
    const d = this.decks[index];
    if (
      changes.loop === true &&
      !d.settings.loop &&
      changes.loopStart === undefined
    ) {
      changes = { ...changes, loopStart: this.position(index), loopEnd: null };
    }
    Object.assign(d.settings, changes);
    if (changes.pitch !== undefined && this.clock.owner === index)
      this.setTempo((d.track?.bpm || 128) * (1 + changes.pitch / 100));
    else if (changes.sync !== undefined || changes.pitch !== undefined)
      this.setTempo(this.clock.bpm);
    this.applyLoop(index);
    this.updatePitch(index);
    this.updateMix();
    this.onChange();
  }
  updatePitch(index: number) {
    const d = this.decks[index];
    if (!d.shifter) return;
    d.shifter.playbackRate.value = d.rate;
    d.shifter.pitch.value = d.settings.keyLock ? 1 : d.rate;
    d.shifter.pitchSemitones.value = d.settings.keyShift;
  }
  beatSync(index: number) {
    const d = this.decks[index];
    if (!d.buffer || !d.track?.bpm) return;
    if (this.clock.owner === index) this.setOwner("header");
    this.set(index, { sync: true });
    const anchor =
        d.track.performance?.firstBeatSecs ??
        (d.track.rekordbox?.firstBeatMs || 0) / 1000,
      beat = 60 / d.track.bpm;
    const when = nextBoundary(
      this.clock,
      this.context.currentTime,
      this.quantum || 1,
    );
    const phase = ((beatAt(this.clock, when) % 1) + 1) % 1;
    const sourceBeat =
      (this.position(index) +
        (when - this.context.currentTime) * this.desiredRate(index) -
        anchor) /
      beat;
    const target = Math.max(
      0,
      anchor + (Math.round(sourceBeat - phase) + phase) * beat,
    );
    if (d.playing) void this.play(index, target);
    else {
      d.offset = Math.min(target, d.buffer.duration);
      this.onChange();
    }
  }
  keySync(index: number) {
    const target =
      typeof this.clock.owner === "number" && this.clock.owner !== index
        ? this.clock.owner
        : this.decks.findIndex((d, i) => i !== index && d.buffer);
    if (target < 0) return;
    const d = this.decks[index],
      master = this.decks[target];
    const shift = keyShift(
      d.track?.musicalKey,
      master.track?.musicalKey,
      master.settings.keyShift,
    );
    if (shift === null) {
      d.status = "Key sync needs known keys in the same major/minor mode";
      this.onChange();
      return;
    }
    this.set(index, { keyLock: true, keyShift: shift });
  }
  applyLoop(index: number) {
    const d = this.decks[index];
    if (!d.source || !d.buffer) return;
    d.source.loop = d.settings.loop;
    d.source.loopStart = Math.min(
      d.settings.loopStart,
      Math.max(0, d.buffer.duration - 0.02),
    );
    d.source.loopEnd = Math.min(
      d.buffer.duration,
      d.settings.loopEnd ??
        d.source.loopStart +
          (d.settings.loopBars * 4 * 60) / (d.track?.bpm || this.clock.bpm),
    );
  }
  loopIn(index: number) {
    this.set(index, {
      loopStart: this.snapPosition(index,this.position(index)),
      loopEnd: null,
      loop: false,
    });
  }
  loopOut(index: number) {
    const d = this.decks[index];
    const end = this.snapPosition(index,this.position(index));
    if (end > d.settings.loopStart + 0.02)
      this.set(index, {
        loop: true,
        loopStart: d.settings.loopStart,
        loopEnd: end,
      });
  }
  updateMix() {
    const solo = this.decks.some((d) => d.settings.solo);
    const now = this.context.currentTime;
    this.cueMix.gain.setTargetAtTime(1 - this.phonesMix,now,0.01);
    this.masterToPhones.gain.setTargetAtTime(this.masterCue ? this.phonesMix : 0,now,0.01);
    this.headphones.gain.setTargetAtTime(this.phonesLevel,now,0.01);
    this.decks.forEach((d, i) => {
      const c = this.channels[i],
        s = d.settings;
      c.delay.delayTime.setTargetAtTime(
        Math.min(3.9, (60 / this.clock.bpm) * s.echoBeats),
        now,
        0.015,
      );
      c.wet.gain.setTargetAtTime(s.echo, now, 0.015);
      c.input.gain.setTargetAtTime(Math.pow(10, s.trim / 20), now, 0.01);
      c.level.gain.cancelScheduledValues(now);
      c.level.gain.setTargetAtTime(
        !d.playing || s.muted || (solo && !s.solo)
          ? 0
          : s.level *
              ((this.hardwareCrossfader ? s.crossfade !== "thru" : this.djMode && i < 2)
                ? (this.hardwareCrossfader ? s.crossfade === "A" : i === 0)
                  ? Math.cos(((this.crossfader + 1) * Math.PI) / 4)
                  : Math.sin(((this.crossfader + 1) * Math.PI) / 4)
                : 1),
        d.playing && !s.muted ? Math.max(now, d.startedAt) : now,
        0.006,
      );
      c.cue.gain.cancelScheduledValues(now);
      c.cue.gain.setTargetAtTime(d.playing && s.headphoneCue ? 1 : 0, d.playing ? Math.max(now,d.startedAt) : now, 0.006);
      c.low.gain.setTargetAtTime(s.low, now, 0.01);
      c.mid.gain.setTargetAtTime(s.mid, now, 0.01);
      c.high.gain.setTargetAtTime(s.high, now, 0.01);
      c.hp.frequency.setTargetAtTime(
        s.filter > 0 ? 20 * Math.pow(800, s.filter) : 20,
        now,
        0.015,
      );
      c.lp.frequency.setTargetAtTime(
        s.filter < 0 ? 20000 * Math.pow(0.001, -s.filter) : 20000,
        now,
        0.015,
      );
    });
  }
  setQuantum(value: number) {
    this.quantum = [0, 0.25, 0.5, 1, 2, 4, 8].includes(value) ? value : 1;
    this.onChange();
  }
  setMaster(value: number) {
    if (!Number.isFinite(value)) return;
    this.master.gain.setTargetAtTime(
      Math.max(0, Math.min(1, value)),
      this.context.currentTime,
      0.015,
    );
    this.onChange();
  }
  setHeadphones(changes: {mix?:number;level?:number;masterCue?:boolean}) {
    if (changes.mix !== undefined && Number.isFinite(changes.mix)) this.phonesMix=Math.max(0,Math.min(1,changes.mix));
    if (changes.level !== undefined && Number.isFinite(changes.level)) this.phonesLevel=Math.max(0,Math.min(1,changes.level));
    if (changes.masterCue !== undefined) this.masterCue=changes.masterCue;
    this.updateMix(); this.onChange();
  }
  async enableNativeOutput(bridge:HardwareBridge,uid:string,master:number,cue:number) {
    this.stopAll();
    await this.disableNativeOutput(false);
    await this.context.audioWorklet.addModule('/audio/native-output.js');
    await bridge.startAudio({uid,master,cue,rate:this.context.sampleRate});
    try {
      const merger=this.context.createChannelMerger(4);
      merger.channelInterpretation='discrete';
      const sources=[this.meter,this.headphonesOutput];
      this.nativeSplits=sources.map((source,index)=>{
        const splitter=this.context.createChannelSplitter(2);
        source.connect(splitter); splitter.connect(merger,0,index*2);splitter.connect(merger,1,index*2+1);return splitter;
      });
      const tap=new AudioWorkletNode(this.context,'womp-output',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],channelCount:4,channelCountMode:'explicit',channelInterpretation:'discrete'});
      const silence=this.context.createGain();silence.gain.value=0;
      merger.connect(tap).connect(silence).connect(this.context.destination);
      tap.port.onmessage=event=>{if(this.nativeOutput)bridge.writeAudio(event.data);};
      if(this.defaultOutputConnected)this.meter.disconnect(this.context.destination);
      this.defaultOutputConnected=false;
      this.bridge=bridge;this.nativeTap=tap;this.nativeMerger=merger;this.nativeOutput=true;
      tap.port.postMessage({enabled:true});this.onChange();
      return await bridge.audioStatus();
    } catch(error) {await bridge.stopAudio();throw error;}
  }
  async disableNativeOutput(restoreDefault=false) {
    this.stopAll(); this.nativeOutput=false;
    this.nativeTap?.port.postMessage({enabled:false});this.nativeTap?.disconnect();this.nativeTap?.port.close();
    this.nativeMerger?.disconnect();
    this.nativeSplits.forEach((splitter,index)=>{try{[this.meter,this.headphonesOutput][index].disconnect(splitter);}catch{}splitter.disconnect();});
    this.nativeSplits=[];this.nativeTap=null;this.nativeMerger=null;
    await this.bridge?.stopAudio();this.bridge=null;
    if(restoreDefault&&!this.defaultOutputConnected){this.meter.connect(this.context.destination);this.defaultOutputConnected=true;}
    this.onChange();
  }
  stopAll() {
    this.decks.forEach((d) => {
      d.cueHeld = false;
      d.scrubPlaying = null;
    });
    this.decks.forEach((_, i) => this.stop(i, false));
    this.setOwner("header");
  }
  async close() {
    await this.disableNativeOutput();
    this.disposed = true;
    this.onChange = () => {};
    this.decks.forEach((_, i) => this.stop(i, false));
    this.decks.forEach((d) => {
      d.shifter?.disconnect();
      d.shifter?.port.close();
      d.shifter = null;
    });
    await this.context.close();
  }
}
