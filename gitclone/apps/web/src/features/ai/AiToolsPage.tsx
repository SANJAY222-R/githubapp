import React, { useState } from "react";
import { http } from "../../lib/http.js";

export function AiToolsPage() {
  const [diff, setDiff] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [prTitle, setPrTitle] = useState("");
  const [prSummary, setPrSummary] = useState("");
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [loadingPr, setLoadingPr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCommit = async () => {
    if (!diff.trim()) return;
    setLoadingCommit(true);
    setError(null);
    try {
      const r = await http.post<{ message: string }>("/ai/commit-message", { diff });
      setCommitMsg(r.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingCommit(false);
    }
  };

  const generateSummary = async () => {
    if (!diff.trim() || !prTitle.trim()) return;
    setLoadingPr(true);
    setError(null);
    try {
      const r = await http.post<{ summary: string }>("/ai/pr-summary", { title: prTitle, diff });
      setPrSummary(r.summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingPr(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="pb-2 border-b border-border-default">
        <h1 className="text-[20px] font-semibold text-fg-default tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px] text-accent-fg">auto_awesome</span>
          <span>AI Engineering Copilot</span>
        </h1>
        <p className="text-[13px] text-fg-muted mt-0.5">
          Autonomous AST diff summarization, conventional commit formatting, and release changelog generation.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-danger-subtle border border-danger-fg/30 text-danger-fg rounded-md text-[12px]">
          {error}
        </div>
      )}

      {/* Grid of AI Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Commit Message Generator Card */}
        <div className="bg-canvas-subtle border border-border-default rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-accent-fg">commit</span>
            <h2 className="text-[14px] font-semibold text-fg-default">Conventional Commit Suggestion</h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-fg-muted">Git Diff Input</label>
            <textarea
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder="diff --git a/file.ts b/file.ts&#10;+ const x = 1;"
              rows={7}
              className="w-full p-3 bg-canvas-inset border border-border-default rounded-md font-mono text-[11px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis"
            />
          </div>

          <button
            onClick={generateCommit}
            disabled={loadingCommit || !diff.trim()}
            className="h-8 px-4 bg-accent-emphasis hover:brightness-110 disabled:opacity-50 text-white font-medium text-[12px] rounded-md shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>{loadingCommit ? "Analyzing diff..." : "Generate Commit Message"}</span>
          </button>

          {commitMsg && (
            <div className="mt-2 p-3 bg-canvas-inset border border-border-default rounded-md font-mono text-[12px] text-fg-default whitespace-pre-wrap">
              {commitMsg}
            </div>
          )}
        </div>

        {/* PR Summary Generator Card */}
        <div className="bg-canvas-subtle border border-border-default rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-success-fg">call_merge</span>
            <h2 className="text-[14px] font-semibold text-fg-default">Pull Request Summary & Changelog</h2>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-fg-muted">PR Working Title</label>
              <input
                type="text"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="e.g. Refactor cache eviction strategy"
                className="h-8 px-3 bg-canvas-inset border border-border-default rounded-md text-[12px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-fg-muted">Git Diff</label>
              <textarea
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                placeholder="Paste branch diff..."
                rows={4}
                className="w-full p-3 bg-canvas-inset border border-border-default rounded-md font-mono text-[11px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis"
              />
            </div>
          </div>

          <button
            onClick={generateSummary}
            disabled={loadingPr || !diff.trim() || !prTitle.trim()}
            className="h-8 px-4 bg-success-emphasis hover:brightness-110 disabled:opacity-50 text-white font-medium text-[12px] rounded-md shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>{loadingPr ? "Generating summary..." : "Generate PR Summary"}</span>
          </button>

          {prSummary && (
            <div className="mt-2 p-3 bg-canvas-inset border border-border-default rounded-md text-[13px] text-fg-default whitespace-pre-wrap">
              {prSummary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
