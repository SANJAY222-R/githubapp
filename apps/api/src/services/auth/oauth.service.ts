import { Octokit } from "@octokit/rest";
import { db } from "../../db/client.js";
import { users } from "../../db/schema/users.js";
import { credentials } from "../../db/schema/credentials.js";
import { encryptToken } from "../../security/vault.js";
import { eq } from "drizzle-orm";
import { env } from "../../config/env.js";

type OAuthTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
};

export async function getOAuthAuthorizationUrl(state: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.API_URL}/api/auth/oauth/callback`,
    scope: "repo read:user notifications",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function handleOAuthCallback(
  code: string
): Promise<{ userId: string }> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${env.API_URL}/api/auth/oauth/callback`,
    }),
  });

  const tokenData = (await tokenRes.json()) as OAuthTokenResponse;
  if (!tokenData.access_token) throw new Error("Failed to get access token");

  const token = tokenData.access_token;
  const tokenEnc = encryptToken(token);

  const octokit = new Octokit({ auth: token });
  const { data: githubUser } = await octokit.users.getAuthenticated();

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
    await db.delete(credentials).where(eq(credentials.userId, userId));
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
    authType: "oauth",
    tokenEnc,
    scopes: tokenData.scope,
    lastValidatedAt: new Date(),
  });

  return { userId };
}
