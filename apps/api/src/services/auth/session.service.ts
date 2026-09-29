import { db } from "../../db/client.js";
import { credentials } from "../../db/schema/credentials.js";
import { users } from "../../db/schema/users.js";
import { eq } from "drizzle-orm";

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
