import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: RouteContext<"/api/tracks/[id]/stream">) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: track, error } = await supabase
    .from("library_tracks")
    .select("storage_path,mime_type,sample_rate,bit_depth,channels")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !track) return Response.json({ error: "Track not found" }, { status: 404 });

  const { data, error: signError } = await supabase.storage
    .from("audio")
    .createSignedUrl(track.storage_path, 60 * 60);

  if (signError) return Response.json({ error: "Could not prepare audio" }, { status: 500 });

  return Response.json({
    url: data.signedUrl,
    expiresIn: 3600,
    format: {
      mimeType: track.mime_type,
      sampleRate: track.sample_rate,
      bitDepth: track.bit_depth,
      channels: track.channels,
    },
  });
}

