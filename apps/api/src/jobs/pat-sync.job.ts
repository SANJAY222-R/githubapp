import { db } from "../db/client.js";
import { credentials } from "../db/schema/credentials.js";
import { eq } from "drizzle-orm";
import { getGithubClient } from "../github/client.js";

export async function syncPatUsers() {
  const patCreds = await db.select().from(credentials).where(eq(credentials.authType, "pat"));
  for (const cred of patCreds) {
    try {
      const octokit = await getGithubClient(cred.userId);
      await octokit.users.getAuthenticated();
      await db.update(credentials).set({ lastValidatedAt: new Date() }).where(eq(credentials.id, cred.id));
    } catch {
      // credential may be revoked — leave for manual disconnection
    }
  }
}
