import crypto from "crypto";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema/audit-log.js";
import { desc, eq, asc } from "drizzle-orm";
import { redactSensitive } from "../security/redact.js";

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export interface WriteAuditOptions {
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  confirmationTokenId?: string;
}

export function computeAuditEntryHash(
  prevHash: string,
  userId: string,
  action: string,
  target: string,
  status: "success" | "failure",
  metadataJson: unknown,
  correlationId?: string
): string {
  const canonical = `${prevHash}||${userId}||${action}||${target}||${status}||${JSON.stringify(metadataJson ?? {})}||${correlationId ?? ""}`;
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

export async function writeAudit(
  userId: string,
  action: string,
  target: string,
  status: "success" | "failure",
  optionsOrMetadata?: WriteAuditOptions | Record<string, unknown>
): Promise<void> {
  const options: WriteAuditOptions =
    optionsOrMetadata && ("metadata" in optionsOrMetadata || "ip" in optionsOrMetadata || "correlationId" in optionsOrMetadata)
      ? (optionsOrMetadata as WriteAuditOptions)
      : { metadata: optionsOrMetadata as Record<string, unknown> };

  const sanitizedMetadata = options.metadata
    ? (redactSensitive(options.metadata) as Record<string, unknown>)
    : null;

  // Retrieve the latest entry hash for this user's audit chain
  const [latestEntry] = await db
    .select({ entryHash: auditLog.entryHash })
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(1);

  const prevHash = latestEntry?.entryHash ?? GENESIS_HASH;
  const entryHash = computeAuditEntryHash(
    prevHash,
    userId,
    action,
    target,
    status,
    sanitizedMetadata,
    options.correlationId
  );

  await db.insert(auditLog).values({
    userId,
    action,
    target,
    status,
    metadataJson: sanitizedMetadata,
    prevHash,
    entryHash,
    ip: options.ip,
    userAgent: options.userAgent,
    correlationId: options.correlationId,
    confirmationTokenId: options.confirmationTokenId,
  });
}

export async function verifyAuditChain(
  userId?: string
): Promise<{ valid: boolean; brokenAtId?: string; totalEntries: number }> {
  const query = db
    .select()
    .from(auditLog)
    .orderBy(asc(auditLog.createdAt));

  const entries = userId
    ? await query.where(eq(auditLog.userId, userId))
    : await query;

  if (entries.length === 0) {
    return { valid: true, totalEntries: 0 };
  }

  // If verifying per user or globally
  const prevHashesByUser = new Map<string, string>();

  for (const entry of entries) {
    const expectedPrevHash = prevHashesByUser.get(entry.userId) ?? GENESIS_HASH;

    if (entry.prevHash && entry.prevHash !== expectedPrevHash) {
      return { valid: false, brokenAtId: entry.id, totalEntries: entries.length };
    }

    if (entry.entryHash) {
      const calculatedHash = computeAuditEntryHash(
        entry.prevHash ?? GENESIS_HASH,
        entry.userId,
        entry.action,
        entry.target,
        entry.status,
        entry.metadataJson,
        entry.correlationId ?? undefined
      );

      if (entry.entryHash !== calculatedHash) {
        return { valid: false, brokenAtId: entry.id, totalEntries: entries.length };
      }

      prevHashesByUser.set(entry.userId, entry.entryHash);
    }
  }

  return { valid: true, totalEntries: entries.length };
}
