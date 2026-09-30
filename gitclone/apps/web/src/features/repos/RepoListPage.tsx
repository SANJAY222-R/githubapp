import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { http } from "../../lib/http.js";
import type { Repo } from "@gitclone/shared";
import { DeleteRepoDialog } from "../../components/dialogs/DeleteRepoDialog.js";

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Rust: "#dea584",
  Go: "#00add8",
  Python: "#3572a5",
  Java: "#b07219",
  HCL: "#844fba",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
};

export function RepoListPage() {
  const [filterType, setFilterType] = useState<"all" | "public" | "private">("all");
  const [search, setSearch] = useState("");

  const { data: repos, isLoading, error } = useQuery<Repo[]>({
    queryKey: ["repos"],
    queryFn: () => http.get<Repo[]>("/repos"),
  });

  const filteredRepos = (repos || []).filter((r) => {
    if (filterType === "public" && r.private) return false;
    if (filterType === "private" && !r.private) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const owner = r.ownerLogin || r.fullName?.split("/")[0] || "";
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        owner.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const [repoToDelete, setRepoToDelete] = useState<{ owner: string; repo: string } | null>(null);

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return "recently";
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-5">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-default">
        <div>
          <h1 className="text-[20px] font-semibold text-fg-default tracking-tight">Repositories</h1>
          <p className="text-[13px] text-fg-muted mt-0.5">
            Manage, review code diffs, and track commit telemetry across your GitHub workspaces.
          </p>
        </div>
        <Link
          to="/repos/new"
          className="h-8 px-3.5 bg-success-emphasis hover:brightness-110 text-white font-medium text-[13px] rounded-md shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto text-decoration-none"
        >
          <span className="material-symbols-outlined text-[16px]">add_box</span>
          <span>New repository</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-fg-muted">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a repository..."
            className="w-full h-8 pl-8 pr-3 bg-canvas-inset border border-border-default rounded-md font-mono text-[12px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors border ${
              filterType === "all"
                ? "bg-canvas-inset border-border-default text-fg-default font-semibold"
                : "border-transparent text-fg-muted hover:text-fg-default"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("public")}
            className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors border ${
              filterType === "public"
                ? "bg-canvas-inset border-border-default text-fg-default font-semibold"
                : "border-transparent text-fg-muted hover:text-fg-default"
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setFilterType("private")}
            className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors border ${
              filterType === "private"
                ? "bg-canvas-inset border-border-default text-fg-default font-semibold"
                : "border-transparent text-fg-muted hover:text-fg-default"
            }`}
          >
            Private
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-canvas-subtle border border-border-default rounded-lg divide-y divide-border-default overflow-hidden">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-4 flex flex-col gap-2 animate-pulse">
              <div className="h-4 bg-canvas-inset rounded w-1/3" />
              <div className="h-3 bg-canvas-inset rounded w-2/3" />
              <div className="h-3 bg-canvas-inset rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-lg flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span className="text-[13px] font-medium">Failed to load repositories: {(error as Error).message}</span>
        </div>
      )}

      {/* Repository List Container */}
      {!isLoading && !error && (
        <div className="bg-canvas-subtle rounded-lg border border-border-default overflow-hidden divide-y divide-border-default shadow-sm">
          {filteredRepos.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[36px] text-fg-muted">folder_off</span>
              <div className="text-[14px] font-semibold text-fg-default">No repositories found</div>
              <p className="text-[12px] text-fg-muted max-w-sm">
                {search ? `No repository matched "${search}".` : "You don't have any repositories yet in this view."}
              </p>
            </div>
          ) : (
            filteredRepos.map((repo) => {
              const owner: string = repo.ownerLogin || (repo.fullName ? repo.fullName.split("/")[0] || "owner" : "owner");
              const stars = repo.stargazersCount ?? 0;
              const forks = repo.forksCount ?? 0;

              return (
                <div
                  key={repo.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-canvas-inset/60 transition-colors group"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/repos/${owner}/${repo.name}`}
                        className="text-[14px] font-semibold text-accent-fg hover:underline flex items-center gap-1"
                      >
                        <span className="text-fg-muted font-normal">{owner} /</span>
                        <span>{repo.name}</span>
                      </Link>
                      <span className="font-mono text-[10px] px-2 py-0.2 rounded-full border border-border-default bg-canvas-inset text-fg-muted">
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </div>

                    {repo.description && (
                      <p className="text-[13px] text-fg-muted line-clamp-1 max-w-3xl">
                        {repo.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 pt-1 text-fg-muted text-[12px] flex-wrap">
                      {repo.language && (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || "#8b949e" }}
                          />
                          <span className="text-fg-default font-medium text-[12px]">{repo.language}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 hover:text-accent-fg transition-colors">
                        <span className="material-symbols-outlined text-[15px]">star</span>
                        <span className="font-mono text-[11px]">{stars.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 hover:text-accent-fg transition-colors">
                        <span className="material-symbols-outlined text-[15px]">call_split</span>
                        <span className="font-mono text-[11px]">{forks.toLocaleString()}</span>
                      </div>
                      <span className="font-mono text-[11px]">Updated {timeAgo(repo.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    <Link
                      to={`/repos/${owner}/${repo.name}/settings`}
                      className="h-7 w-7 rounded-md bg-canvas-inset hover:bg-canvas-subtle text-fg-muted hover:text-fg-default border border-border-default flex items-center justify-center transition-colors text-decoration-none"
                      title="Settings & Danger Zone"
                    >
                      <span className="material-symbols-outlined text-[15px]">settings</span>
                    </Link>
                    <button
                      onClick={() => setRepoToDelete({ owner, repo: repo.name })}
                      className="h-7 w-7 rounded-md bg-canvas-inset hover:bg-danger-subtle text-fg-muted hover:text-danger-fg border border-border-default hover:border-danger-fg/40 flex items-center justify-center transition-colors"
                      title="Delete repository"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Repository Modal */}
      {repoToDelete && (
        <DeleteRepoDialog
          owner={repoToDelete.owner}
          repo={repoToDelete.repo}
          isOpen={true}
          onClose={() => setRepoToDelete(null)}
        />
      )}
    </div>
  );
}
