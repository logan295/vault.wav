import { assertLocalRequest } from "@/lib/local-audio/library";
import { readPlaylistCover, setPlaylistCover } from "@/lib/local-audio/playlists";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
function check(request: Request) {
  assertLocalRequest(request);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin && origin !== `${new URL(request.url).protocol}//${request.headers.get("host")}`) throw new Error("Open this playlist from the local app to edit it.");
}
export async function GET(request: Request, context: Context) {
  try {
    assertLocalRequest(request); const { id } = await context.params; const image = await readPlaylistCover(id);
    return image ? new Response(new Uint8Array(image), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" } }) : new Response(null, { status: 404 });
  } catch { return new Response(null, { status: 404 }); }
}
export async function POST(request: Request, context: Context) {
  try {
    check(request);
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024) return Response.json({ error: "Choose an image smaller than 5 MB." }, { status: 413 });
    const form = await request.formData(); const image = form.get("image");
    if (!(image instanceof File) || !image.size || image.size > 5 * 1024 * 1024) return Response.json({ error: "Choose a JPG, PNG or WebP image smaller than 5 MB." }, { status: 400 });
    const { id } = await context.params; const playlist = await setPlaylistCover(id, Buffer.from(await image.arrayBuffer()));
    return playlist ? Response.json({ playlist }) : Response.json({ error: "Playlist not found." }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not save image." }, { status: 400 }); }
}
export async function DELETE(request: Request, context: Context) {
  try { check(request); const { id } = await context.params; const playlist = await setPlaylistCover(id, null); return playlist ? Response.json({ playlist }) : Response.json({ error: "Playlist not found." }, { status: 404 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not remove image." }, { status: 400 }); }
}
