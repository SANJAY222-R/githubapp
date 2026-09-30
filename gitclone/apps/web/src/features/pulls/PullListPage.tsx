import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { RepoHeader } from "../../components/RepoHeader.js";

interface PR {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  user: { login: string };
  createdAt: string;
  head: { ref: string };
  base: { ref: string };
}

export function PullListPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const [filterState, setFilterState] = useState<"open" | "closed" | "all">("open");

  const { data: pulls, isLoading, error } = useQuery({
    queryKey: ["pulls", fullName, filterState],
    queryFn: () => http.get<PR[]>(`/repos/${fullName}/pulls?state=${filterState}`),
    enabled: !!owner && !!repo,
  });

  if (!owner || !repo) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-default">
          <div>
            <h2 className="text-[18px] font-semibold text-fg-default tracking-tight">Pull Requests</h2>
            <p className="text-[13px] text-fg-muted mt-0.5">
              Review code changes, manage merge queues, and verify CI status checks.
            </p>
          </div>

          <Link
            to={`/repos/${fullName}/pulls/new`}
            className="h-8 px-3.5 bg-success-emphasis hover:brightness-110 text-white font-medium text-[13px] rounded-md shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto text-decoration-none"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New pull request</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
          {(["open", "closed", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterState(s)}
              className={`h-7 px-3 rounded-md text-[12px] font-medium capitalize transition-colors border ${
                filterState === s
                  ? "bg-canvas-inset border-border-default text-fg-default font-semibold"
                  : "border-transparent text-fg-muted hover:text-fg-default"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg p-6 animate-pulse flex flex-col gap-3">
            {[1, 2].map((n) => (
              <div key={n} className="h-10 bg-canvas-inset rounded" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-md">
            Failed to load pull requests: {(error as Error).message}
          </div>
        )}

        {/* PR List Container */}
        {!isLoading && !error && pulls && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden divide-y divide-border-default shadow-sm">
            {pulls.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[36px] text-fg-muted">call_merge</span>
                <span className="text-[14px] font-semibold text-fg-default">No pull requests found</span>
                <span className="text-[12px] text-fg-muted">
                  There are currently no active pull requests in state "{filterState}".
                </span>
              </div>
            ) : (
              pulls.map((pr) => {
                const isOpen = pr.state === "open" && !pr.draft;
                const isDraft = pr.draft;

                return (
                  <div
                    key={pr.number}
                    className="p-3.5 flex items-start gap-3 hover:bg-canvas-inset/60 transition-colors"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${
                        isDraft
                          ? "text-fg-muted"
                          : isOpen
                          ? "text-success-fg"
                          : "text-merged-fg"
                      }`}
                    >
                      {isDraft ? "edit_document" : isOpen ? "call_merge" : "done_all"}
                    </span>

                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/repos/${fullName}/pulls/${pr.number}`}
                          className="font-semibold text-[13px] text-fg-default hover:text-accent-fg"
                        >
                          {pr.title}
                        </Link>
                        {pr.draft && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-canvas-inset border border-border-default text-fg-muted">
                            Draft
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-fg-muted text-[11px] font-mono flex-wrap">
                        <span>#{pr.number}</span>
                        <span>opened by {pr.user.login}</span>
                        <span>&bull;</span>
                        <span>{pr.head.ref} &rarr; {pr.base.ref}</span>
                        <span>&bull;</span>
                        <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
