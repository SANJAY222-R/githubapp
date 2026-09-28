import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      APP_URL: "http://localhost:5173",
      API_URL: "http://localhost:8787",
      PORT: "8787",
      SESSION_SECRET: "01234567890123456789012345678901",
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/gitclone_test",
      REDIS_URL: "redis://localhost:6379",
      TOKEN_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      GITHUB_CLIENT_ID: "test_client_id",
      GITHUB_CLIENT_SECRET: "test_client_secret",
      GITHUB_WEBHOOK_SECRET: "test_webhook_secret",
      FEATURE_AI: "false",
    },
  },
});
