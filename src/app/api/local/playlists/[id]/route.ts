import { z } from "zod";
import { assertLocalRequest, listTracks } from "@/lib/local-audio/library";
import { deletePlaylist, updatePlaylist } from "@/lib/local-audio/playlists";

export const runtime = "nodejs";
const updateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), trackIds: z.array(z.string().length(24)).max(10000).optional() });

export async function PATCH(request: Request, context: RouteContext<"/api/local/playlists/[id]">) {
  try {
    assertLocalRequest(request); const { id } = await context.params;
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid playlist update." }, { status: 400 });
    if (parsed.data.trackIds) {
      const validIds = new Set((await listTracks()).map((track) => track.id));
      if (parsed.data.trackIds.some((trackId) => !validIds.has(trackId))) return Response.json({ error: "A selected track is no longer in the library." }, { status: 409 });
    }
    const playlist = await updatePlaylist(id, parsed.data);
    return playlist ? Response.json({ playlist }) : Response.json({ error: "Playlist not found." }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not update playlist." }, { status: 500 }); }
}

export async function DELETE(request: Request, context: RouteContext<"/api/local/playlists/[id]">) {
  try { assertLocalRequest(request); const { id } = await context.params; return (await deletePlaylist(id)) ? new Response(null, { status: 204 }) : Response.json({ error: "Playlist not found." }, { status: 404 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not delete playlist." }, { status: 500 }); }
}
