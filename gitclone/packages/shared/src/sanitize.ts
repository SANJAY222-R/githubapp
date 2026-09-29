// Disallow javascript:, data:, vbscript: protocols and null bytes in URLs
export const SAFE_URL_PATTERN = /^(?:(?:https?|mailto):|\/|#)/i;

export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.includes("\0") ||
    trimmed.includes("%00")
  ) {
    return false;
  }
  return SAFE_URL_PATTERN.test(trimmed);
}
