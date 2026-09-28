import { describe, it, expect } from "vitest";
import { verifyWebhookSignature } from "../../security/webhookSignature.js";
import { createHmac } from "crypto";

describe("verifyWebhookSignature", () => {
  const secret = "test_webhook_secret_key";
  const payload = JSON.stringify({ action: "opened", number: 42 });

  it("returns true for a valid HMAC-SHA256 signature", () => {
    const signature = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    expect(verifyWebhookSignature(payload, "sha256=invalid_hex_string_12345", secret)).toBe(false);
  });

  it("returns false for a mismatched secret", () => {
    const signature = "sha256=" + createHmac("sha256", "wrong_secret").update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(false);
  });

  it("returns false for empty or malformed signature", () => {
    expect(verifyWebhookSignature(payload, "", secret)).toBe(false);
    expect(verifyWebhookSignature(payload, "malformed", secret)).toBe(false);
  });
});
