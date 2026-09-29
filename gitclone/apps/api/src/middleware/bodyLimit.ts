import { bodyLimit } from "hono/body-limit";

export const defaultBodyLimit = bodyLimit({
  maxSize: 1 * 1024 * 1024, // 1MB standard JSON
  onError: (c) => {
    return c.json({ error: "Payload too large (max 1MB)", code: "payload_too_large" }, 413);
  },
});

export const fileBodyLimit = bodyLimit({
  maxSize: 5 * 1024 * 1024, // 5MB for file uploads/updates
  onError: (c) => {
    return c.json({ error: "Payload too large (max 5MB)", code: "payload_too_large" }, 413);
  },
});
