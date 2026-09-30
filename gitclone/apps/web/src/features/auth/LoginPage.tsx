import React, { useState } from "react";
import { http } from "../../lib/http.js";
import { useAuth } from "../../providers/AuthProvider.js";
import { GitCloneMark } from "../../components/GitCloneMark.js";

export function LoginPage() {
  const { refetch } = useAuth();
  const [pat, setPat] = useState("");
  const [showPat, setShowPat] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connectPat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pat.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await http.post("/auth/pat", { token: pat.trim() });
      refetch();
    } catch (err) {
      setError((err as Error).message || "Token verification failed. Bad credentials or expired token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-default text-fg-default font-sans flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[480px] bg-canvas-subtle border border-border-default rounded-xl shadow-overlay p-6 flex flex-col gap-5 relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent-fg to-transparent opacity-80" />

        {/* Header Section with Logo & Brand */}
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <GitCloneMark className="w-12 h-12 shadow-sm" />
          <div className="flex flex-col gap-0.5 mt-2">
            <h1 className="text-[20px] font-semibold text-fg-default tracking-tight">Connect your GitHub account</h1>
            <p className="text-[13px] text-fg-muted max-w-[360px]">
              High-performance local code review and triage client
            </p>
          </div>
        </div>

        {/* OAuth 2.0 Action Button */}
        <div className="flex flex-col gap-2">
          <a
            href="/api/auth/oauth/start"
            className="w-full h-9 px-4 bg-canvas-inset hover:bg-canvas-default text-fg-default border border-border-default rounded-md text-[13px] font-medium flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] shadow-sm group text-decoration-none"
          >
            <svg aria-hidden="true" className="w-4 h-4 fill-current text-fg-default transition-transform group-hover:scale-105" viewBox="0 0 24 24">
              <path clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fillRule="evenodd" />
            </svg>
            <span>Continue with GitHub</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-canvas-default text-accent-fg border border-border-default tracking-wide ml-1">
              OAuth 2.0 PKCE
            </span>
          </a>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-0.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-border-default" />
          </div>
          <div className="relative px-3 bg-canvas-subtle text-fg-muted font-mono text-[11px] lowercase tracking-wider">
            or connect personal access token
          </div>
        </div>

        {/* Manual PAT Form */}
        <form onSubmit={connectPat} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-fg-default" htmlFor="pat-input">
                Personal Access Token
              </label>
              <a
                href="https://github.com/settings/tokens/new"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-accent-fg hover:underline transition-colors"
              >
                Generate token ↗
              </a>
            </div>

            {/* Input with Toggle and Key Icon */}
            <div className="relative flex items-center rounded-md bg-canvas-inset border border-border-default focus-within:border-accent-emphasis focus-within:ring-1 focus-within:ring-accent-emphasis">
              <span className="material-symbols-outlined absolute left-2.5 text-fg-muted text-[16px] pointer-events-none select-none">
                key
              </span>
              <input
                id="pat-input"
                type={showPat ? "text" : "password"}
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="ghp_ or github_pat_..."
                spellCheck="false"
                className="w-full h-8 pl-8 pr-10 bg-transparent text-fg-default font-mono text-[12px] outline-none placeholder:text-fg-muted"
              />
              <button
                type="button"
                onClick={() => setShowPat(!showPat)}
                className="absolute right-2 text-fg-muted hover:text-fg-default transition-colors p-1"
                title={showPat ? "Hide token" : "Show token"}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showPat ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            <p className="text-[11px] text-fg-muted">
              Requires <code className="font-mono text-[10px] px-1 py-0.5 bg-canvas-inset border border-border-default rounded">repo</code>, <code className="font-mono text-[10px] px-1 py-0.5 bg-canvas-inset border border-border-default rounded">read:user</code> permissions.
            </p>
          </div>

          {/* Security & Risk Checkbox */}
          <div className="bg-canvas-inset border border-border-default rounded-md p-3 flex flex-col gap-1.5 relative overflow-hidden">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-attention-fg text-[18px] shrink-0 mt-0.5">
                verified_user
              </span>
              <div className="flex flex-col gap-1 w-full">
                <span className="text-[12px] font-medium text-fg-default">
                  Zero-Knowledge Envelope Encryption
                </span>
                <label className="flex items-center gap-2 cursor-pointer select-none mt-0.5">
                  <input
                    type="checkbox"
                    checked={riskAcknowledged}
                    onChange={(e) => setRiskAcknowledged(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-canvas-default border-border-default accent-accent-emphasis cursor-pointer"
                  />
                  <span className="text-[11px] text-fg-muted hover:text-fg-default">
                    Token is encrypted with per-user KMS key and never logged.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-danger-subtle border border-danger-fg/40 rounded-md p-3 flex items-start gap-2 text-danger-fg">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <div className="flex flex-col text-[12px]">
                <span className="font-semibold">Authentication Failed</span>
                <span className="text-[11px] opacity-90">{error}</span>
              </div>
            </div>
          )}

          {/* Submit Action Bar */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || !pat.trim() || !riskAcknowledged}
              className="h-8 px-4 bg-accent-emphasis hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-medium rounded-md shadow-sm transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">sync_alt</span>
              <span>{loading ? "Connecting..." : "Connect Account"}</span>
            </button>
          </div>
        </form>

        {/* Security Footer Note */}
        <div className="pt-2 border-t border-border-default flex items-center justify-center gap-1.5 text-center text-fg-muted">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          <p className="font-mono text-[10px]">
            AES-256-GCM Envelope Encryption &bull; RFC 9116 Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
