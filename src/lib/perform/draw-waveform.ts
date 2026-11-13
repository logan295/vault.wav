export type FrequencyPeaks = {
  full: number[];
  low: number[];
  mid: number[];
  high: number[];
};
const TILE_WIDTH = 512;
const MAX_TILES = 32;
type TileCache = { bands: FrequencyPeaks | null; tiles: Map<string, HTMLCanvasElement> };
const cache = new WeakMap<AudioBuffer, TileCache>();
/** A source-aligned power-of-two bucket never changes as the viewport scrolls. */
export function waveformBucket(sampleRate: number, span: number, pixels: number) {
  return 2 ** Math.max(0, Math.floor(Math.log2(Math.max(1, sampleRate * span / pixels))));
}
export function waveformColor(low: number, mid: number, high: number) {
  const total = Math.max(0.01, low, mid, high);
  return `rgb(${Math.min(255, Math.round(35 + 220 * (low / total) ** 2))},${Math.min(255, Math.round(35 + 220 * (mid / total) ** 2))},${Math.min(255, Math.round(40 + 215 * (high / total) ** 2))})`;
}
/** Cache audio-anchored raster tiles. Playback only translates existing pixels. */
export function drawWaveform(
  c: CanvasRenderingContext2D,
  buffer: AudioBuffer,
  bands: FrequencyPeaks | null,
  start: number,
  span: number,
  color: string,
  width: number,
  height: number,
  pixelRatio = 1,
) {
  c.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0 || span <= 0) return;
  let entry = cache.get(buffer);
  if (!entry || entry.bands !== bands) {
    entry = { bands, tiles: new Map() };
    cache.set(buffer, entry);
  }
  const samples = buffer.getChannelData(0);
  const bucket = waveformBucket(buffer.sampleRate, span, width * pixelRatio);
  const tileSeconds = TILE_WIDTH * bucket / buffer.sampleRate;
  const rasterHeight = Math.ceil(height * pixelRatio);
  const firstTile = Math.max(0, Math.floor(start / tileSeconds));
  const lastTile = Math.min(Math.ceil(samples.length / (bucket * TILE_WIDTH)) - 1, Math.floor((start + span) / tileSeconds));
  c.imageSmoothingEnabled = false;
  for (let tile = firstTile; tile <= lastTile; tile++) {
    const key = `${bucket}:${rasterHeight}:${color}:${tile}`;
    let image = entry.tiles.get(key);
    if (!image) {
      image = document.createElement('canvas');
      image.width = TILE_WIDTH;
      image.height = rasterHeight;
      const context = image.getContext('2d');
      if (!context) continue;
      for (let x = 0; x < TILE_WIDTH; x++) {
        const offset = (tile * TILE_WIDTH + x) * bucket;
        if (offset >= samples.length) break;
        let peak = 0;
        for (let sample = offset; sample < Math.min(samples.length, offset + bucket); sample++) peak = Math.max(peak, Math.abs(samples[sample]));
        const h = Math.max(1, peak * rasterHeight * 0.82);
        context.fillStyle = color;
        if (bands) {
          const bin = Math.min(bands.full.length - 1, Math.floor((offset + bucket / 2) / samples.length * bands.full.length));
          context.fillStyle = waveformColor(bands.low[bin] || 0, bands.mid[bin] || 0, bands.high[bin] || 0);
        }
        context.fillRect(x, Math.floor((rasterHeight - h) / 2), 1, Math.ceil(h));
      }
      entry.tiles.set(key, image);
      if (entry.tiles.size > MAX_TILES) entry.tiles.delete(entry.tiles.keys().next().value!);
    } else {
      // LRU eviction keeps nearby frames/zoom levels warm with a bounded allocation.
      entry.tiles.delete(key);
      entry.tiles.set(key, image);
    }
    const left = (tile * tileSeconds - start) / span * width;
    const tileWidth = tileSeconds / span * width;
    c.drawImage(image, left, 0, tileWidth, height);
  }
}
