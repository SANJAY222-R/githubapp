import { serve } from "@hono/node-server";
import app from "./app.js";
import { env } from "./config/env.js";
import { startWorkers } from "./jobs/worker.js";

startWorkers();

const port = env.PORT;
serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port} [${env.NODE_ENV}]`);
});
