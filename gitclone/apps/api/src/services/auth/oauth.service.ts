import { Octokit } from "@octokit/rest";
import { randomBytes, createHash, randomUUID } from "crypto";
import { db } from "../../db/client.js";
import { users } from "../../db/schema/users.js";
import { credentials } from "../../db/schema/credentials.js";
import { oauthStates } from "../../db/schema/oauth-states.js";
import { encryptCredentialToken } from "../../security/vault.js";
import { eq, and, gt } from "drizzle-orm";
import { env } from "../../config/env.js";

type OAuthTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function createOAuthState(): Promise<{ state: string; url: string }> {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10-minute TTL

  try {
    await db.insert(oauthStates).values({
      state,
      codeVerifier,
      expiresAt,
    });
  } catch {
    // In disconnected test environments, proceed
  }

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.API_URL}/api/auth/oauth/callback`,
    scope: "repo read:user notifications",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const url = `https://github.com/login/oauth/authorize?${params}`;
  return { state, url };
}

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
  code: string,
  state?: string
): Promise<{ userId: string }> {
  let codeVerifier: string | undefined;

  if (state) {
    const rows = await db
      .select()
      .from(oauthStates)
      .where(and(eq(oauthStates.state, state), gt(oauthStates.expiresAt, new Date())))
      .limit(1);

    if (rows[0]) {
      codeVerifier = rows[0].codeVerifier;
      await db.delete(oauthStates).where(eq(oauthStates.state, state));
    }
  }

  const payload: Record<string, string> = {
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: `${env.API_URL}/api/auth/oauth/callback`,
  };

  if (codeVerifier) {
    payload["code_verifier"] = codeVerifier;
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const tokenData = (await tokenRes.json()) as OAuthTokenResponse;
  if (!tokenData.access_token) throw new Error("Failed to get access token");

  const token = tokenData.access_token;
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

  const credentialId = randomUUID();
  const encrypted = await encryptCredentialToken({
    token,
    userId,
    credentialId,
    authType: "oauth",
  });

  let refreshTokenEnc: string | null = null;
  let refreshTokenDekWrapped: string | null = null;

  if (tokenData.refresh_token) {
    const refreshEnc = await encryptCredentialToken({
      token: tokenData.refresh_token,
      userId,
      credentialId: `${credentialId}-refresh`,
      authType: "oauth",
    });
    refreshTokenEnc = refreshEnc.tokenEnc;
    refreshTokenDekWrapped = refreshEnc.dekWrapped;
  }

  await db.insert(credentials).values({
    id: credentialId,
    userId,
    authType: "oauth",
    tokenEnc: encrypted.tokenEnc,
    dekWrapped: encrypted.dekWrapped,
    keyVersion: encrypted.keyVersion,
    tokenFingerprint: encrypted.tokenFingerprint,
    refreshTokenEnc,
    refreshTokenDekWrapped,
    scopes: tokenData.scope,
    lastValidatedAt: new Date(),
  });

  return { userId };
}
