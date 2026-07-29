type StreamDescriptor = {
  url: string;
  expiresIn: number;
  format: {
    mimeType: string;
    sampleRate: number | null;
    bitDepth: number | null;
    channels: number | null;
  };
};

/**
 * Direct mode deliberately uses HTMLAudioElement without a Web Audio graph.
 * This keeps application EQ/resampling out of the signal path. The browser and
 * operating system still control final device mixing and sample-rate conversion.
 */
export class DirectPlayer {
  readonly audio = new Audio();
  private trackId: string | null = null;

  constructor() {
    this.audio.preload = "metadata";
  }

  async load(trackId: string) {
    if (this.trackId === trackId && this.audio.src) return;
    const response = await fetch(`/api/tracks/${trackId}/stream`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load this track.");
    const stream = body as StreamDescriptor;
    this.audio.src = stream.url;
    this.trackId = trackId;
    this.audio.load();
    return stream.format;
  }

  async play(trackId?: string) {
    if (trackId) await this.load(trackId);
    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  seek(seconds: number) {
    this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || seconds));
  }

  async setOutputDevice(deviceId: string) {
    const audioWithSink = this.audio as HTMLAudioElement & {
      setSinkId?: (id: string) => Promise<void>;
    };
    if (!audioWithSink.setSinkId) throw new Error("Audio output selection is not supported in this browser.");
    await audioWithSink.setSinkId(deviceId);
  }

  destroy() {
    this.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
  }
}

