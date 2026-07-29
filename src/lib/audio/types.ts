export type LosslessTrackMetadata = {
  title: string;
  artist: string | null;
  album: string | null;
  originalFilename: string;
  mimeType: "audio/wav" | "audio/x-wav" | "audio/wave";
  fileSize: number;
  durationSecs: number | null;
  sampleRate: number | null;
  bitDepth: number | null;
  channels: number | null;
  codec: string | null;
};

export type UploadProgress = {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
};

