import { assertLocalRequest, persistTrackAnalysis, resolveTrackPath } from "@/lib/local-audio/library";
import { waveformAnalysis } from "@/lib/local-audio/waveform";

export const runtime = "nodejs";
export async function GET(request: Request, context: RouteContext<"/api/local/tracks/[id]/waveform">) {
  try {
    assertLocalRequest(request); const { id } = await context.params; const resolved = await resolveTrackPath(id);
    if (!resolved) return Response.json({ error: "Track or USB unavailable." }, { status: 404 });
    const analysis = await waveformAnalysis(id, resolved.path);
    await persistTrackAnalysis(id, { bpm: resolved.track.bpm??analysis.bpm, musicalKey: resolved.track.musicalKey??analysis.musicalKey });
    return Response.json({ ...analysis, cues: resolved.track.rekordbox?.cues ?? [] }, { headers: { "cache-control": "private, max-age=86400" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Waveform unavailable." }, { status: 500 }); }
}
