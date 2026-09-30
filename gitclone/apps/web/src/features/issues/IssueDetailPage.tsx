import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { RepoHeader } from "../../components/RepoHeader.js";
import { Markdown } from "../../components/ui/Markdown.js";

interface Issue {
  number: number;
  title: string;
  state: string;
  body: string | null;
  user: { login: string; avatarUrl?: string };
  labels: { name: string; color: string }[];
  assignees: { login: string }[];
  createdAt: string;
  comments: number;
  locked: boolean;
}

export function IssueDetailPage() {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const fullName = `${owner}/${repo}`;

  const { data: issue, isLoading, error } = useQuery({
    queryKey: ["issue", fullName, number],
    queryFn: () => http.get<Issue>(`/repos/${fullName}/issues/${number}`),
    enabled: !!owner && !!repo && !!number,
  });

  if (!owner || !repo || !number) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-5">
        {isLoading && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg p-6 animate-pulse flex flex-col gap-3">
            <div className="h-6 bg-canvas-inset rounded w-1/2" />
            <div className="h-4 bg-canvas-inset rounded w-1/3" />
          </div>
        )}

        {error && (
          <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-md">
            Failed to load issue: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && issue && (
          <>
            {/* Issue Title & Status Bar */}
            <div className="flex flex-col gap-2 pb-4 border-b border-border-default">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] font-semibold text-fg-default tracking-tight">
                  {issue.title}
                </h1>
                <span className="text-[20px] text-fg-muted font-mono font-normal">#{issue.number}</span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap text-[13px]">
                <span
                  className={`px-3 py-1 rounded-full text-white font-medium text-[12px] flex items-center gap-1.5 shadow-sm ${
                    issue.state === "open" ? "bg-success-emphasis" : "bg-merged-emphasis"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {issue.state === "open" ? "adjust" : "check_circle"}
                  </span>
                  <span>{issue.state === "open" ? "Open" : "Closed"}</span>
                </span>

                <div className="text-fg-muted font-mono text-[12px]">
                  <span className="font-semibold text-fg-default">{issue.user.login}</span> opened this issue on{" "}
                  {new Date(issue.createdAt).toLocaleDateString()} &bull; {issue.comments} comments
                </div>
              </div>
            </div>

            {/* Conversation Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
              <div className="lg:col-span-7 flex flex-col gap-5">
                <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden shadow-sm flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 bg-canvas-inset border-b border-border-default text-[12px] text-fg-muted">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg-default">{issue.user.login}</span> commented
                    </div>
                  </div>
                  <div className="p-5">
                    {issue.body ? (
                      <Markdown content={issue.body} />
                    ) : (
                      <span className="text-fg-muted italic text-[13px]">No description provided.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Metadata */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="bg-canvas-subtle border border-border-default rounded-lg p-4 flex flex-col gap-3 shadow-sm text-[13px]">
                  <div className="flex items-center justify-between font-semibold text-fg-default pb-2 border-b border-border-default">
                    <span>Assignees</span>
                  </div>
                  {issue.assignees && issue.assignees.length > 0 ? (
                    <div className="flex flex-col gap-1.5 font-mono text-[12px]">
                      {issue.assignees.map((a) => (
                        <div key={a.login} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-fg-muted">person</span>
                          <span>{a.login}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-fg-muted text-[12px]">No one assigned.</span>
                  )}

                  <div className="flex items-center justify-between font-semibold text-fg-default pt-2 pb-2 border-y border-border-default">
                    <span>Labels</span>
                  </div>
                  {issue.labels && issue.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {issue.labels.map((l) => (
                        <span
                          key={l.name}
                          className="font-mono text-[11px] px-2 py-0.5 rounded-full border border-border-default"
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
                  ) : (
                    <span className="text-fg-muted text-[12px]">None yet.</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
