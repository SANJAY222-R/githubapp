import React from "react";

export function RateLimitBanner({ resetAt }: { resetAt?: number }) {
  if (!resetAt) return null;
  const seconds = Math.max(0, Math.ceil((resetAt * 1000 - Date.now()) / 1000));
  if (seconds <= 0) return null;

  return (
    <div className="bg-attention-subtle border-b border-attention-fg/40 px-6 py-2.5 flex items-center justify-between text-[13px] text-fg-default">
      <div className="flex items-center gap-2.5">
        <span className="material-symbols-outlined text-[18px] text-attention-fg">warning</span>
        <span>
          <strong>Rate limit reached:</strong> GitHub API requests throttled. Resets in{" "}
          <span className="font-mono font-semibold">{seconds}s</span>.
        </span>
      </div>
    </div>
  );
}
