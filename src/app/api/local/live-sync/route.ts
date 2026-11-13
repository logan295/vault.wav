import { assertLocalRequest } from "@/lib/local-audio/library";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  try {
    assertLocalRequest(request);
    const stream=new URL(request.url).searchParams.get("stream")==="1";
    const upstream=await fetch(`http://127.0.0.1:3148/${stream ? "events" : "state"}`,{cache:"no-store",signal:request.signal});
    return new Response(upstream.body,{status:upstream.status,headers:{"Content-Type":stream ? "text/event-stream" : "application/json","Cache-Control":"no-store","X-Accel-Buffering":"no"}});
  } catch {return Response.json({error:"Live receiver is offline. Start .womp with npm run dev, which starts the receiver too."},{status:503});}
}
