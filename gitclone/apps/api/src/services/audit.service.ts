import { db } from "../db/client.js";
import { auditLog } from "../db/schema/audit-log.js";

export async function writeAudit(
  userId: string,
  action: string,
  target: string,
  status: "success" | "failure",
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.insert(auditLog).values({
    userId,
    action,
    target,
    status,
    metadataJson: metadata ?? null,
  });
}
