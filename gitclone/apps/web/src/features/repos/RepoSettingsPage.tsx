import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";
import { RepoHeader } from "../../components/RepoHeader.js";
import { DeleteRepoDialog } from "../../components/dialogs/DeleteRepoDialog.js";

interface RepoDetails {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  stargazersCount: number;
  forksCount: number;
  language: string | null;
  defaultBranch: string;
  updatedAt: string;
}

export function RepoSettingsPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: repoData, isLoading } = useQuery<RepoDetails>({
    queryKey: ["repo", owner, repo],
    queryFn: async () => {
      const d = await http.get<RepoDetails>(`/repos/${owner}/${repo}`);
      setDescription(d.description || "");
      return d;
    },
    enabled: !!owner && !!repo,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: { description?: string; private?: boolean }) =>
      http.patch(`/repos/${fullName}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repo", owner, repo] });
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setSaveError(err.message || "Failed to update settings");
    },
  });

  if (!owner || !repo) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} isPrivate={repoData?.private} />

      <div className="p-6 max-w-5xl w-full mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-[20px] font-semibold text-fg-default tracking-tight">
            Repository Settings
          </h1>
          <p className="text-[13px] text-fg-muted mt-0.5">
            Manage repository configuration, visibility controls, and danger zone actions.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-lg bg-success-subtle border border-success-fg/30 text-success-fg text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Settings updated successfully.</span>
          </div>
        )}

        {saveError && (
          <div className="p-3 rounded-lg bg-danger-subtle border border-danger-fg/40 text-danger-fg text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{saveError}</span>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-lg bg-canvas-subtle border border-border-default p-6 flex flex-col gap-3 animate-pulse">
            <div className="h-5 bg-canvas-inset rounded w-1/4" />
            <div className="h-4 bg-canvas-inset rounded w-2/3" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* General Settings */}
            <div className="rounded-lg bg-canvas-subtle border border-border-default overflow-hidden shadow-sm flex flex-col">
              <div className="px-5 py-3 bg-canvas-inset border-b border-border-default flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-fg-default">General</h2>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-fg-default">Repository name</label>
                  <input
                    type="text"
                    disabled
                    value={repoData?.name || repo}
                    className="w-full h-9 px-3 rounded-md bg-canvas-inset border border-border-default text-fg-muted font-mono text-[12px] cursor-not-allowed opacity-80"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-fg-default">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description of this repository"
                    className="w-full h-9 px-3 rounded-md bg-canvas-inset border border-border-default text-fg-default font-mono text-[12px] focus:outline-none focus:border-accent-emphasis"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => updateMutation.mutate({ description })}
                    disabled={updateMutation.isPending}
                    className="h-8 px-4 bg-accent-emphasis hover:brightness-110 text-white font-medium text-[12px] rounded-md transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span>{updateMutation.isPending ? "Saving..." : "Save changes"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-lg bg-canvas-subtle border border-danger-fg/30 overflow-hidden shadow-sm flex flex-col">
              <div className="px-5 py-3 bg-danger-subtle/30 border-b border-danger-fg/30 flex items-center gap-2 text-danger-fg">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <h2 className="text-[14px] font-semibold">Danger Zone</h2>
              </div>

              <div className="p-5 flex flex-col divide-y divide-border-default">
                {/* Change Visibility */}
                <div className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-fg-default">Change repository visibility</div>
                    <div className="text-[12px] text-fg-muted mt-0.5">
                      This repository is currently <strong className="text-fg-default">{repoData?.private ? "Private" : "Public"}</strong>.
                    </div>
                  </div>
                  <button
                    onClick={() => updateMutation.mutate({ private: !repoData?.private })}
                    disabled={updateMutation.isPending}
                    className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-canvas-subtle border border-border-default text-fg-default font-medium text-[12px] transition-colors self-start sm:self-auto"
                  >
                    Make {repoData?.private ? "Public" : "Private"}
                  </button>
                </div>

                {/* Delete Repository */}
                <div className="py-4 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-danger-fg">Delete this repository</div>
                    <div className="text-[12px] text-fg-muted mt-0.5">
                      Once deleted, it will be permanently removed along with all code, branches, and settings.
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="h-8 px-3 rounded-md bg-danger-emphasis hover:brightness-110 text-white font-medium text-[12px] flex items-center gap-1.5 transition-all self-start sm:self-auto shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    <span>Delete repository</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteRepoDialog
        owner={owner}
        repo={repo}
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
