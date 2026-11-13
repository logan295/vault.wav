import { assertLocalRequest } from "@/lib/local-audio/library";
export function GET(request: Request) {
  try { assertLocalRequest(request); return Response.json({ app: ".womp", version: 1 }); }
  catch { return new Response(null, { status: 403 }); }
}
