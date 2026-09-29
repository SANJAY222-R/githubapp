import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 20 }, // Ramp up to 20 users
    { duration: "30s", target: 50 }, // Stress test at 50 users
    { duration: "10s", target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate<0.05"],   // Less than 5% errors outside rate limiting
  },
};

const BASE_URL = __ENV.TARGET_URL || "http://localhost:8787";

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    "health status is 200": (r) => r.status === 200,
    "has security headers": (r) => r.headers["X-Content-Type-Options"] === "nosniff",
  });

  // 2. Unauthenticated protected route
  const meRes = http.get(`${BASE_URL}/api/me`);
  check(meRes, {
    "me route is 401 without auth": (r) => r.status === 401,
    "has cache-control no-store": (r) => (r.headers["Cache-Control"] || "").includes("no-store"),
  });

  // 3. Security.txt discovery
  const secTxtRes = http.get(`${BASE_URL}/.well-known/security.txt`);
  check(secTxtRes, {
    "security.txt returns 200": (r) => r.status === 200,
  });

  sleep(0.1);
}
