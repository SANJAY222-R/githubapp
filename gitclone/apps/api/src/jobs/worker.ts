import { Worker } from "bullmq";
import { redis } from "../cache/redis.js";
import { runPrefetch } from "./prefetch.job.js";
import { syncPatUsers } from "./pat-sync.job.js";

export function startWorkers() {
  new Worker(
    "prefetch",
    async (job) => {
      if (job.name === "prefetch" && typeof job.data.userId === "string") {
        await runPrefetch(job.data.userId as string);
      }
    },
    { connection: redis }
  );

  new Worker(
    "pat-sync",
    async (job) => {
      if (job.name === "sync") await syncPatUsers();
    },
    { connection: redis }
  );
}
