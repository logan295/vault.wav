import { assertLocalRequest, discoverVolumes, readIndex } from "@/lib/local-audio/library";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    const [volumes, index] = await Promise.all([discoverVolumes(), readIndex()]);
    return Response.json({
      volumes: volumes.map(({ id, name, selected, rekordboxDetected }) => ({ id, name, selected, rekordboxDetected })),
      selectedVolumeIds: index.selectedVolumeIds,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not inspect mounted drives." }, { status: 403 });
  }
}
