export function RateLimitBanner({ resetAt }: { resetAt: number }) {
  const seconds = Math.max(0, Math.ceil((resetAt * 1000 - Date.now()) / 1000));
  return (
    <div style={{ background: "#fff3cd", border: "1px solid #ffc107", padding: "8px 16px", borderRadius: 4, marginBottom: 12 }}>
      GitHub API rate limit reached. Resets in {seconds}s.
    </div>
  );
}
