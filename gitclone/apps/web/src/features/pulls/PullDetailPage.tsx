import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";
import { RepoHeader } from "../../components/RepoHeader.js";
import { Markdown } from "../../components/ui/Markdown.js";

interface PR {
  number: number;
  title: string;
  state: string;
  body: string | null;
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  user: { login: string; avatarUrl?: string };
  head: { ref: string; sha: string };
  base: { ref: string };
  additions: number;
  deletions: number;
  changedFiles: number;
}

export function PullDetailPage() {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const fullName = `${owner}/${repo}`;
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">("merge");
  const [activeTab, setActiveTab] = useState<"conversation" | "commits" | "files">("conversation");

  const { data: pr, isLoading, error } = useQuery({
    queryKey: ["pull", fullName, number],
    queryFn: () => http.get<PR>(`/repos/${fullName}/pulls/${number}`),
    enabled: !!owner && !!repo && !!number,
  });

  const mergeMutation = useMutation({
    mutationFn: () => http.post(`/repos/${fullName}/pulls/${number}/merge`, { mergeMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pull", fullName, number] });
      queryClient.invalidateQueries({ queryKey: ["pulls", fullName] });
    },
  });

  if (!owner || !repo || !number) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-5">
        {/* Loading / Error states */}
        {isLoading && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg p-6 animate-pulse flex flex-col gap-3">
            <div className="h-6 bg-canvas-inset rounded w-1/2" />
            <div className="h-4 bg-canvas-inset rounded w-1/3" />
          </div>
        )}

        {error && (
          <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-md">
            Failed to load pull request: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && pr && (
          <>
            {/* PR Title and Status Bar */}
            <div className="flex flex-col gap-2 pb-4 border-b border-border-default">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] font-semibold text-fg-default tracking-tight">
                  {pr.title}
                </h1>
                <span className="text-[20px] text-fg-muted font-mono font-normal">#{pr.number}</span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap text-[13px]">
                {/* Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-white font-medium text-[12px] flex items-center gap-1.5 shadow-sm ${
                    pr.merged
                      ? "bg-merged-emphasis"
                      : pr.state === "open"
                      ? "bg-success-emphasis"
                      : "bg-danger-emphasis"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {pr.merged ? "done_all" : pr.state === "open" ? "call_merge" : "close"}
                  </span>
                  <span>{pr.merged ? "Merged" : pr.state === "open" ? "Open" : "Closed"}</span>
                </span>

                <div className="text-fg-muted font-mono text-[12px]">
                  <span className="font-semibold text-fg-default">{pr.user.login}</span> wants to merge changes into{" "}
                  <code className="px-1.5 py-0.5 rounded bg-canvas-inset border border-border-default text-accent-fg">
                    {pr.base.ref}
                  </code>{" "}
                  from{" "}
                  <code className="px-1.5 py-0.5 rounded bg-canvas-inset border border-border-default text-accent-fg">
                    {pr.head.ref}
                  </code>
                </div>
              </div>
            </div>

            {/* Sub-tabs: Conversation, Commits, Files Changed */}
            <div className="flex items-center gap-2 border-b border-border-default -mb-2">
              <button
                onClick={() => setActiveTab("conversation")}
                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === "conversation"
                    ? "border-accent-emphasis text-fg-default font-semibold"
                    : "border-transparent text-fg-muted hover:text-fg-default"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>Conversation</span>
              </button>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
              {/* Left Column: Thread & Merge Box */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                {/* Original PR Description Card */}
                <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden shadow-sm flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 bg-canvas-inset border-b border-border-default text-[12px] text-fg-muted">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg-default">{pr.user.login}</span> commented
                    </div>
                  </div>
                  <div className="p-5">
                    {pr.body ? (
                      <Markdown content={pr.body} />
                    ) : (
                      <span className="text-fg-muted italic text-[13px]">No description provided.</span>
                    )}
                  </div>
                </div>

                {/* Merge Action Box */}
                {pr.state === "open" && !pr.merged && (
                  <div className="bg-canvas-subtle border border-border-default rounded-lg p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-success-subtle border border-success-fg/30 flex items-center justify-center text-success-fg shrink-0">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-semibold text-fg-default">
                          This branch has no conflicts with the base branch
                        </span>
                        <span className="text-[12px] text-fg-muted">
                          Merging can be performed automatically via fast-forward or squash.
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border-default">
                      <select
                        value={mergeMethod}
                        onChange={(e) => setMergeMethod(e.target.value as typeof mergeMethod)}
                        className="h-8 px-2.5 bg-canvas-inset border border-border-default rounded-md text-[12px] font-medium text-fg-default focus:outline-none"
                      >
                        <option value="merge">Create a merge commit</option>
                        <option value="squash">Squash and merge</option>
                        <option value="rebase">Rebase and merge</option>
                      </select>

                      <button
                        onClick={() => mergeMutation.mutate()}
                        disabled={mergeMutation.isPending}
                        className="h-8 px-4 bg-success-emphasis hover:brightness-110 disabled:opacity-50 text-white text-[12px] font-medium rounded-md shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">call_merge</span>
                        <span>{mergeMutation.isPending ? "Merging..." : "Confirm merge"}</span>
                      </button>
                    </div>

                    {mergeMutation.isError && (
                      <div className="p-2.5 bg-danger-subtle border border-danger-fg/30 text-danger-fg text-[12px] rounded">
                        {(mergeMutation.error as Error).message}
                      </div>
                    )}
                  </div>
                )}

                {/* Merged Banner */}
                {pr.merged && (
                  <div className="bg-canvas-subtle border border-merged-emphasis/40 rounded-lg p-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-merged-subtle text-merged-fg flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">done_all</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-fg-default">Pull request successfully merged and closed</span>
                      <span className="text-[12px] text-fg-muted">You can safely delete the head branch.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Reviewers & Sidebar Metadata */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="bg-canvas-subtle border border-border-default rounded-lg p-4 flex flex-col gap-3 shadow-sm text-[13px]">
                  <div className="flex items-center justify-between font-semibold text-fg-default pb-2 border-b border-border-default">
                    <span>Reviewers</span>
                  </div>
                  <span className="text-fg-muted text-[12px]">No reviewers assigned.</span>

                  <div className="flex items-center justify-between font-semibold text-fg-default pt-2 pb-2 border-y border-border-default">
                    <span>Labels</span>
                  </div>
                  <span className="text-fg-muted text-[12px]">None yet.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
