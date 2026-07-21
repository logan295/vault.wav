import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { assertLocalRequest, resolveTrackPath } from "@/lib/local-audio/library";

export const runtime = "nodejs";

function streamBody(path: string, start: number, end: number) {
  const source = createReadStream(path, { start, end });
  const iterator = source[Symbol.asyncIterator]();
  let finished = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return;
      try {
        const result = await iterator.next();
        if (result.done) { finished = true; controller.close(); return; }
        const chunk = result.value as Buffer;
        controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      } catch (error) {
        if (!finished) { finished = true; controller.error(error); }
      }
    },
    async cancel() {
      if (finished) return;
      finished = true;
      await iterator.return?.();
      source.destroy();
    },
  });
}

export async function GET(request: Request, context: RouteContext<"/api/local/tracks/[id]/stream">) {
  try {
    assertLocalRequest(request);
    const { id } = await context.params;
    const resolved = await resolveTrackPath(id);
    if (!resolved) return Response.json({ error: "The track or its USB drive is unavailable." }, { status: 404 });

    const file = await stat(resolved.path);
    const range = request.headers.get("range");
    const headers = new Headers({
      "accept-ranges": "bytes",
      "cache-control": "private, no-store",
      "content-type": "audio/wav",
    });

    if (!range) {
      headers.set("content-length", String(file.size));
      return new Response(streamBody(resolved.path, 0, file.size - 1), { status: 200, headers });
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) return new Response(null, { status: 416, headers: { "content-range": `bytes */${file.size}` } });
    const start = match[1] ? Number(match[1]) : 0;
    const requestedEnd = match[2] ? Number(match[2]) : file.size - 1;
    const end = Math.min(requestedEnd, file.size - 1);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= file.size) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${file.size}` } });
    }

    headers.set("content-length", String(end - start + 1));
    headers.set("content-range", `bytes ${start}-${end}/${file.size}`);
    return new Response(streamBody(resolved.path, start, end), { status: 206, headers });
  } catch {
    return Response.json({ error: "The WAV could not be read from this USB drive." }, { status: 500 });
  }
}
