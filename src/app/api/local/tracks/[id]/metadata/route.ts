import {
  assertLocalRequest,
  resolveTrackPath,
} from "@/lib/local-audio/library";
import {
  metadataPatch,
  savePerformanceMetadata,
} from "@/lib/local-audio/performance-metadata";
import { waveformAnalysis } from "@/lib/local-audio/waveform";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertLocalRequest(request);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin && origin !== `${new URL(request.url).protocol}//${request.headers.get("host")}`)
      return Response.json({ error: "Invalid origin." }, { status: 403 });
    const { id } = await context.params;
    const resolved = await resolveTrackPath(id);
    if (!resolved)
      return Response.json(
        { error: "Reconnect the track USB to save portable metadata." },
        { status: 404 },
      );
    const patch = metadataPatch.safeParse(await request.json());
    if (!patch.success)
      return Response.json(
        { error: "Invalid track metadata." },
        { status: 400 },
      );
    return Response.json(
      await savePerformanceMetadata(
        resolved.track,
        resolved.volumeRoot,
        patch.data,
      ),
    );
  } catch {
    return Response.json(
      { error: "Could not save track metadata." },
      { status: 500 },
    );
  }
}
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertLocalRequest(request);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin && origin !== `${new URL(request.url).protocol}//${request.headers.get("host")}`)
      return Response.json({ error: "Invalid origin." }, { status: 403 });
    const { id } = await context.params;
    const resolved = await resolveTrackPath(id);
    if (!resolved)
      return Response.json(
        { error: "Track USB unavailable." },
        { status: 404 },
      );
    const analysis = await waveformAnalysis(id, resolved.path,true);
    const patch = {
      ...(analysis.bpm ? { bpm: analysis.bpm } : {}),
      ...(analysis.musicalKey ? { musicalKey: analysis.musicalKey } : {}),
      firstBeatSecs: Math.max(0, analysis.beatOffsetSecs || 0),
      analyzedAt: new Date().toISOString(),
    };
    return Response.json(
      await savePerformanceMetadata(resolved.track, resolved.volumeRoot, patch),
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Analysis failed." },
      { status: 500 },
    );
  }
}
