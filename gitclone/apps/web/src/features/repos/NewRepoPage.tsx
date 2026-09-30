import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

export function NewRepoPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);

  const mutation = useMutation({
    mutationFn: () => http.post<{ fullName: string }>("/repos", { name, description, private: isPrivate, autoInit }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      navigate(`/repos/${data.fullName}`);
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <div className="pb-2 border-b border-border-default">
        <h1 className="text-[20px] font-semibold text-fg-default tracking-tight">Create a new repository</h1>
        <p className="text-[13px] text-fg-muted mt-0.5">
          A repository contains all project files, AST packfiles, and revisions history.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) mutation.mutate();
        }}
        className="bg-canvas-subtle border border-border-default rounded-xl p-6 shadow-sm flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-fg-default">
            Repository name <span className="text-danger-fg">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. distributed-kv-store"
            required
            className="h-8 px-3 bg-canvas-inset border border-border-default rounded-md font-mono text-[12px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis"
          />
          <p className="text-[11px] text-fg-muted">
            Great repository names are short and memorable.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-fg-default">
            Description <span className="text-fg-muted font-normal text-[12px]">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short summary of the project..."
            className="h-8 px-3 bg-canvas-inset border border-border-default rounded-md text-[13px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis"
          />
        </div>

        {/* Public vs Private Radio Choice Cards */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border-default">
          <label
            onClick={() => setIsPrivate(false)}
            className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
              !isPrivate
                ? "bg-canvas-inset border-accent-emphasis/60"
                : "bg-canvas-subtle border-border-default hover:bg-canvas-inset/50"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              checked={!isPrivate}
              onChange={() => setIsPrivate(false)}
              className="mt-1 accent-accent-emphasis"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-fg-default flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-accent-fg">public</span>
                Public
              </span>
              <span className="text-[12px] text-fg-muted">
                Anyone on the internet can see this repository. You choose who can commit.
              </span>
            </div>
          </label>

          <label
            onClick={() => setIsPrivate(true)}
            className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
              isPrivate
                ? "bg-canvas-inset border-accent-emphasis/60"
                : "bg-canvas-subtle border-border-default hover:bg-canvas-inset/50"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              checked={isPrivate}
              onChange={() => setIsPrivate(true)}
              className="mt-1 accent-accent-emphasis"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-fg-default flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-attention-fg">lock</span>
                Private
              </span>
              <span className="text-[12px] text-fg-muted">
                You choose who can see and commit to this repository.
              </span>
            </div>
          </label>
        </div>

        {/* Initialize with README */}
        <div className="pt-2 border-t border-border-default">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoInit}
              onChange={(e) => setAutoInit(e.target.checked)}
              className="w-4 h-4 rounded bg-canvas-default border-border-default accent-accent-emphasis"
            />
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-fg-default">Initialize with a README</span>
              <span className="text-[11px] text-fg-muted">This allows you to immediately clone the repository to your computer.</span>
            </div>
          </label>
        </div>

        {mutation.isError && (
          <div className="p-3 bg-danger-subtle border border-danger-fg/30 text-danger-fg text-[12px] rounded-md">
            {(mutation.error as Error).message}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="h-8 px-3 rounded-md border border-border-default text-fg-muted hover:text-fg-default text-[12px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !name.trim()}
            className="h-8 px-4 bg-success-emphasis hover:brightness-110 disabled:opacity-50 text-white font-medium text-[12px] rounded-md shadow-sm transition-all"
          >
            {mutation.isPending ? "Creating repository..." : "Create repository"}
          </button>
        </div>
      </form>
    </div>
  );
}
