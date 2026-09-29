import { describe, it, expect } from "vitest";
import { hashSessionId, generateSessionId } from "../../services/auth/session.service.js";

describe("Session security", () => {
  it("generates high-entropy session IDs", () => {
    const s1 = generateSessionId();
    const s2 = generateSessionId();
    expect(s1).not.toBe(s2);
    expect(s1.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes session ID deterministically with SHA-256", () => {
    const rawId = "user_raw_session_token_1234567890";
    const hash1 = hashSessionId(rawId);
    const hash2 = hashSessionId(rawId);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(rawId);
    expect(hash1.length).toBe(64); // 256-bit hex
  });
});
