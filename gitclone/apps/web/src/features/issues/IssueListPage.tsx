import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { RepoHeader } from "../../components/RepoHeader.js";

interface Issue {
  number: number;
  title: string;
  state: string;
  user: { login: string };
  labels: { name: string; color: string }[];
  createdAt: string;
  comments: number;
}

export function IssueListPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const [filterState, setFilterState] = useState<"open" | "closed" | "all">("open");

  const { data: issues, isLoading, error } = useQuery({
    queryKey: ["issues", fullName, filterState],
    queryFn: () => http.get<Issue[]>(`/repos/${fullName}/issues?state=${filterState}`),
    enabled: !!owner && !!repo,
  });

  if (!owner || !repo) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-default">
          <div>
            <h2 className="text-[18px] font-semibold text-fg-default tracking-tight">Issues</h2>
            <p className="text-[13px] text-fg-muted mt-0.5">
              Bug reports, feature RFCs, and engineering tasks for this repository.
            </p>
          </div>

          <Link
            to={`/repos/${fullName}/issues/new`}
            className="h-8 px-3.5 bg-success-emphasis hover:brightness-110 text-white font-medium text-[13px] rounded-md shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto text-decoration-none"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New issue</span>
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
            Failed to load issues: {(error as Error).message}
          </div>
        )}

        {/* Issue List Container */}
        {!isLoading && !error && issues && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden divide-y divide-border-default shadow-sm">
            {issues.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[36px] text-fg-muted">adjust</span>
                <span className="text-[14px] font-semibold text-fg-default">No issues found</span>
                <span className="text-[12px] text-fg-muted">
                  There are currently no active issues in state "{filterState}".
                </span>
              </div>
            ) : (
              issues.map((issue) => {
                const isOpen = issue.state === "open";

                return (
                  <div
                    key={issue.number}
                    className="p-3.5 flex items-start gap-3 hover:bg-canvas-inset/60 transition-colors"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${
                        isOpen ? "text-success-fg" : "text-merged-fg"
                      }`}
                    >
                      {isOpen ? "adjust" : "check_circle"}
                    </span>

                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/repos/${fullName}/issues/${issue.number}`}
                          className="font-semibold text-[13px] text-fg-default hover:text-accent-fg"
                        >
                          {issue.title}
                        </Link>
                        {issue.labels.map((l) => (
                          <span
                            key={l.name}
                            className="font-mono text-[10px] px-2 py-0.2 rounded-full border border-border-default"
                            style={{
                              backgroundColor: `#${l.color}15`,
                              borderColor: `#${l.color}40`,
                              color: `#${l.color}`,
                            }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-fg-muted text-[11px] font-mono flex-wrap">
                        <span>#{issue.number}</span>
                        <span>opened by {issue.user.login}</span>
                        <span>&bull;</span>
                        <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {issue.comments > 0 && (
                      <div className="flex items-center gap-1 text-fg-muted text-[11px] font-mono shrink-0">
                        <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                        <span>{issue.comments}</span>
                      </div>
                    )}
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
