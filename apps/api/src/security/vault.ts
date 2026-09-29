import { encrypt, decrypt } from "./crypto.js";
import { env } from "../config/env.js";

export function encryptToken(token: string): string {
  return encrypt(token, env.TOKEN_ENCRYPTION_KEY);
}

export function decryptToken(ciphertext: string): string {
  return decrypt(ciphertext, env.TOKEN_ENCRYPTION_KEY);
}
