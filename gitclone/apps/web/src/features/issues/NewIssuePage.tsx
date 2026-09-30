import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";
import { RepoHeader } from "../../components/RepoHeader.js";
import { Markdown } from "../../components/ui/Markdown.js";

export function NewIssuePage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  const mutation = useMutation({
    mutationFn: () => http.post<{ number: number }>(`/repos/${fullName}/issues`, { title, body }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["issues", fullName] });
      navigate(`/repos/${fullName}/issues/${data.number}`);
    },
  });

  if (!owner || !repo) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-4xl w-full mx-auto flex flex-col gap-5">
        <div className="pb-2 border-b border-border-default">
          <h2 className="text-[18px] font-semibold text-fg-default tracking-tight">Create an issue</h2>
          <p className="text-[13px] text-fg-muted mt-0.5">
            File a bug report, request an architectural improvement, or track tasks.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) mutation.mutate();
          }}
          className="bg-canvas-subtle border border-border-default rounded-lg p-5 shadow-sm flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-fg-default">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              required
              className="h-8 px-3 bg-canvas-inset border border-border-default rounded-md text-[13px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-border-default pb-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("write")}
                  className={`px-3 py-1 text-[12px] font-medium rounded transition-colors ${
                    activeTab === "write" ? "bg-canvas-inset text-fg-default font-semibold" : "text-fg-muted hover:text-fg-default"
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1 text-[12px] font-medium rounded transition-colors ${
                    activeTab === "preview" ? "bg-canvas-inset text-fg-default font-semibold" : "text-fg-muted hover:text-fg-default"
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {activeTab === "write" ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={10}
                className="w-full p-3 bg-canvas-inset border border-border-default rounded-md font-mono text-[12px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis resize-y"
              />
            ) : (
              <div className="min-h-[200px] p-4 bg-canvas-inset border border-border-default rounded-md">
                {body ? <Markdown content={body} /> : <span className="text-fg-muted italic text-[12px]">Nothing to preview</span>}
              </div>
            )}
          </div>

          {mutation.isError && (
            <div className="p-3 bg-danger-subtle border border-danger-fg/30 text-danger-fg text-[12px] rounded">
              {(mutation.error as Error).message}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
            <button
              type="submit"
              disabled={mutation.isPending || !title.trim()}
              className="h-8 px-4 bg-success-emphasis hover:brightness-110 disabled:opacity-50 text-white text-[12px] font-medium rounded-md shadow-sm transition-all"
            >
              {mutation.isPending ? "Submitting..." : "Submit new issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
