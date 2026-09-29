const API_URL = process.env.API_URL || "http://localhost:8787";

async function runSmokeTests() {
  console.log(`Starting smoke tests against ${API_URL}...`);

  try {
    // 1. Health check
    const healthRes = await fetch(`${API_URL}/api/health`);
    if (!healthRes.ok) throw new Error(`Health check failed with status ${healthRes.status}`);
    const healthData = await healthRes.json();
    console.log("✓ Health check passed:", healthData);

    // 2. Auth check (unauthenticated should be 401)
    const meRes = await fetch(`${API_URL}/api/me`);
    if (meRes.status === 401) {
      console.log("✓ /api/me correctly rejected unauthenticated request with 401");
    } else {
      console.warn(`! /api/me returned unexpected status ${meRes.status}`);
    }

    // 3. CSRF Protection check
    const csrfRes = await fetch(`${API_URL}/api/auth/disconnect`, { method: "POST" });
    if (csrfRes.status === 403) {
      console.log("✓ CSRF middleware correctly rejected write without token with 403");
    } else {
      console.warn(`! CSRF check returned unexpected status ${csrfRes.status}`);
    }

    console.log("All smoke checks completed successfully!");
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exit(1);
  }
}

runSmokeTests();
