import { describe, it, expect } from "vitest";
import app from "../../app.js";

describe("API Integration Tests", () => {
  it("GET /api/health returns status ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; ts: number };
    expect(body.status).toBe("ok");
    expect(typeof body.ts).toBe("number");
  });

  it("GET /api/me returns 401 without authentication", async () => {
    const res = await app.request("/api/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/repos returns 401 without authentication", async () => {
    const res = await app.request("/api/repos");
    expect(res.status).toBe(401);
  });

  it("GET /api/stream returns 401 without authentication", async () => {
    const res = await app.request("/api/stream");
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/pat returns 400 when token is empty or missing", async () => {
    const res = await app.request("/api/auth/pat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "1",
        origin: "http://localhost:5173",
      },
      body: JSON.stringify({ token: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST to mutating endpoint rejects missing CSRF header with 403", async () => {
    const res = await app.request("/api/auth/disconnect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:5173",
      },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("CSRF");
  });

  it("POST to mutating endpoint rejects untrusted Origin with 403", async () => {
    const res = await app.request("/api/auth/disconnect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "1",
        origin: "http://attacker-site.com",
      },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("Origin");
  });

  it("POST /api/webhooks/github rejects invalid HMAC signature with 401", async () => {
    const res = await app.request("/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256": "sha256=invalid",
        "x-github-event": "ping",
        "content-type": "application/json",
      },
      body: JSON.stringify({ zen: "Responsive is better than fast." }),
    });
    expect(res.status).toBe(401);
  });

  it("includes security headers and no-store cache control in responses", async () => {
    const res = await app.request("/api/me");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("GET /api/auth/oauth/start redirects to GitHub OAuth with PKCE parameters", async () => {
    const res = await app.request("/api/auth/oauth/start");
    expect(res.status).toBe(302);
    const location = res.headers.get("location") || "";
    expect(location).toContain("github.com/login/oauth/authorize");
    expect(location).toContain("code_challenge=");
    expect(location).toContain("code_challenge_method=S256");
    expect(location).toContain("state=");
  });

  it("GET /api/auth/oauth/callback returns 400 when code is missing", async () => {
    const res = await app.request("/api/auth/oauth/callback");
    expect(res.status).toBe(400);
  });
});
