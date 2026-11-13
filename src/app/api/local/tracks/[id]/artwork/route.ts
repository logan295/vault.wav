import { parseFile, selectCover } from "music-metadata";
import { assertLocalRequest, resolveTrackPath } from "@/lib/local-audio/library";

export const runtime = "nodejs";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function GET(request: Request, context: RouteContext<"/api/local/tracks/[id]/artwork">) {
  try {
    assertLocalRequest(request);
  } catch {
    return new Response(null, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const source = await resolveTrackPath(id);
    if (!source) return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

    const metadata = await parseFile(source.path, { duration: false });
    const cover = selectCover(metadata.common.picture);
    if (!cover || !imageTypes.has(cover.format) || cover.data.length > 12 * 1024 * 1024) {
      return new Response(null, { status: 404, headers: { "cache-control": "private, max-age=300" } });
    }

    return new Response(Uint8Array.from(cover.data), {
      headers: {
        "content-type": cover.format,
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
  }
}
