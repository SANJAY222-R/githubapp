import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { RepoHeader } from "../../components/RepoHeader.js";

interface Commit {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string;
  htmlUrl: string;
}

export function CommitListPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const { data: commits, isLoading, error } = useQuery({
    queryKey: ["commits", fullName],
    queryFn: () => http.get<Commit[]>(`/repos/${fullName}/commits`),
    enabled: !!owner && !!repo,
  });

  const copySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  if (!owner || !repo) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between pb-2 border-b border-border-default">
          <div>
            <h2 className="text-[18px] font-semibold text-fg-default tracking-tight">Commits</h2>
            <p className="text-[13px] text-fg-muted mt-0.5">
              Differential tree history, verified cryptographic signatures, and AST commits.
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg p-6 animate-pulse flex flex-col gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col gap-2">
                <div className="h-4 bg-canvas-inset rounded w-1/3" />
                <div className="h-3 bg-canvas-inset rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-md">
            Failed to load commits: {(error as Error).message}
          </div>
        )}

        {/* Commit List Container */}
        {!isLoading && !error && commits && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden divide-y divide-border-default shadow-sm">
            {commits.map((commit) => {
              const lines = commit.message.split("\n");
              const title = lines[0];
              const desc = lines.slice(1).join(" ").trim();

              return (
                <div
                  key={commit.sha}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas-inset/60 transition-colors"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <Link
                      to={`/repos/${fullName}/commits/${commit.sha}`}
                      className="font-medium text-[13px] text-fg-default hover:text-accent-fg truncate"
                    >
                      {title}
                    </Link>
                    {desc && (
                      <p className="text-[12px] text-fg-muted line-clamp-1">
                        {desc}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-fg-muted text-[11px] pt-0.5 flex-wrap">
                      <div className="flex items-center gap-1.5 font-medium text-fg-default">
                        <div className="w-4 h-4 rounded-full bg-accent-emphasis text-white flex items-center justify-center text-[9px] font-bold">
                          {commit.authorName.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{commit.authorName}</span>
                      </div>
                      <span>&bull;</span>
                      <span>committed on {new Date(commit.authorDate).toLocaleDateString()}</span>
                      <span className="px-1.5 py-0.2 rounded bg-success-subtle text-success-fg border border-success-fg/30 font-mono text-[10px] font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px]">verified</span>
                        <span>Verified</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/repos/${fullName}/commits/${commit.sha}`}
                      className="font-mono text-[11px] px-2 py-1 rounded bg-canvas-inset border border-border-default text-accent-fg hover:underline"
                    >
                      {commit.sha.slice(0, 7)}
                    </Link>
                    <button
                      onClick={() => copySha(commit.sha)}
                      className="p-1 rounded bg-canvas-inset border border-border-default hover:bg-canvas-subtle text-fg-muted hover:text-fg-default transition-colors"
                      title="Copy full SHA"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedSha === commit.sha ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
