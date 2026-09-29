import { mapGithubError } from "./errors.js";

export async function retryIdempotent<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const mapped = mapGithubError(err);
      if (mapped.status === 429 && "retryAfter" in mapped) {
        const delay = (mapped as { retryAfter: number }).retryAfter * 1000;
        await new Promise((r) => setTimeout(r, Math.min(delay, 60_000)));
        continue;
      }
      if (mapped.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      throw mapped;
    }
  }
  throw mapGithubError(lastError);
}
