import { timeout } from "hono/timeout";
import { HTTPException } from "hono/http-exception";

export function requestTimeout(durationMs = 10000) {
  return timeout(
    durationMs,
    () =>
      new HTTPException(504, {
        message: "Request timeout",
        res: new Response(
          JSON.stringify({ error: "Request timeout", code: "request_timeout" }),
          {
            status: 504,
            headers: { "Content-Type": "application/json" },
          }
        ),
      })
  );
}
