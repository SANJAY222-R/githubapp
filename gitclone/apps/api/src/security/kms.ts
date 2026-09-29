import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { env } from "../config/env.js";

export interface KmsAdapter {
  wrapKey(dek: Buffer, keyVersion?: number): Promise<{ dekWrapped: string; keyVersion: number }>;
  unwrapKey(dekWrapped: string, keyVersion: number): Promise<Buffer>;
  getActiveKeyVersion(): number;
}

const KEK_ALGORITHM = "aes-256-gcm";
const KEK_IV_LENGTH = 12;
const KEK_TAG_LENGTH = 16;

function deriveKek(masterKeyInput: string): Buffer {
  const base64Buf = Buffer.from(masterKeyInput, "base64");
  if (base64Buf.length === 32) return base64Buf;
  if (masterKeyInput.length === 64) {
    const hexBuf = Buffer.from(masterKeyInput, "hex");
    if (hexBuf.length === 32) return hexBuf;
  }
  const utf8Buf = Buffer.from(masterKeyInput, "utf8");
  if (utf8Buf.length === 32) return utf8Buf;
  return createHash("sha256").update(masterKeyInput).digest();
}

export class SecretsManagerKmsAdapter implements KmsAdapter {
  private masterKeys: Map<number, Buffer> = new Map();
  private activeVersion: number = 1;

  constructor(primaryMasterKey: string, previousMasterKeys?: Record<number, string>) {
    const primaryKek = deriveKek(primaryMasterKey);
    this.masterKeys.set(this.activeVersion, primaryKek);

    if (previousMasterKeys) {
      for (const [ver, key] of Object.entries(previousMasterKeys)) {
        this.masterKeys.set(Number(ver), deriveKek(key));
      }
    }
  }

  getActiveKeyVersion(): number {
    return this.activeVersion;
  }

  async wrapKey(dek: Buffer, keyVersion?: number): Promise<{ dekWrapped: string; keyVersion: number }> {
    const version = keyVersion ?? this.activeVersion;
    const kek = this.masterKeys.get(version);
    if (!kek) {
      throw new Error(`Master key version ${version} not available for wrapping`);
    }

    const iv = randomBytes(KEK_IV_LENGTH);
    const cipher = createCipheriv(KEK_ALGORITHM, kek, iv);
    const aad = Buffer.from(`kms:kek:v${version}`, "utf8");
    cipher.setAAD(aad);

    const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
    const tag = cipher.getAuthTag();

    const dekWrapped = Buffer.concat([iv, tag, encrypted]).toString("base64");
    return { dekWrapped, keyVersion: version };
  }

  async unwrapKey(dekWrapped: string, keyVersion: number): Promise<Buffer> {
    const kek = this.masterKeys.get(keyVersion);
    if (!kek) {
      throw new Error(`Master key version ${keyVersion} not available for unwrapping`);
    }

    const buf = Buffer.from(dekWrapped, "base64");
    if (buf.length < KEK_IV_LENGTH + KEK_TAG_LENGTH) {
      throw new Error("Invalid wrapped key format");
    }

    const iv = buf.subarray(0, KEK_IV_LENGTH);
    const tag = buf.subarray(KEK_IV_LENGTH, KEK_IV_LENGTH + KEK_TAG_LENGTH);
    const encrypted = buf.subarray(KEK_IV_LENGTH + KEK_TAG_LENGTH);

    const decipher = createDecipheriv(KEK_ALGORITHM, kek, iv);
    const aad = Buffer.from(`kms:kek:v${keyVersion}`, "utf8");
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}

export const kms: KmsAdapter = new SecretsManagerKmsAdapter(env.TOKEN_ENCRYPTION_KEY);
