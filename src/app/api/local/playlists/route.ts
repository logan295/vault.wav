import { z } from "zod";
import { assertLocalRequest } from "@/lib/local-audio/library";
import { createPlaylist, readPlaylists } from "@/lib/local-audio/playlists";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { assertLocalRequest(request); return Response.json({ playlists: await readPlaylists() }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not read playlists." }, { status: 403 }); }
}

export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const parsed = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Enter a playlist name." }, { status: 400 });
    return Response.json({ playlist: await createPlaylist(parsed.data.name) }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not create playlist." }, { status: 500 }); }
}
