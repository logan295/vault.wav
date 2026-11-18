import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { z } from 'zod';
import { assertLocalRequest, listTracks } from '@/lib/local-audio/library';
import { matchLinkTrack, spotifyMetadataUrl } from '@/lib/local-audio/link-import';
export const runtime = 'nodejs';
function guard(request: Request) {
  assertLocalRequest(request);
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) throw new Error('Local requests only.');
}
async function run(url?: string) {
  const root = process.cwd();
  const { stdout } = await promisify(execFile)(join(/* turbopackIgnore: true */ root, 'var/mornye/.venv/bin/python'), [join(/* turbopackIgnore: true */ root, 'scripts/mornye-metadata.py'), ...(url ? [url] : [])], {
    cwd: root, timeout: 40000, maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, MORNYE_DATA_DIR: join(root, 'var/mornye/data'), MORNYE_CACHE_DIR: join(root, 'var/mornye/cache') },
  });
  return JSON.parse(stdout);
}
export async function GET(request: Request) {
  try { guard(request); } catch { return Response.json({ error: 'Local requests only.' }, { status: 403 }); }
  try { return Response.json(await run()); } catch { return Response.json({ ready: false, setup: 'sh scripts/setup-mornye.sh' }); }
}
export async function POST(request: Request) {
  try { guard(request); } catch { return Response.json({ error: 'Local requests only.' }, { status: 403 }); }
  const input = z.object({ url: z.string().max(500) }).safeParse(await request.json().catch(() => null));
  const url = input.success ? spotifyMetadataUrl(input.data.url) : null;
  if (!url) return Response.json({ error: 'Use a public Spotify track, album, or playlist link.' }, { status: 400 });
  try {
    const schema = z.object({ name: z.string().max(100), truncated: z.boolean(), tracks: z.array(z.object({ title: z.string().max(1000), artist: z.string().max(1000), durationSecs: z.number().nonnegative(), url: z.string().max(2000) })).max(500) });
    const result = schema.parse(await run(url));
    const local = await listTracks();
    return Response.json({ ...result, tracks: result.tracks.map(t => ({ ...t, ...matchLinkTrack(t, local) })) });
  } catch { return Response.json({ error: 'Mornye could not resolve this link. Confirm it is public and retry. Local music is unchanged.' }, { status: 502 }); }
}
