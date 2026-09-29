import { describe, it, expect } from "vitest";
import { isSafeUrl } from "@gitclone/shared";

describe("XSS URL & Scheme Sanitization Corpus", () => {
  const dangerousUrls = [
    "javascript:alert(1)",
    "javascript:alert(document.cookie)",
    "JAVASCRIPT:alert('xss')",
    "java\0script:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox('xss')",
    " javascript:void(0)",
    "javascript://%0aalert(1)",
  ];

  const safeUrls = [
    "https://github.com",
    "http://localhost:5173",
    "https://avatars.githubusercontent.com/u/12345",
    "mailto:user@example.com",
    "/dashboard/repos",
    "#section-1",
  ];

  it("blocks dangerous javascript:, data:, and vbscript: URIs", () => {
    for (const url of dangerousUrls) {
      expect(isSafeUrl(url), `Expected ${url} to be blocked`).toBe(false);
    }
  });

  it("allows safe http, https, mailto, relative, and anchor URLs", () => {
    for (const url of safeUrls) {
      expect(isSafeUrl(url), `Expected ${url} to be allowed`).toBe(true);
    }
  });

  it("rejects null, undefined, or empty values", () => {
    expect(isSafeUrl(null)).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
    expect(isSafeUrl("")).toBe(false);
  });
});
