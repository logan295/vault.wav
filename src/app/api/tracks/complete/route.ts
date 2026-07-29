import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  trackId: z.string().uuid(),
  storagePath: z.string().min(1),
  title: z.string().trim().min(1).max(300),
  artist: z.string().trim().max(300).nullable(),
  album: z.string().trim().max(300).nullable(),
  originalFilename: z.string().min(1).max(500),
  mimeType: z.enum(["audio/wav", "audio/x-wav", "audio/wave"]),
  fileSize: z.number().int().positive(),
  durationSecs: z.number().positive().nullable(),
  sampleRate: z.number().int().positive().nullable(),
  bitDepth: z.number().int().positive().nullable(),
  channels: z.number().int().positive().nullable(),
  codec: z.string().max(100).nullable(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid track metadata" }, { status: 400 });
  }

  const body = parsed.data;
  if (!body.storagePath.startsWith(`${user.id}/${body.trackId}/`)) {
    return Response.json({ error: "Invalid storage path" }, { status: 403 });
  }

  const storedFilename = body.storagePath.split("/").at(-1);
  const { data: objects, error: objectError } = await supabase.storage
    .from("audio")
    .list(`${user.id}/${body.trackId}`, { search: storedFilename });

  if (objectError || !storedFilename || !objects?.some((object) => object.name === storedFilename)) {
    return Response.json({ error: "Uploaded audio was not found" }, { status: 409 });
  }

  const { data: track, error } = await supabase.from("library_tracks").insert({
    id: body.trackId,
    owner_id: user.id,
    title: body.title,
    artist: body.artist,
    album: body.album,
    storage_path: body.storagePath,
    original_filename: body.originalFilename,
    mime_type: body.mimeType,
    file_size: body.fileSize,
    duration_secs: body.durationSecs,
    sample_rate: body.sampleRate,
    bit_depth: body.bitDepth,
    channels: body.channels,
    codec: body.codec,
  }).select("id,title,storage_path").single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ track }, { status: 201 });
}
