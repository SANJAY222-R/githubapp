import { timingSafeEqual, createHmac } from "crypto";

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret || typeof payload !== "string") return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");

  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

export function verifyWebhookSignatureWithRotation(
  payload: string,
  signature: string,
  secrets: (string | undefined)[]
): boolean {
  for (const secret of secrets) {
    if (secret && verifyWebhookSignature(payload, signature, secret)) {
      return true;
    }
  }
  return false;
}
