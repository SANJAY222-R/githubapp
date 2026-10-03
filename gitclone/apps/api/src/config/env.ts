import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from workspace root, apps/api, and cwd
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:8787"),
  API_URL: z.string().url().default("http://localhost:8787/api"),
  PORT: z.coerce.number().default(8787),
  SESSION_SECRET: z.string().min(32).default("default_session_secret_change_in_production_32chars"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  TOKEN_ENCRYPTION_KEY: z.string().min(1).default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  GITHUB_PAT: z.string().optional(),
  SYSTEM_GITHUB_PAT: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().default("placeholder_client_id"),
  GITHUB_CLIENT_SECRET: z.string().default("placeholder_client_secret"),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().default("placeholder_webhook_secret"),
  AI_PROVIDER_API_KEY: z.string().optional(),
  FEATURE_AI: z.coerce.boolean().default(false),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
