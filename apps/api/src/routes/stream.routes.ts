import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { requireAuth } from "../middleware/requireAuth.js";
import { addSubscriber, removeSubscriber } from "../realtime/hub.js";

const app = new Hono();

app.get("/", requireAuth, (c) => {
  const user = c.get("user");
  return streamSSE(c, async (stream) => {
    const sub = {
      userId: user.id,
      send: (event: string, data: unknown) => {
        stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
      },
      close: () => stream.close(),
    };
    addSubscriber(user.id, sub);
    await stream.writeSSE({ event: "connected", data: JSON.stringify({ userId: user.id }) });
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        removeSubscriber(user.id, sub);
        resolve();
      });
    });
  });
});

export default app;
