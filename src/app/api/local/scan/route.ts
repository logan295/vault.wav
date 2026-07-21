import { z } from "zod";
import { assertLocalRequest, scanVolumes } from "@/lib/local-audio/library";

export const runtime = "nodejs";

const scanSchema = z.object({ volumeIds: z.array(z.string().length(24)).max(16) });

export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const body = scanSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return Response.json({ error: "Invalid USB selection." }, { status: 400 });
    const result = await scanVolumes([...new Set(body.data.volumeIds)]);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The scan could not be completed." }, { status: 500 });
  }
}

