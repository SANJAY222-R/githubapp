import { encrypt, decrypt, encryptWithAad, decryptWithAad, generateDek, computeFingerprint } from "./crypto.js";
import { kms } from "./kms.js";
import { env } from "../config/env.js";

export interface EncryptCredentialParams {
  token: string;
  userId: string;
  credentialId: string;
  authType: "oauth" | "pat";
  keyVersion?: number;
}

export interface EncryptedCredentialResult {
  tokenEnc: string;
  dekWrapped: string;
  keyVersion: number;
  tokenFingerprint: string;
}

export interface DecryptCredentialParams {
  tokenEnc: string;
  dekWrapped?: string | null;
  keyVersion?: number | null;
  userId: string;
  credentialId: string;
  authType: "oauth" | "pat";
}

export function buildCredentialAad(userId: string, credentialId: string, authType: string, keyVersion: number): string {
  return `${userId}||${credentialId}||${authType}||${keyVersion}`;
}

export async function encryptCredentialToken(params: EncryptCredentialParams): Promise<EncryptedCredentialResult> {
  const activeVersion = params.keyVersion ?? kms.getActiveKeyVersion();
  const dek = generateDek();
  const aad = buildCredentialAad(params.userId, params.credentialId, params.authType, activeVersion);

  const tokenEnc = encryptWithAad(params.token, dek, aad);
  const { dekWrapped, keyVersion } = await kms.wrapKey(dek, activeVersion);
  const tokenFingerprint = computeFingerprint(params.token);

  return {
    tokenEnc,
    dekWrapped,
    keyVersion,
    tokenFingerprint,
  };
}

export async function decryptCredentialToken(params: DecryptCredentialParams): Promise<string> {
  if (params.dekWrapped) {
    const version = params.keyVersion ?? 1;
    const dek = await kms.unwrapKey(params.dekWrapped, version);
    const aad = buildCredentialAad(params.userId, params.credentialId, params.authType, version);
    return decryptWithAad(params.tokenEnc, dek, aad);
  }

  // Fallback for legacy un-enveloped credentials
  return decrypt(params.tokenEnc, env.TOKEN_ENCRYPTION_KEY);
}

// Fallback convenience methods
export function encryptToken(token: string): string {
  return encrypt(token, env.TOKEN_ENCRYPTION_KEY);
}

export function decryptToken(ciphertext: string): string {
  return decrypt(ciphertext, env.TOKEN_ENCRYPTION_KEY);
}
