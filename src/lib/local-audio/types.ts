export type LocalVolume = {
  id: string;
  name: string;
  selected: boolean;
  rekordboxDetected?: boolean;
};

export type RekordboxCue = {
  kind: "memory" | "hot";
  slot: number | null;
  timeMs: number;
  loopEndMs: number | null;
  label: string | null;
  colorHex: string | null;
};

export type RekordboxMetadata = {
  trackId: number;
  analysisPath: string | null;
  bpm: number | null;
  musicalKey: string | null;
  beatCount: number;
  firstBeatMs: number | null;
  cues: RekordboxCue[];
  playlistNames: string[];
  analysisVersion?: number;
};

export type LocalTrack = {
  id: string;
  volumeId: string;
  sourceName: string;
  relativePath: string;
  title: string;
  artist: string | null;
  album: string | null;
  hasArtwork?: boolean;
  durationSecs: number | null;
  sampleRate: number | null;
  bitDepth: number | null;
  bitrateKbps: number | null;
  channels: number | null;
  codec: string | null;
  bpm?: number | null;
  musicalKey?: string | null;
  rekordbox?: RekordboxMetadata | null;
  fileSize: number;
  modifiedAtMs: number;
  available: boolean;
};

export type LocalLibraryIndex = {
  version: 1 | 2 | 3;
  selectedVolumeIds: string[];
  tracks: Omit<LocalTrack, "available">[];
  scannedAt: string | null;
};

export type LocalPlaylist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
};
