import { describe, it, expect } from "vitest";
import app from "../../app.js";

describe("IDOR & Access Control Security Matrix", () => {
  it("rejects unauthorized access to me endpoint with 401", async () => {
    const res = await app.request("/api/me");
    expect(res.status).toBe(401);
  });

  it("rejects unauthorized access to repos endpoint with 401", async () => {
    const res = await app.request("/api/repos");
    expect(res.status).toBe(401);
  });

  it("rejects unauthorized access to specific repo endpoint with 401", async () => {
    const res = await app.request("/api/repos/victim-user/secret-repo");
    expect(res.status).toBe(401);
  });

  it("rejects unauthorized access to file tree with 401", async () => {
    const res = await app.request("/api/repos/victim-user/secret-repo/tree");
    expect(res.status).toBe(401);
  });

  it("rejects unauthorized access to file contents with 401", async () => {
    const res = await app.request("/api/repos/victim-user/secret-repo/file?path=README.md");
    expect(res.status).toBe(401);
  });

  it("ignores spoofed x-user-id / user-id headers and continues requiring authentic session", async () => {
    const res = await app.request("/api/me", {
      headers: {
        "x-user-id": "victim-user-id",
        "user-id": "victim-user-id",
        "authorization": "Bearer fake-token",
      },
    });
    expect(res.status).toBe(401);
  });

  it("ignores spoofed userId query parameters on protected endpoints", async () => {
    const res = await app.request("/api/repos?userId=victim-user-id");
    expect(res.status).toBe(401);
  });

  it("rejects malicious path traversal requests before backend execution", async () => {
    const res = await app.request("/api/repos/owner/repo/file?path=../../etc/passwd");
    // requireAuth runs, returning 401 if unauthenticated, or 400 if validated
    expect([400, 401]).toContain(res.status);
  });

  it("rejects oversized request bodies exceeding bodyLimit with 413", async () => {
    const largeBody = "x".repeat(2 * 1024 * 1024); // 2MB exceeds 1MB limit
    const res = await app.request("/api/auth/pat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "1",
        origin: "http://localhost:5173",
      },
      body: JSON.stringify({ token: largeBody }),
    });
    expect(res.status).toBe(413);
    const body = (await res.json()) as { error?: string; code?: string };
    expect(body.code).toBe("payload_too_large");
  });

  it("rejects git ref injection on branches endpoints", async () => {
    const res = await app.request("/api/repos/owner/repo/branches/master;rm%20-rf", {
      method: "DELETE",
      headers: {
        "x-csrf-token": "1",
        origin: "http://localhost:5173",
      },
    });
    expect([400, 401]).toContain(res.status);
  });
});
