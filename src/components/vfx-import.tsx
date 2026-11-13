"use client";
import { useState } from "react";
import type { VfxClip } from "@/lib/vfx/types";
import { VFX_SOURCES } from "@/lib/vfx/types";

async function thumbnail(file: File): Promise<Blob> {
  const url=URL.createObjectURL(file);const video=document.createElement("video");
  video.muted=true;video.preload="auto";video.src=url;
  try {
    await new Promise<void>((resolve,reject)=>{
      const timer=window.setTimeout(()=>reject(new Error("Video did not load. Convert it to H.264 MP4 first.")),15000);
      video.onloadeddata=()=>{clearTimeout(timer);resolve();};
      video.onerror=()=>{clearTimeout(timer);reject(new Error("This video codec is unsupported. Convert to H.264 MP4 first."));};
    });
    const canvas=document.createElement("canvas");canvas.width=480;canvas.height=270;
    canvas.getContext("2d")!.drawImage(video,0,0,480,270);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("Could not create thumbnail.")),"image/jpeg",.8));
  } finally { video.pause();video.removeAttribute("src");video.load();URL.revokeObjectURL(url); }
}
export function VfxImport({onImport}:{onImport:(clip:VfxClip)=>void}) {
  const [busy,setBusy]=useState(false),[status,setStatus]=useState("");
  return <div className="desk-vfx-import">
    <label className="desk-pad desk-import-button">{busy?"Importing…":"＋ Import MP4 loops"}<input type="file" accept="video/mp4,.mp4" multiple disabled={busy} onChange={async event=>{
      const files=Array.from(event.target.files??[]);event.target.value="";setBusy(true);
      let count=0;
      try { for(const file of files){
        if(file.size>150*1024*1024)throw new Error(`${file.name}: maximum 150 MB per clip.`);
        setStatus(`Preparing ${file.name}…`);
        const poster=await thumbnail(file);const form=new FormData();form.set("video",file);form.set("poster",poster,"poster.jpg");
        const response=await fetch("/api/local/vfx",{method:"POST",body:form});const body=await response.json();
        if(!response.ok)throw new Error(body.error||"Import failed.");onImport(body.clip);count++;
      }setStatus(`${count} clip${count===1?"":"s"} added to My imports.`);
      }catch(error){setStatus(`${count?`${count} imported. `:""}${error instanceof Error?error.message:"Import failed."}`);}finally{setBusy(false);}
    }}/></label>
    <small role="status" className="desk-hint">{status||"H.264 MP4 · up to 150 MB each · stored on this Mac"}</small>
    <details className="desk-vfx-sources"><summary>Find professional loop packs ↗</summary>{VFX_SOURCES.map(source=><a key={source.name} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name} ↗</strong><small>{source.detail}</small></a>)}</details>
  </div>;
}
