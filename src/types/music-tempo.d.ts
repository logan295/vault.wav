declare module "music-tempo" {
  export default class MusicTempo {
    tempo: number;
    beats: number[];
    constructor(audioData: ArrayLike<number>, options?: { minBeatInterval?: number; maxBeatInterval?: number; expiryTime?: number });
  }
}
