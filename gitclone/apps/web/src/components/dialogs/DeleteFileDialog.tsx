import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

interface DeleteFileDialogProps {
  owner: string;
  repo: string;
  filePath: string;
  fileSha?: string;
  isOpen: boolean;
  onClose: () => void;
  branch?: string;
}

export function DeleteFileDialog({
  owner,
  repo,
  filePath,
  fileSha = "",
  isOpen,
  onClose,
  branch = "main",
}: DeleteFileDialogProps) {
  const navigate = useNavigate();
  const fullName = `${owner}/${repo}`;
  const [commitMessage, setCommitMessage] = useState(`chore: delete ${filePath}`);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () =>
      http.delete(`/repos/${fullName}/file`, {
        path: filePath,
        message: commitMessage || `chore: delete ${filePath}`,
        sha: fileSha,
        branch,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repoTree", owner, repo] });
      queryClient.invalidateQueries({ queryKey: ["tree", fullName] });
      queryClient.invalidateQueries({ queryKey: ["file", fullName] });
      onClose();
      // If we are currently browsing this file, navigate up to parent
      const parts = filePath.split("/").filter(Boolean);
      if (parts.length > 1) {
        navigate(`/repos/${fullName}/files/${parts.slice(0, -1).join("/")}`);
      } else {
        navigate(`/repos/${fullName}`);
      }
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to delete file");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-[540px] bg-canvas-overlay border border-border-default rounded-xl shadow-overlay overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Top Danger Hairline */}
        <div className="h-1.5 w-full bg-danger-emphasis" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-border-default">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-danger-subtle border border-danger-fg/30 flex items-center justify-center shrink-0 text-danger-fg">
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-[17px] font-semibold text-fg-default tracking-tight truncate">
                Delete file
              </h2>
              <span className="font-mono text-[12px] text-fg-muted truncate">{filePath}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg-default hover:bg-canvas-subtle transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-danger-subtle border border-danger-fg/40 text-danger-fg text-[13px] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-[13px] text-fg-muted leading-relaxed">
            Are you sure you want to delete <code className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-canvas-inset border border-border-default text-fg-default font-semibold">{filePath}</code> from branch <span className="font-mono font-semibold text-fg-default">{branch}</span>?
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-fg-default">
              Commit message
            </label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={`chore: delete ${filePath}`}
              className="w-full h-9 px-3 rounded-lg bg-canvas-inset border border-border-default text-fg-default font-mono text-[12px] focus:outline-none focus:border-accent-emphasis"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-canvas-subtle border-t border-border-default flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-canvas-inset hover:bg-canvas-subtle border border-border-default text-fg-default font-medium text-[13px] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
            className="h-9 px-4 rounded-lg bg-danger-emphasis hover:brightness-110 text-white font-medium text-[13px] flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[17px]">delete_forever</span>
            <span>{deleteMutation.isPending ? "Deleting file..." : "Commit deletion"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
