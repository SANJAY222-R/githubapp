import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { RepoHeader } from "../../components/RepoHeader.js";
import { Markdown } from "../../components/ui/Markdown.js";

interface FileEntry {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
}

interface TreeResponse {
  entries: FileEntry[];
  readme: string | null;
  defaultBranch?: string;
}

export function RepoDetailPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneTab, setCloneTab] = useState<"https" | "ssh">("https");
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<TreeResponse>({
    queryKey: ["repoTree", owner, repo, selectedBranch],
    queryFn: () => http.get<TreeResponse>(`/repos/${owner}/${repo}/tree?ref=${selectedBranch}`),
    enabled: !!owner && !!repo,
  });

  const cloneUrlHttps = `https://github.com/${owner}/${repo}.git`;
  const cloneUrlSsh = `git@github.com:${owner}/${repo}.git`;
  const currentCloneUrl = cloneTab === "https" ? cloneUrlHttps : cloneUrlSsh;

  const copyCloneUrl = () => {
    navigator.clipboard.writeText(currentCloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!owner || !repo) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-5">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Branch Switcher Button */}
            <div className="relative">
              <button
                className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-canvas-subtle text-fg-default font-mono text-[12px] flex items-center gap-2 border border-border-default shadow-sm transition-colors"
                title="Switch branch"
              >
                <span className="material-symbols-outlined text-[16px] text-fg-muted">fork_right</span>
                <span className="font-semibold">{selectedBranch}</span>
                <span className="material-symbols-outlined text-[14px] text-fg-muted">arrow_drop_down</span>
              </button>
            </div>

            <Link
              to={`/repos/${owner}/${repo}/branches`}
              className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-canvas-subtle text-fg-muted hover:text-fg-default font-medium text-[12px] flex items-center gap-1.5 border border-border-default shadow-sm transition-colors text-decoration-none"
            >
              <span className="material-symbols-outlined text-[16px]">fork_right</span>
              <span>Branches</span>
            </Link>

            <Link
              to={`/repos/${owner}/${repo}/commits`}
              className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-canvas-subtle text-fg-muted hover:text-fg-default font-medium text-[12px] flex items-center gap-1.5 border border-border-default shadow-sm transition-colors text-decoration-none"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>Commits</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Clone Repository Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCloneOpen(!cloneOpen)}
                className="h-8 px-3 rounded-md bg-success-emphasis hover:brightness-110 text-white font-medium text-[12px] flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">code</span>
                <span>Code</span>
                <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
              </button>

              {cloneOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-canvas-overlay border border-border-default p-4 shadow-overlay z-50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-fg-default">Clone repository</span>
                    <span className="font-mono text-[11px] text-fg-muted">Git Gateway</span>
                  </div>

                  <div className="flex rounded-md bg-canvas-inset border border-border-default p-0.5">
                    <button
                      onClick={() => setCloneTab("https")}
                      className={`flex-1 py-1 text-center font-mono text-[11px] rounded transition-colors ${
                        cloneTab === "https" ? "bg-canvas-default text-accent-fg font-semibold shadow-sm" : "text-fg-muted hover:text-fg-default"
                      }`}
                    >
                      HTTPS
                    </button>
                    <button
                      onClick={() => setCloneTab("ssh")}
                      className={`flex-1 py-1 text-center font-mono text-[11px] rounded transition-colors ${
                        cloneTab === "ssh" ? "bg-canvas-default text-accent-fg font-semibold shadow-sm" : "text-fg-muted hover:text-fg-default"
                      }`}
                    >
                      SSH
                    </button>
                  </div>

                  <div className="flex items-center rounded-md bg-canvas-inset border border-border-default px-2.5 py-1.5 justify-between gap-2">
                    <span className="font-mono text-[11px] text-fg-muted truncate">{currentCloneUrl}</span>
                    <button
                      onClick={copyCloneUrl}
                      className="text-fg-muted hover:text-accent-fg transition-colors p-1"
                      title="Copy URL"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copied ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          {/* Main Column: Tree & Readme */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Loading state */}
            {isLoading && (
              <div className="rounded-lg bg-canvas-subtle border border-border-default p-6 flex flex-col gap-3 animate-pulse">
                <div className="h-5 bg-canvas-inset rounded w-1/3" />
                <div className="h-4 bg-canvas-inset rounded w-full" />
                <div className="h-4 bg-canvas-inset rounded w-full" />
                <div className="h-4 bg-canvas-inset rounded w-4/5" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span className="text-[13px] font-medium">Failed to load repository files: {(error as Error).message}</span>
              </div>
            )}

            {/* Files Container */}
            {!isLoading && !error && data && (
              <div className="rounded-lg bg-canvas-subtle border border-border-default overflow-hidden shadow-sm flex flex-col">
                {/* Latest Commit Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-canvas-inset border-b border-border-default text-fg-default">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-accent-emphasis flex items-center justify-center text-white font-mono text-[10px] font-bold shrink-0">
                      {owner.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-mono text-[12px] font-semibold text-fg-default">{owner}</span>
                    <span className="font-mono text-[12px] text-fg-muted truncate max-w-md">
                      Initial repository workspace
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-success-subtle text-success-fg border border-success-fg/30 font-mono text-[10px] font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      <span>Verified</span>
                    </span>
                    <span className="font-mono text-[11px] text-fg-muted">Latest</span>
                  </div>
                </div>

                {/* File Tree Rows */}
                <div className="flex flex-col divide-y divide-border-default">
                  {data.entries.length === 0 ? (
                    <div className="p-8 text-center text-fg-muted text-[13px]">
                      This repository has no files in branch <span className="font-mono">{selectedBranch}</span>.
                    </div>
                  ) : (
                    data.entries.map((entry) => (
                      <div
                        key={entry.path}
                        className="flex items-center justify-between h-9 px-4 hover:bg-canvas-inset/60 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 w-2/5">
                          <span className={`material-symbols-outlined text-[18px] shrink-0 ${entry.type === "dir" ? "text-accent-fg" : "text-fg-muted"}`}>
                            {entry.type === "dir" ? "folder" : "description"}
                          </span>
                          <Link
                            to={`/repos/${owner}/${repo}/files/${entry.path}`}
                            className="font-mono text-[12px] font-medium text-fg-default hover:text-accent-fg truncate"
                          >
                            {entry.name}
                          </Link>
                        </div>
                        <div className="w-2/5 truncate pr-4">
                          <span className="font-mono text-[11px] text-fg-muted group-hover:text-fg-default transition-colors truncate block">
                            {entry.type === "dir" ? "directory" : `${entry.size} bytes`}
                          </span>
                        </div>
                        <div className="w-1/5 text-right font-mono text-[11px] text-fg-muted shrink-0">
                          {entry.sha.slice(0, 7)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* README Markdown Block */}
            {data?.readme && (
              <div className="rounded-lg bg-canvas-subtle border border-border-default overflow-hidden shadow-sm flex flex-col">
                <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-inset border-b border-border-default">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-accent-fg">menu_book</span>
                    <span className="font-mono text-[12px] font-semibold text-fg-default">README.md</span>
                  </div>
                </div>
                <div className="p-6">
                  <Markdown content={data.readme} />
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: About & Metadata */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            <div className="rounded-lg bg-canvas-subtle border border-border-default p-4 flex flex-col gap-3 shadow-sm">
              <h3 className="text-[14px] font-semibold text-fg-default">About</h3>
              <p className="text-[13px] text-fg-muted">
                Repository synchronized with GitHub Gateway via token envelope encryption.
              </p>
              <div className="pt-2 border-t border-border-default flex flex-col gap-2 text-[12px] text-fg-muted">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-fg-muted">security</span>
                  <span>Zero-Knowledge Decryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-fg-muted">bolt</span>
                  <span>Real-time SSE Event Stream</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
