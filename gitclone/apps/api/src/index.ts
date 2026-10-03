import { serve } from "@hono/node-server";
import app from "./app.js";
import { env } from "./config/env.js";
import { startWorkers } from "./jobs/worker.js";
import { bootstrapSharedPat } from "./services/auth/pat.service.js";

startWorkers();
await bootstrapSharedPat();

const port = env.PORT;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port} [${env.NODE_ENV}]`);
});
