import { createReadStream } from "node:fs";
import { stat, readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { assertLocalRequest } from "@/lib/local-audio/library";
import { vfxPath } from "@/lib/vfx/library";
export const runtime = "nodejs";
export async function GET(request: Request,context: {params:Promise<{id:string}>}) {
  try {
    assertLocalRequest(request); const {id}=await context.params;
    const poster=new URL(request.url).searchParams.has("poster");
    const path=vfxPath(id,poster?"poster":"video");
    const headers=new Headers({"content-type":poster?"image/jpeg":"video/mp4","cache-control":"private, max-age=86400","x-content-type-options":"nosniff"});
    if(poster) return new Response(new Uint8Array(await readFile(path)),{headers});
    const {size}=await stat(path); headers.set("accept-ranges","bytes");
    const range=request.headers.get("range");let start=0,end=size-1;
    if(range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!match || (!match[1]&&!match[2]))return new Response(null,{status:416,headers:{"content-range":`bytes */${size}`}});
      start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
      end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=size)return new Response(null,{status:416,headers:{"content-range":`bytes */${size}`}});
      headers.set("content-range",`bytes ${start}-${end}/${size}`);
    }
    headers.set("content-length",String(end-start+1));
    const stream=Readable.toWeb(createReadStream(path,{start,end})) as ReadableStream<Uint8Array>;
    return new Response(stream,{status:range?206:200,headers});
  } catch { return new Response(null,{status:404}); }
}
