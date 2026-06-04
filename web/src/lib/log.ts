import { db } from "./db";
import type { LogAction, LogResource, Prisma } from "@/generated/prisma/client";

export async function writeLog(params: {
  userId: string | null;
  userEmail: string;
  action: LogAction;
  resource: LogResource;
  resourceId: string;
  resourceName: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const { detail, ...rest } = params;
  await db.activityLog.create({
    data: {
      ...rest,
      ...(detail !== undefined ? { detail: detail as Prisma.InputJsonValue } : {}),
    },
  });
}
