import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";
import { RepoHeader } from "../../components/RepoHeader.js";

interface Branch {
  name: string;
  sha: string;
  protected: boolean;
}

export function BranchesPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const [newBranch, setNewBranch] = useState("");
  const [fromBranch, setFromBranch] = useState("main");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: branches, isLoading, error } = useQuery({
    queryKey: ["branches", fullName],
    queryFn: () => http.get<Branch[]>(`/repos/${fullName}/branches`),
    enabled: !!owner && !!repo,
  });

  const createMutation = useMutation({
    mutationFn: () => http.post(`/repos/${fullName}/branches`, { name: newBranch, from: fromBranch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", fullName] });
      setNewBranch("");
      setShowCreateDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => http.delete(`/repos/${fullName}/branches/${name}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", fullName] });
      setDeleteError(null);
    },
    onError: (err: Error) => {
      setDeleteError(err.message || "Failed to delete branch");
    },
  });

  if (!owner || !repo) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-5">
        {/* Header & New Branch Trigger */}
        <div className="flex items-center justify-between pb-2 border-b border-border-default">
          <div>
            <h2 className="text-[18px] font-semibold text-fg-default tracking-tight">Branches</h2>
            <p className="text-[13px] text-fg-muted mt-0.5">
              Manage branches, set default protections, and track divergence against upstream HEAD.
            </p>
          </div>

          <button
            onClick={() => setShowCreateDialog(true)}
            className="h-8 px-3.5 bg-success-emphasis hover:brightness-110 text-white font-medium text-[13px] rounded-md shadow-sm transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New branch</span>
          </button>
        </div>

        {/* Create Branch Modal */}
        {showCreateDialog && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-canvas-subtle border border-border-default rounded-xl p-5 shadow-overlay flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-fg-default">Create a branch</span>
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="text-fg-muted hover:text-fg-default"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newBranch.trim()) createMutation.mutate();
                }}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-fg-default">Branch name</label>
                  <input
                    type="text"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    placeholder="e.g. feat/packfile-v2"
                    className="h-8 px-2.5 bg-canvas-inset border border-border-default rounded-md font-mono text-[12px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-fg-default">Branch source (from)</label>
                  <input
                    type="text"
                    value={fromBranch}
                    onChange={(e) => setFromBranch(e.target.value)}
                    placeholder="main"
                    className="h-8 px-2.5 bg-canvas-inset border border-border-default rounded-md font-mono text-[12px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis"
                  />
                </div>

                {createMutation.isError && (
                  <div className="p-2.5 bg-danger-subtle border border-danger-fg/30 rounded text-danger-fg text-[12px]">
                    {(createMutation.error as Error).message}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateDialog(false)}
                    className="h-8 px-3 rounded-md border border-border-default text-fg-muted hover:text-fg-default text-[12px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newBranch.trim() || createMutation.isPending}
                    className="h-8 px-4 bg-accent-emphasis hover:brightness-110 disabled:opacity-50 text-white font-medium text-[12px] rounded-md shadow-sm"
                  >
                    {createMutation.isPending ? "Creating..." : "Create branch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteError && (
          <div className="p-3 bg-danger-subtle border border-danger-fg/30 rounded-md text-danger-fg text-[13px] flex items-center justify-between">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="text-danger-fg">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg p-6 animate-pulse flex flex-col gap-3">
            <div className="h-4 bg-canvas-inset rounded w-1/4" />
            <div className="h-4 bg-canvas-inset rounded w-1/3" />
          </div>
        )}

        {error && (
          <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-md">
            Failed to load branches: {(error as Error).message}
          </div>
        )}

        {/* Branch List Table */}
        {!isLoading && !error && branches && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden divide-y divide-border-default shadow-sm">
            {branches.map((branch) => (
              <div
                key={branch.name}
                className="flex items-center justify-between h-10 px-4 hover:bg-canvas-inset/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-accent-fg">fork_right</span>
                  <span className="font-mono text-[13px] font-semibold text-fg-default">{branch.name}</span>
                  {branch.name === "main" && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-canvas-inset border border-border-default text-accent-fg font-medium">
                      default
                    </span>
                  )}
                  {branch.protected && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-canvas-inset border border-border-default text-attention-fg flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[12px]">lock</span>
                      <span>protected</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-fg-muted">{branch.sha.slice(0, 7)}</span>
                  {!branch.protected && branch.name !== "main" && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete branch "${branch.name}"?`)) {
                          deleteMutation.mutate(branch.name);
                        }
                      }}
                      className="h-6 px-2 text-[11px] text-danger-fg hover:bg-danger-subtle border border-danger-fg/40 rounded transition-colors"
                      title="Delete branch"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
