import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { requireAuth } from "../middleware/requireAuth.js";
import { addSubscriber, removeSubscriber, getSubscriberCount, MAX_SSE_PER_USER } from "../realtime/hub.js";

const app = new Hono();

app.get("/", requireAuth, (c) => {
  const user = c.get("user");

  if (getSubscriberCount(user.id) >= MAX_SSE_PER_USER) {
    return c.json(
      {
        error: `Too many active SSE connections. Maximum ${MAX_SSE_PER_USER} allowed per user.`,
        code: "too_many_streams",
      },
      429
    );
  }

  return streamSSE(c, async (stream) => {
    let active = true;

    const sub = {
      userId: user.id,
      send: (event: string, data: unknown) => {
        if (!active) return;
        stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {
          active = false;
        });
      },
      close: () => {
        active = false;
        stream.close();
      },
    };

    const added = addSubscriber(user.id, sub);
    if (!added) {
      await stream.writeSSE({ event: "error", data: JSON.stringify({ error: "Connection cap exceeded" }) });
      stream.close();
      return;
    }

    await stream.writeSSE({ event: "connected", data: JSON.stringify({ userId: user.id }) });

    // Send keepalive heartbeat every 20s
    const heartbeatInterval = setInterval(() => {
      if (!active) {
        clearInterval(heartbeatInterval);
        return;
      }
      stream.writeSSE({ event: "keepalive", data: JSON.stringify({ ts: Date.now() }) }).catch(() => {
        active = false;
        clearInterval(heartbeatInterval);
        removeSubscriber(user.id, sub);
      });
    }, 20_000);

    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        active = false;
        clearInterval(heartbeatInterval);
        removeSubscriber(user.id, sub);
        resolve();
      });
    });
  });
});

export default app;
