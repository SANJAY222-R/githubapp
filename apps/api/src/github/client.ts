import { Octokit } from "@octokit/rest";
import { db } from "../db/client.js";
import { credentials } from "../db/schema/credentials.js";
import { eq } from "drizzle-orm";
import { decryptToken } from "../security/vault.js";

const clientCache = new Map<string, Octokit>();

export async function getGithubClient(userId: string): Promise<Octokit> {
  const cached = clientCache.get(userId);
  if (cached) return cached;

  const rows = await db
    .select()
    .from(credentials)
    .where(eq(credentials.userId, userId))
    .limit(1);

  const cred = rows[0];
  if (!cred) throw new Error("No credential found for user");

  const token = decryptToken(cred.tokenEnc);

  const client = new Octokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter: number, options: { method: string; url: string }, _octokit: Octokit, retryCount: number) => {
        if (retryCount < 2) return true;
        return false;
      },
      onSecondaryRateLimit: (_retryAfter: number, options: { method: string; url: string }) => {
        return false;
      },
    },
  });

  clientCache.set(userId, client);
  // Invalidate cache after 30 minutes
  setTimeout(() => clientCache.delete(userId), 30 * 60 * 1000);

  return client;
}
