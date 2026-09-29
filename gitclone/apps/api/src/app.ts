import { Hono } from "hono";
import { cors } from "hono/cors";
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

export default app;
