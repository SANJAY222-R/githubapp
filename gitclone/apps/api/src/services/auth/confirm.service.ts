import crypto from "crypto";
import { db } from "../../db/client.js";
import { confirmTokens } from "../../db/schema/confirm-tokens.js";
import { sessions } from "../../db/schema/sessions.js";
import { eq, and, isNull, gt } from "drizzle-orm";
import { ValidationError, ForbiddenError } from "../../errors.js";

const CONFIRM_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STEP_UP_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export async function checkStepUpAuth(userId: string): Promise<boolean> {
  const [session] = await db
    .select({ lastStrongAuthAt: sessions.lastStrongAuthAt })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!session || !session.lastStrongAuthAt) {
    return false;
  }

  const age = Date.now() - new Date(session.lastStrongAuthAt).getTime();
  return age <= STEP_UP_MAX_AGE_MS;
}

export async function issueConfirmToken(
  userId: string,
  action: string,
  target: string,
  skipStepUpCheck = false
): Promise<{ confirmationToken: string; expiresAt: string }> {
  if (!skipStepUpCheck) {
    const isStepUpValid = await checkStepUpAuth(userId);
    if (!isStepUpValid) {
      throw new ForbiddenError(
        "Step-up authentication required. Please re-authenticate before performing this destructive action.",
        "step_up_required"
      );
    }
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + CONFIRM_TOKEN_TTL_MS);

  await db.insert(confirmTokens).values({
    userId,
    action,
    target,
    tokenHash,
    expiresAt,
  });

  return {
    confirmationToken: rawToken,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifyAndConsumeConfirmToken(
  userId: string,
  action: string,
  target: string,
  rawToken: string
): Promise<{ id: string }> {
  if (!rawToken || typeof rawToken !== "string") {
    throw new ValidationError("Confirmation token is required", "invalid_confirm_token");
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const [tokenRecord] = await db
    .select()
    .from(confirmTokens)
    .where(
      and(
        eq(confirmTokens.userId, userId),
        eq(confirmTokens.action, action),
        eq(confirmTokens.target, target),
        eq(confirmTokens.tokenHash, tokenHash),
        isNull(confirmTokens.usedAt),
        gt(confirmTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!tokenRecord) {
    throw new ValidationError(
      "Confirmation token is invalid, expired, or already used",
      "invalid_confirm_token"
    );
  }

  // Consume token (single-use)
  await db
    .update(confirmTokens)
    .set({ usedAt: new Date() })
    .where(eq(confirmTokens.id, tokenRecord.id));

  return { id: tokenRecord.id };
}
