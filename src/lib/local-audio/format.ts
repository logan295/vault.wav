import type { LocalTrack } from "./types";

export function audioFileType(track: Pick<LocalTrack, "relativePath" | "codec">) {
  const extension = track.relativePath.split(".").at(-1)?.trim().toUpperCase();
  if (extension && extension !== track.relativePath.toUpperCase()) {
    return extension === "AIF" ? "AIFF" : extension;
  }
  return track.codec?.trim().toUpperCase() || "AUDIO";
}

export function audioBitrateKbps(track: Pick<LocalTrack, "bitrateKbps" | "fileSize" | "durationSecs">) {
  if (track.bitrateKbps && track.bitrateKbps > 0) return Math.round(track.bitrateKbps);
  if (track.fileSize > 0 && track.durationSecs && track.durationSecs > 0) {
    return Math.round((track.fileSize * 8) / track.durationSecs / 1000);
  }
  return null;
}

export function audioQuality(track: Pick<LocalTrack, "relativePath" | "codec" | "bitrateKbps" | "fileSize" | "durationSecs" | "bitDepth" | "sampleRate" | "channels">) {
  const bitrateKbps = audioBitrateKbps(track);
  return [
    audioFileType(track),
    bitrateKbps ? `${bitrateKbps} kbps` : null,
    track.bitDepth ? `${track.bitDepth}-bit` : null,
    track.sampleRate ? `${track.sampleRate / 1000} kHz` : null,
    track.channels === 2 ? "stereo" : track.channels ? `${track.channels} ch` : null,
  ].filter(Boolean).join(" · ");
}
