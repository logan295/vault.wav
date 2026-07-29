import { assertLocalRequest, listTracks, readIndex } from "@/lib/local-audio/library";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    const [tracks, index] = await Promise.all([listTracks(), readIndex()]);
    return Response.json({ tracks, scannedAt: index.scannedAt });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not read the local library." }, { status: 500 });
  }
}

