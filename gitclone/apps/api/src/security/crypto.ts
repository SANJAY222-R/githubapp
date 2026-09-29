import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function normalizeKey(keyInput: string): Buffer {
  const base64Buf = Buffer.from(keyInput, "base64");
  if (base64Buf.length === 32) {
    return base64Buf;
  }
  if (keyInput.length === 64) {
    const hexBuf = Buffer.from(keyInput, "hex");
    if (hexBuf.length === 32) {
      return hexBuf;
    }
  }
  const utf8Buf = Buffer.from(keyInput, "utf8");
  if (utf8Buf.length === 32) {
    return utf8Buf;
  }
  return createHash("sha256").update(keyInput).digest();
}

export function generateDek(): Buffer {
  return randomBytes(32);
}

export function computeFingerprint(token: string): string {
  const prefix = token.startsWith("github_pat_")
    ? "github_pat_"
    : token.startsWith("ghp_")
    ? "ghp_"
    : token.startsWith("gho_")
    ? "gho_"
    : "token_";
  const hash = createHash("sha256").update(token).digest("hex").slice(0, 16);
  return `${prefix}${hash}`;
}

export function encryptWithAad(plaintext: string, key: Buffer, aad?: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  if (aad) {
    cipher.setAAD(Buffer.from(aad, "utf8"));
  }
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptWithAad(ciphertext: string, key: Buffer, aad?: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid ciphertext format");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  if (aad) {
    decipher.setAAD(Buffer.from(aad, "utf8"));
  }
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export function encrypt(plaintext: string, keyInput: string): string {
  const key = normalizeKey(keyInput);
  return encryptWithAad(plaintext, key);
}

export function decrypt(ciphertext: string, keyInput: string): string {
  const key = normalizeKey(keyInput);
  return decryptWithAad(ciphertext, key);
}
