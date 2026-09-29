import { randomBytes, createHash } from "crypto";
import { db } from "../../db/client.js";
import { sessions } from "../../db/schema/sessions.js";
import { credentials } from "../../db/schema/credentials.js";
import { users } from "../../db/schema/users.js";
import { eq, and, gt } from "drizzle-orm";
import { SESSION_MAX_AGE_MS } from "@gitclone/shared";

export function hashSessionId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const idHash = hashSessionId(sessionId);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await db.insert(sessions).values({
    idHash,
    userId,
    expiresAt,
    lastStrongAuthAt: new Date(),
  });

  return sessionId;
}

export async function rotateSession(oldSessionId: string, userId: string): Promise<string> {
  if (oldSessionId) {
    const oldHash = hashSessionId(oldSessionId);
    await db.delete(sessions).where(eq(sessions.idHash, oldHash));
  }
  return createSession(userId);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const idHash = hashSessionId(sessionId);
  await db.delete(sessions).where(eq(sessions.idHash, idHash));
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function getUserById(userId: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteCredentials(userId: string): Promise<void> {
  await db.delete(credentials).where(eq(credentials.userId, userId));
}

export async function hasCredential(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: credentials.id })
    .from(credentials)
    .where(eq(credentials.userId, userId))
    .limit(1);
  return rows.length > 0;
}

export async function getAuthenticatedUserProfile(userId: string) {
  const { getGithubClient } = await import("../../github/client.js");
  const octokit = await getGithubClient(userId);
  const { data } = await octokit.users.getAuthenticated();
  return {
    name: data.name ?? null,
    bio: data.bio ?? null,
    company: data.company ?? null,
    location: data.location ?? null,
    publicRepos: data.public_repos ?? 0,
    followers: data.followers ?? 0,
    following: data.following ?? 0,
  };
}
