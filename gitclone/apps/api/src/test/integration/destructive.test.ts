import { describe, it, expect } from "vitest";
import app from "../../app.js";

describe("Destructive Endpoints & Rate Limiting Integration Tests", () => {
  it("POST /api/confirm returns 401 without authentication", async () => {
    const res = await app.request("/api/confirm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "1",
        origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        action: "delete_repo",
        target: "owner/repo",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("enforces destructive action rate limiting on repeated requests", async () => {
    // Send 6 destructive requests from same IP / anon client
    const results: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await app.request("/api/repos/owner/repo", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "1",
          origin: "http://localhost:5173",
          "x-forwarded-for": "198.51.100.42",
        },
        body: JSON.stringify({
          confirmationToken: "owner/repo",
        }),
      });
      results.push(res.status);
    }

    // After 5 attempts, subsequent attempts must receive 429
    expect(results).toContain(429);
  });
});
