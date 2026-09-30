import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { RepoHeader } from "../../components/RepoHeader.js";

interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

interface CommitDetail {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string;
  files: DiffFile[];
}

export function CommitDiffPage() {
  const { owner, repo, sha } = useParams<{ owner: string; repo: string; sha: string }>();
  const fullName = `${owner}/${repo}`;
  const [copiedSha, setCopiedSha] = useState(false);

  const { data: commit, isLoading, error } = useQuery({
    queryKey: ["commitDiff", fullName, sha],
    queryFn: () => http.get<CommitDetail>(`/repos/${fullName}/commits/${sha}`),
    enabled: !!owner && !!repo && !!sha,
  });

  const copySha = () => {
    if (!sha) return;
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  if (!owner || !repo || !sha) return null;

  const totalAdditions = (commit?.files || []).reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = (commit?.files || []).reduce((acc, f) => acc + f.deletions, 0);

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-5">
        {/* Breadcrumbs & Commit SHA Banner */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border-default">
          <div className="flex items-center gap-2">
            <Link to={`/repos/${fullName}/commits`} className="text-[13px] text-accent-fg hover:underline">
              &larr; All commits
            </Link>
          </div>
        </div>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg p-6 animate-pulse flex flex-col gap-3">
            <div className="h-5 bg-canvas-inset rounded w-1/3" />
            <div className="h-4 bg-canvas-inset rounded w-1/4" />
            <div className="h-20 bg-canvas-inset rounded w-full" />
          </div>
        )}

        {error && (
          <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-md">
            Failed to load commit diff: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && commit && (
          <>
            {/* Commit Header Card */}
            <div className="bg-canvas-subtle border border-border-default rounded-lg p-5 shadow-sm flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1 max-w-3xl">
                  <h1 className="text-[16px] font-semibold text-fg-default leading-snug">
                    {commit.message.split("\n")[0]}
                  </h1>
                  {commit.message.split("\n").slice(1).join(" ").trim() && (
                    <p className="text-[13px] text-fg-muted font-mono whitespace-pre-wrap">
                      {commit.message.split("\n").slice(1).join("\n").trim()}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[12px] text-fg-muted pt-1 flex-wrap">
                    <div className="flex items-center gap-1.5 font-medium text-fg-default">
                      <div className="w-5 h-5 rounded-full bg-accent-emphasis text-white flex items-center justify-center text-[10px] font-bold">
                        {commit.authorName.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{commit.authorName}</span>
                    </div>
                    <span>&bull;</span>
                    <span>committed on {new Date(commit.authorDate).toLocaleString()}</span>
                    <span className="px-1.5 py-0.2 rounded bg-success-subtle text-success-fg border border-success-fg/30 font-mono text-[10px] font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      <span>Verified</span>
                    </span>
                  </div>
                </div>

                {/* Commit SHA Pill & Stats */}
                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] bg-canvas-inset border border-border-default rounded-md px-2.5 py-1">
                    <span className="text-fg-muted">commit</span>
                    <span className="text-fg-default font-semibold">{sha}</span>
                    <button
                      onClick={copySha}
                      className="ml-1 text-fg-muted hover:text-fg-default"
                      title="Copy SHA"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedSha ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[12px] font-mono">
                    <span className="text-fg-muted">{commit.files.length} changed files</span>
                    <span className="text-success-fg font-semibold">+{totalAdditions}</span>
                    <span className="text-danger-fg font-semibold">-{totalDeletions}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Diff Patches */}
            <div className="flex flex-col gap-4">
              {commit.files.map((f) => (
                <div key={f.filename} className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden shadow-sm flex flex-col">
                  {/* File Patch Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-canvas-inset border-b border-border-default">
                    <div className="flex items-center gap-2 font-mono text-[12px]">
                      <span className="text-success-fg font-semibold">+{f.additions}</span>
                      <span className="text-danger-fg font-semibold">-{f.deletions}</span>
                      <span className="font-semibold text-fg-default">{f.filename}</span>
                    </div>

                    <span className="font-mono text-[10px] px-2 py-0.5 rounded uppercase font-medium bg-canvas-default border border-border-default text-fg-muted">
                      {f.status}
                    </span>
                  </div>

                  {/* Patch Viewer */}
                  {f.patch ? (
                    <div className="font-mono text-[12px] overflow-x-auto bg-canvas-default leading-snug">
                      {f.patch.split("\n").map((line, i) => {
                        const isHunk = line.startsWith("@@");
                        const isAdd = line.startsWith("+");
                        const isDel = line.startsWith("-");

                        let bgClass = "";
                        let textClass = "text-fg-default";

                        if (isHunk) {
                          bgClass = "bg-accent-subtle/40 border-y border-accent-emphasis/20 text-accent-fg font-semibold";
                          textClass = "text-accent-fg";
                        } else if (isAdd) {
                          bgClass = "bg-success-subtle text-success-fg";
                          textClass = "text-success-fg";
                        } else if (isDel) {
                          bgClass = "bg-danger-subtle text-danger-fg";
                          textClass = "text-danger-fg";
                        }

                        return (
                          <div
                            key={i}
                            className={`flex px-3 py-0.5 whitespace-pre hover:bg-canvas-inset/50 ${bgClass}`}
                          >
                            <span className="w-8 select-none text-right pr-3 text-fg-subtle text-[11px]">
                              {isHunk ? "..." : i + 1}
                            </span>
                            <span className={`flex-1 ${textClass}`}>{line}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-fg-muted text-[12px] font-mono">
                      Binary file or diff omitted.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
