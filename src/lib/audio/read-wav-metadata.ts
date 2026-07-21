import { parseBlob } from "music-metadata-browser";
import type { LosslessTrackMetadata } from "./types";

const WAV_MIME_TYPES = new Set(["audio/wav", "audio/x-wav", "audio/wave"]);

export async function readWavMetadata(file: File): Promise<LosslessTrackMetadata> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeType = file.type || "audio/wav";

  if (extension !== "wav" || !WAV_MIME_TYPES.has(mimeType)) {
    throw new Error("Choose a WAV file. Other formats are not enabled yet.");
  }

  const metadata = await parseBlob(file, { duration: true, skipCovers: true });
  const titleFromFilename = file.name.replace(/\.wav$/i, "");

  return {
    title: metadata.common.title?.trim() || titleFromFilename,
    artist: metadata.common.artist?.trim() || null,
    album: metadata.common.album?.trim() || null,
    originalFilename: file.name,
    mimeType: mimeType as LosslessTrackMetadata["mimeType"],
    fileSize: file.size,
    durationSecs: metadata.format.duration ?? null,
    sampleRate: metadata.format.sampleRate ?? null,
    bitDepth: metadata.format.bitsPerSample ?? null,
    channels: metadata.format.numberOfChannels ?? null,
    codec: metadata.format.codec ?? null,
  };
}

