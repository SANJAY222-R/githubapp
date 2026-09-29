import { invalidatePattern } from "./cache.js";

export async function invalidateOnPush(userId: string, owner: string, repo: string) {
  await Promise.all([
    invalidatePattern(`cache:${userId}:commits:${owner}:${repo}:*`),
    invalidatePattern(`cache:${userId}:branches:${owner}:${repo}:*`),
    invalidatePattern(`cache:${userId}:tree:${owner}:${repo}:*`),
  ]);
}

export async function invalidateOnRepoCUD(userId: string) {
  await invalidatePattern(`cache:${userId}:repos:*`);
}

export async function invalidateOnPR(userId: string, owner: string, repo: string) {
  await invalidatePattern(`cache:${userId}:pulls:${owner}:${repo}:*`);
}
