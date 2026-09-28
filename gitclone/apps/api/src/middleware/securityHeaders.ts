import { createMiddleware } from "hono/factory";

export const securityHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "0");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' https://avatars.githubusercontent.com data:; " +
    "connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
  );
  if (c.env?.NODE_ENV === "production") {
    c.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
});
