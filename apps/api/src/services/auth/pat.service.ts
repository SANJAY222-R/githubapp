import { Octokit } from "@octokit/rest";
import { db } from "../../db/client.js";
import { users } from "../../db/schema/users.js";
import { credentials } from "../../db/schema/credentials.js";
import { encryptToken } from "../../security/vault.js";
import { eq } from "drizzle-orm";
import { mapGithubError } from "../../github/errors.js";

export async function connectPat(token: string): Promise<{ userId: string }> {
  const octokit = new Octokit({ auth: token });

  let githubUser: Awaited<ReturnType<typeof octokit.users.getAuthenticated>>["data"];
  try {
    const res = await octokit.users.getAuthenticated();
    githubUser = res.data;
  } catch (err) {
    throw mapGithubError(err);
  }

  const tokenEnc = encryptToken(token);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.githubId, githubUser.id))
    .limit(1);

  let userId: string;

  if (existing.length > 0 && existing[0]) {
    userId = existing[0].id;
    await db
      .update(users)
      .set({
        login: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        name: githubUser.name ?? null,
        email: githubUser.email ?? null,
      })
      .where(eq(users.id, userId));

    await db
      .delete(credentials)
      .where(eq(credentials.userId, userId));
  } else {
    const inserted = await db
      .insert(users)
      .values({
        githubId: githubUser.id,
        login: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        name: githubUser.name ?? null,
        email: githubUser.email ?? null,
      })
      .returning({ id: users.id });

    if (!inserted[0]) throw new Error("Failed to create user");
    userId = inserted[0].id;
  }

  await db.insert(credentials).values({
    userId,
    authType: "pat",
    tokenEnc,
    lastValidatedAt: new Date(),
  });

  return { userId };
}
