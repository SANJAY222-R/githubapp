const TOKEN_PATTERNS = [
  /gh[pousr]_[A-Za-z0-9_]+/gi,
  /github_pat_[A-Za-z0-9_]+/gi,
];

const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-csrf-token",
  "token",
  "secret",
  "password",
  "key",
  "tokenenc",
  "token_enc",
  "dekwrapped",
  "dek_wrapped",
  "codeverifier",
  "code_verifier",
  "apikey",
  "api_key",
  "client_secret",
  "session_secret",
]);

export function redact(value: string): string {
  let result = value;
  for (const pattern of TOKEN_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  result = result.replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]");
  result = result.replace(/Basic\s+[^\s]+/gi, "Basic [REDACTED]");
  return result;
}

export function redactObject(obj: unknown): unknown {
  if (typeof obj === "string") return redact(obj);
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        const lowerKey = k.toLowerCase().replace(/[-_]/g, "");
        if (SENSITIVE_KEYS.has(k.toLowerCase()) || SENSITIVE_KEYS.has(lowerKey)) {
          return [k, "[REDACTED]"];
        }
        return [k, redactObject(v)];
      })
    );
  }
  return obj;
}

export const redactSensitive = redactObject;

