import { listRepos } from "../services/repos.service.js";
import { setCache } from "../cache/cache.js";
import { cacheKey } from "../cache/keys.js";

export async function runPrefetch(userId: string) {
  const repos = await listRepos(userId, 1);
  await setCache(cacheKey(userId, "repos", "page", 1), repos, 300);
}
