import { storage } from "@/lib/storage";
import type { AiGeneration } from "@/generated/prisma/client";

/** Shape returned to the client for an AI candidate (adds a public image URL). */
export function serializeGeneration(g: AiGeneration) {
  return {
    id: g.id,
    kind: g.kind,
    status: g.status,
    text: g.text,
    imageKey: g.imageKey,
    imageUrl: g.imageKey ? storage.publicUrl(g.imageKey) : null,
    error: g.error,
    model: g.model,
    createdAt: g.createdAt,
  };
}
