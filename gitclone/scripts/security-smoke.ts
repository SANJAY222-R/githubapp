import app from "../apps/api/src/app.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function assert(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err?.message || String(err) });
    console.error(`  [FAIL] ${name}: ${err?.message || String(err)}`);
  }
}

async function runSecuritySmoke() {
  console.log("\n==================================================");
  console.log("   AUTOMATED APPLICATION SECURITY SMOKE TESTS    ");
  console.log("==================================================\n");

  // 1. Security Headers
  await assert("Security Headers on API Responses", async () => {
    const res = await app.request("/api/health");
    if (res.headers.get("x-content-type-options") !== "nosniff") {
      throw new Error("Missing X-Content-Type-Options: nosniff");
    }
    if (res.headers.get("x-frame-options") !== "DENY") {
      throw new Error("Missing X-Frame-Options: DENY");
    }
    const csp = res.headers.get("content-security-policy");
    if (!csp || !csp.includes("default-src 'none'")) {
      throw new Error("Missing or weak Content-Security-Policy header");
    }
  });

  // 2. Cache-Control: no-store on sensitive endpoints
  await assert("Cache-Control: no-store on protected /api/* routes", async () => {
    const res = await app.request("/api/me");
    const cacheControl = res.headers.get("cache-control") || "";
    if (!cacheControl.includes("no-store")) {
      throw new Error(`Expected no-store Cache-Control header, got: ${cacheControl}`);
    }
  });

  // 3. Origin Verification & CSRF
  await assert("Rejection of untrusted Origin on mutating endpoints (403)", async () => {
    const res = await app.request("/api/auth/disconnect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "1",
        origin: "http://malicious-attacker.com",
      },
    });
    if (res.status !== 403) {
      throw new Error(`Expected status 403 for untrusted Origin, received: ${res.status}`);
    }
  });

  await assert("Rejection of missing CSRF token on mutating endpoints (403)", async () => {
    const res = await app.request("/api/auth/disconnect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:5173",
      },
    });
    if (res.status !== 403) {
      throw new Error(`Expected status 403 for missing CSRF header, received: ${res.status}`);
    }
  });

  // 4. Body Limit (413 Payload Too Large)
  await assert("Body limit enforcement on oversized JSON payload (413)", async () => {
    const oversizedBody = JSON.stringify({ token: "A".repeat(2 * 1024 * 1024) });
    const res = await app.request("/api/auth/pat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "1",
        origin: "http://localhost:5173",
      },
      body: oversizedBody,
    });
    if (res.status !== 413) {
      throw new Error(`Expected status 413 for oversized body, received: ${res.status}`);
    }
  });

  // 5. Security.txt standard discovery endpoint
  await assert("RFC 9116 security.txt discovery endpoint availability (200)", async () => {
    const res = await app.request("/.well-known/security.txt");
    if (res.status !== 200) {
      throw new Error(`Expected 200 for /.well-known/security.txt, received: ${res.status}`);
    }
    const text = await res.text();
    if (!text.includes("Contact: mailto:") || !text.includes("Expires:")) {
      throw new Error("Invalid security.txt format or missing fields");
    }
  });

  // 6. Destructive Rate Limit (429)
  await assert("Destructive Rate Limiting on repeated deletion requests (429)", async () => {
    let rateLimited = false;
    for (let i = 0; i < 7; i++) {
      const res = await app.request("/api/repos/owner/repo", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "1",
          origin: "http://localhost:5173",
          "x-forwarded-for": "192.0.2.1",
        },
        body: JSON.stringify({ confirmationToken: "owner/repo" }),
      });
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }
    if (!rateLimited) {
      throw new Error("Expected 429 rate limit on consecutive destructive requests");
    }
  });

  console.log("\n--------------------------------------------------");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`Summary: ${passed}/${total} security smoke tests passed.`);
  console.log("--------------------------------------------------\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runSecuritySmoke().catch((err) => {
  console.error("Security smoke tests failed:", err);
  process.exit(1);
});
