import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { readWavMetadata } from "./read-wav-metadata";
import type { UploadProgress } from "./types";

type UploadWavOptions = {
  file: File;
  onProgress?: (progress: UploadProgress) => void;
};

function storageEndpoint(projectUrl: string) {
  const url = new URL(projectUrl);
  const projectId = url.hostname.split(".")[0];
  return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
}

export async function uploadWav({ file, onProgress }: UploadWavOptions) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Sign in before uploading audio.");

  const metadata = await readWavMetadata(file);
  const trackId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `${session.user.id}/${trackId}/${safeName}`;
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!projectUrl) throw new Error("Supabase is not configured.");

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: storageEndpoint(projectUrl),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: "audio",
        objectName: storagePath,
        contentType: metadata.mimeType,
        cacheControl: "3600",
      },
      onError: reject,
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress?.({
          bytesUploaded,
          bytesTotal,
          percentage: bytesTotal ? (bytesUploaded / bytesTotal) * 100 : 0,
        });
      },
      onSuccess: () => resolve(),
    });

    void upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }, reject);
  });

  const response = await fetch("/api/tracks/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ trackId, storagePath, ...metadata }),
  });

  const result = await response.json();
  if (!response.ok) {
    await supabase.storage.from("audio").remove([storagePath]);
    throw new Error(result.error || "The upload finished, but the track could not be saved.");
  }

  return result.track as { id: string; title: string; storage_path: string };
}
