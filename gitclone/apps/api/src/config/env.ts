import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  PORT: z.coerce.number().default(8787),
  SESSION_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  TOKEN_ENCRYPTION_KEY: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
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
