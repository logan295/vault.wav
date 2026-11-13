import { assertLocalRequest } from "@/lib/local-audio/library";
import { listVfx, saveVfx, VFX_LIMIT } from "@/lib/vfx/library";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { assertLocalRequest(request); return Response.json({clips:await listVfx()}); }
  catch { return Response.json({error:"Could not read local VFX."},{status:400}); }
}
export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const origin=request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin && origin !== `${new URL(request.url).protocol}//${request.headers.get("host")}`) throw new Error("Import clips from the local app.");
    if (Number(request.headers.get("content-length")) > VFX_LIMIT + 3*1024*1024) return Response.json({error:"Choose an MP4 smaller than 150 MB."},{status:413});
    const form=await request.formData(); const video=form.get("video"),poster=form.get("poster");
    if (!(video instanceof File) || !(poster instanceof File)) throw new Error("Choose an MP4 video.");
    return Response.json({clip:await saveVfx(video,poster)});
  } catch(error) { return Response.json({error:error instanceof Error?error.message:"Import failed."},{status:400}); }
}
