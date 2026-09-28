const TOKEN_PATTERN = /(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]+/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;

export function redact(value: string): string {
  return value
    .replace(TOKEN_PATTERN, "[REDACTED]")
    .replace(BEARER_PATTERN, "Bearer [REDACTED]");
}

export function redactObject(obj: unknown): unknown {
  if (typeof obj === "string") return redact(obj);
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, redactObject(v)])
    );
  }
  return obj;
}
