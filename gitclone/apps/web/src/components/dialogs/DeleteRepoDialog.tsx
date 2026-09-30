import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

interface DeleteRepoDialogProps {
  owner: string;
  repo: string;
  isOpen: boolean;
  onClose: () => void;
  commitsCount?: number;
  branchesCount?: number;
}

export function DeleteRepoDialog({
  owner,
  repo,
  isOpen,
  onClose,
  commitsCount,
  branchesCount,
}: DeleteRepoDialogProps) {
  const navigate = useNavigate();
  const fullName = `${owner}/${repo}`;
  const [confirmationInput, setConfirmationInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfirmed = confirmationInput.trim() === fullName;

  const deleteMutation = useMutation({
    mutationFn: () =>
      http.delete(`/repos/${fullName}`, {
        confirmationToken: fullName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      onClose();
      navigate("/");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to delete repository");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-[620px] bg-canvas-overlay border border-border-default rounded-xl shadow-overlay overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Top Danger Hairline */}
        <div className="h-1.5 w-full bg-danger-emphasis" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-border-default">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-danger-subtle border border-danger-fg/30 flex items-center justify-center shrink-0 text-danger-fg">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-[17px] font-semibold text-fg-default tracking-tight truncate">
                Delete repository
              </h2>
              <span className="font-mono text-[12px] text-fg-muted truncate">{fullName}</span>
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
        <div className="px-6 py-5 flex flex-col gap-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-danger-subtle border border-danger-fg/40 text-danger-fg text-[13px] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Warning Banner */}
          <div className="p-4 rounded-lg bg-danger-subtle/40 border border-danger-fg/30 text-danger-fg flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-danger-fg">
                Warning: This action cannot be undone
              </span>
              <p className="text-[12px] text-fg-muted leading-relaxed">
                This will permanently delete the <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-canvas-inset border border-border-default text-fg-default font-semibold">{fullName}</code> repository, including its code history, branches, releases, and settings.
              </p>

              {(commitsCount !== undefined || branchesCount !== undefined) && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-center font-mono text-[11px]">
                  {commitsCount !== undefined && (
                    <div className="p-1.5 rounded bg-canvas-inset border border-border-default flex flex-col">
                      <span className="font-semibold text-fg-default">{commitsCount}</span>
                      <span className="text-[10px] text-fg-muted uppercase">Commits</span>
                    </div>
                  )}
                  {branchesCount !== undefined && (
                    <div className="p-1.5 rounded bg-canvas-inset border border-border-default flex flex-col">
                      <span className="font-semibold text-fg-default">{branchesCount}</span>
                      <span className="text-[10px] text-fg-muted uppercase">Branches</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] text-fg-default flex items-baseline gap-1.5 flex-wrap">
              <span>To verify intent, type</span>
              <span className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-canvas-inset border border-border-default text-accent-fg font-semibold select-all">
                {fullName}
              </span>
              <span>below:</span>
            </label>
            <div className="relative w-full">
              <input
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={fullName}
                className="w-full h-10 px-3 rounded-lg bg-canvas-inset border border-border-default text-fg-default font-mono text-[13px] placeholder:text-fg-subtle focus:outline-none focus:border-danger-emphasis focus:ring-1 focus:ring-danger-emphasis transition-all"
              />
              {isConfirmed && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-success-fg text-[11px] font-mono font-medium">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Verified</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-canvas-inset border border-border-default flex items-center gap-2.5 text-fg-muted text-[12px]">
            <span className="material-symbols-outlined text-[18px] text-fg-subtle shrink-0">verified_user</span>
            <p className="leading-tight">
              <strong className="text-fg-default font-medium">Security enforcement:</strong> Repository destruction is audited and immediately propagated to the Git gateway.
            </p>
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
            disabled={!isConfirmed || deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
            className={`h-9 px-4 rounded-lg text-white font-medium text-[13px] flex items-center gap-1.5 shadow-sm transition-all ${
              isConfirmed && !deleteMutation.isPending
                ? "bg-danger-emphasis hover:brightness-110 active:scale-[0.98] cursor-pointer"
                : "bg-danger-emphasis/40 cursor-not-allowed opacity-60"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">delete_forever</span>
            <span>{deleteMutation.isPending ? "Deleting repository..." : "I understand the consequences, delete this repository"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
