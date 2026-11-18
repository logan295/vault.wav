import type { LocalTrack } from './types';
export type LinkTrack = { title: string; artist: string; durationSecs: number; url: string };
export function spotifyMetadataUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'open.spotify.com' && !url.username && !url.password && !url.port && /^\/(track|album|playlist)\/[a-zA-Z0-9]{22}\/?$/.test(url.pathname) ? `https://open.spotify.com${url.pathname}` : null; } catch { return null; }
}
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function matchLinkTrack(remote: LinkTrack, tracks: LocalTrack[]) {
  const matches = tracks.filter(t => t.available && normalize(t.title) === normalize(remote.title) && normalize(t.artist || '') === normalize(remote.artist) && !!normalize(remote.artist) && (!remote.durationSecs || !t.durationSecs || Math.abs(t.durationSecs - remote.durationSecs) <= 3));
  return { trackId: matches.length === 1 ? matches[0].id : null, status: matches.length === 1 ? 'Matched' : matches.length ? 'Ambiguous' : 'Not in library' };
}
