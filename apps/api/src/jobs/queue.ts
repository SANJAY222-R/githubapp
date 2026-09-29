import { Queue } from "bullmq";
import { redis } from "../cache/redis.js";

export const prefetchQueue = new Queue("prefetch", { connection: redis });
export const patSyncQueue = new Queue("pat-sync", { connection: redis });
