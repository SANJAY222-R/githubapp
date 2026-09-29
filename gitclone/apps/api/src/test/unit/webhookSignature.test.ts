import { describe, it, expect } from "vitest";
import {
  verifyWebhookSignature,
  verifyWebhookSignatureWithRotation,
} from "../../security/webhookSignature.js";
import { createHmac } from "crypto";

describe("verifyWebhookSignature & Dual-Secret Rotation", () => {
  const primarySecret = "primary_webhook_secret_key_123";
  const fallbackSecret = "secondary_webhook_secret_key_456";
  const payload = JSON.stringify({ action: "opened", number: 42 });

  it("returns true for a valid HMAC-SHA256 signature with primary secret", () => {
    const signature = "sha256=" + createHmac("sha256", primarySecret).update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, signature, primarySecret)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    expect(verifyWebhookSignature(payload, "sha256=invalid_hex_string_12345", primarySecret)).toBe(false);
  });

  it("returns false for a mismatched secret", () => {
    const signature = "sha256=" + createHmac("sha256", "wrong_secret").update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, signature, primarySecret)).toBe(false);
  });

  it("returns false for empty or malformed signature without throwing", () => {
    expect(verifyWebhookSignature(payload, "", primarySecret)).toBe(false);
    expect(verifyWebhookSignature(payload, "malformed", primarySecret)).toBe(false);
    expect(verifyWebhookSignature(payload, "sha256=short", primarySecret)).toBe(false);
  });

  it("supports dual-secret rotation (validates either primary or fallback secret)", () => {
    const primarySig = "sha256=" + createHmac("sha256", primarySecret).update(payload).digest("hex");
    const fallbackSig = "sha256=" + createHmac("sha256", fallbackSecret).update(payload).digest("hex");
    const invalidSig = "sha256=" + createHmac("sha256", "old_retired_secret").update(payload).digest("hex");

    const secrets = [primarySecret, fallbackSecret];

    expect(verifyWebhookSignatureWithRotation(payload, primarySig, secrets)).toBe(true);
    expect(verifyWebhookSignatureWithRotation(payload, fallbackSig, secrets)).toBe(true);
    expect(verifyWebhookSignatureWithRotation(payload, invalidSig, secrets)).toBe(false);
  });
});
