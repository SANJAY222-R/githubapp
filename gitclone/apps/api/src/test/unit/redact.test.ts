import { describe, it, expect } from "vitest";
import { redact, redactObject } from "../../security/redact.js";

describe("redact", () => {
  it("redacts classic personal access tokens (ghp_)", () => {
    expect(redact("token=ghp_1234567890abcdef1234567890abcdef123456")).toBe("token=[REDACTED]");
  });

  it("redacts fine-grained personal access tokens (github_pat_)", () => {
    expect(redact("key=github_pat_11AAAAAAA0123456789_abcdef")).toBe("key=[REDACTED]");
  });

  it("redacts OAuth tokens (gho_, ghu_, ghs_, ghr_)", () => {
    expect(redact("gho_123 ghu_456 ghs_789 ghr_abc")).toBe("[REDACTED] [REDACTED] [REDACTED] [REDACTED]");
  });

  it("redacts Bearer auth headers", () => {
    expect(redact("Authorization: Bearer secret_bearer_token_value_123")).toBe("Authorization: Bearer [REDACTED]");
  });

  it("redacts nested objects and arrays", () => {
    const data = {
      user: "alice",
      token: "ghp_secretToken123",
      nested: {
        keys: ["github_pat_secret456", "public_val"],
      },
    };
    const cleaned = redactObject(data) as typeof data;
    expect(cleaned.user).toBe("alice");
    expect(cleaned.token).toBe("[REDACTED]");
    expect(cleaned.nested.keys[0]).toBe("[REDACTED]");
    expect(cleaned.nested.keys[1]).toBe("public_val");
  });
});
