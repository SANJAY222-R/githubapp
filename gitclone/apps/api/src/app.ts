import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { requestLog } from "./middleware/requestLog.js";
import { sessionMiddleware } from "./middleware/session.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";
import { csrfMiddleware } from "./middleware/csrf.js";
import { originCheck } from "./middleware/originCheck.js";
import { defaultBodyLimit } from "./middleware/bodyLimit.js";
import { requestTimeout } from "./middleware/timeout.js";

import authRoutes from "./routes/auth.routes.js";
import meRoutes from "./routes/me.routes.js";
import reposRoutes from "./routes/repos.routes.js";
import filesRoutes from "./routes/files.routes.js";
import branchesRoutes from "./routes/branches.routes.js";
import commitsRoutes from "./routes/commits.routes.js";
import pullsRoutes from "./routes/pulls.routes.js";
import issuesRoutes from "./routes/issues.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import streamRoutes from "./routes/stream.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import confirmRoutes from "./routes/confirm.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const possibleWebPaths = [
  path.resolve(__dirname, "../../web/dist"),
  path.resolve(__dirname, "../../../apps/web/dist"),
  path.resolve(process.cwd(), "apps/web/dist"),
  path.resolve(process.cwd(), "web/dist"),
  path.resolve(process.cwd(), "public"),
];

const webDistPath = possibleWebPaths.find((p) => fs.existsSync(p));

const app = new Hono();

app.use("*", cors({ origin: env.APP_URL, credentials: true }));
app.use("*", securityHeaders);
app.use("*", requestTimeout(15000));
app.use("*", requestLog);
app.use("*", sessionMiddleware);
app.use("*", rateLimitMiddleware);
// Webhooks must be mounted before CSRF — GitHub POSTs won't include x-csrf-token
app.route("/api/webhooks", webhooksRoutes);
app.use("/api/*", originCheck);
app.use("/api/*", csrfMiddleware);
app.use("/api/*", defaultBodyLimit);
app.onError(errorHandler);

app.route("/api/auth", authRoutes);
app.route("/api/confirm", confirmRoutes);
app.route("/api/me", meRoutes);
app.route("/api/repos", reposRoutes);
app.route("/api/repos", filesRoutes);
app.route("/api/repos", branchesRoutes);
app.route("/api/repos", commitsRoutes);
app.route("/api/repos", pullsRoutes);
app.route("/api/repos", issuesRoutes);
app.route("/api", reposRoutes);
app.route("/api", filesRoutes);
app.route("/api", branchesRoutes);
app.route("/api", commitsRoutes);
app.route("/api", pullsRoutes);
app.route("/api", issuesRoutes);
app.route("/api/notifications", notificationsRoutes);
app.route("/api/stream", streamRoutes);
app.route("/api/ai", aiRoutes);

app.get("/api/health", (c) => c.json({ status: "ok", ts: Date.now() }));

app.get("/.well-known/security.txt", (c) => {
  const content = `Contact: mailto:security@gitclone.dev\nExpires: 2027-12-31T23:59:59.000Z\nPreferred-Languages: en\nCanonical: https://gitclone.dev/.well-known/security.txt\nPolicy: https://gitclone.dev/security\n`;
  return c.text(content, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

// Static Client File Serving & SPA Fallback
if (webDistPath) {
  const relativeRoot = path.relative(process.cwd(), webDistPath).replace(/\\/g, "/");
  app.use("/*", serveStatic({ root: relativeRoot || "." }));

  // Fallback for SPA routing on non-API GET paths
  app.get("*", async (c) => {
    const indexPath = path.join(webDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, "utf-8");
      return c.html(html);
    }
    return c.text("GitClone UI Loading...", 200);
  });
}

export default app;

