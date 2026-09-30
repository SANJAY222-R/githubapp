import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { RepoHeader } from "../../components/RepoHeader.js";
import { Markdown } from "../../components/ui/Markdown.js";

interface TreeItem {
  path: string;
  name?: string;
  type: "blob" | "tree";
  sha?: string;
  size?: number;
}

interface FileResponse {
  type: "file" | "dir";
  name?: string;
  path: string;
  sha?: string;
  size?: number;
  content?: string;
  encoding?: string;
  entries?: TreeItem[];
}

export function FileBrowserPage() {
  const { owner, repo, "*": filePath } = useParams<{ owner: string; repo: string; "*": string }>();
  const [copied, setCopied] = useState(false);
  const fullName = `${owner}/${repo}`;

  const { data: tree, isLoading: treeLoading, error: treeError } = useQuery({
    queryKey: ["tree", fullName],
    queryFn: () => http.get<TreeItem[]>(`/repos/${fullName}/tree`),
    enabled: !filePath && !!owner && !!repo,
  });

  const { data: file, isLoading: fileLoading, error: fileError } = useQuery({
    queryKey: ["file", fullName, filePath],
    queryFn: () => http.get<FileResponse>(`/repos/${fullName}/file?path=${encodeURIComponent(filePath ?? "")}`),
    enabled: !!filePath && !!owner && !!repo,
  });

  if (!owner || !repo) return null;

  const pathParts = filePath ? filePath.split("/").filter(Boolean) : [];
  const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";
  const parentLink = parentPath ? `/repos/${fullName}/files/${parentPath}` : `/repos/${fullName}/files`;

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-4">
        {/* Path Breadcrumb Bar */}
        <div className="flex items-center justify-between bg-canvas-subtle border border-border-default rounded-md px-4 py-2 text-[13px]">
          <div className="flex items-center gap-1.5 flex-wrap font-mono">
            <Link to={`/repos/${fullName}`} className="text-accent-fg hover:underline font-medium">
              {repo}
            </Link>
            <span className="text-fg-muted">/</span>
            <Link to={`/repos/${fullName}/files`} className="text-accent-fg hover:underline">
              files
            </Link>
            {pathParts.map((part, idx) => {
              const subPath = pathParts.slice(0, idx + 1).join("/");
              const isLast = idx === pathParts.length - 1;
              return (
                <React.Fragment key={subPath}>
                  <span className="text-fg-muted">/</span>
                  {isLast ? (
                    <span className="font-semibold text-fg-default">{part}</span>
                  ) : (
                    <Link to={`/repos/${fullName}/files/${subPath}`} className="text-accent-fg hover:underline">
                      {part}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {filePath && (
            <Link
              to={parentLink}
              className="text-[12px] text-fg-muted hover:text-fg-default flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Parent directory</span>
            </Link>
          )}
        </div>

        {/* Loading / Error states */}
        {(treeLoading || fileLoading) && (
          <div className="bg-canvas-subtle border border-border-default rounded-md p-8 animate-pulse flex flex-col gap-3">
            <div className="h-4 bg-canvas-inset rounded w-1/4" />
            <div className="h-4 bg-canvas-inset rounded w-1/2" />
            <div className="h-4 bg-canvas-inset rounded w-3/4" />
          </div>
        )}

        {(treeError || fileError) && (
          <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-md flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="text-[13px]">Failed to load path: {((treeError || fileError) as Error).message}</span>
          </div>
        )}

        {/* Directory Listing */}
        {filePath && file && (file.type === "dir" || file.entries) && (
          <div className="bg-canvas-subtle border border-border-default rounded-md overflow-hidden divide-y divide-border-default shadow-sm">
            {(file.entries ?? []).map((entry) => (
              <div
                key={entry.path || entry.name}
                className="flex items-center justify-between h-9 px-4 hover:bg-canvas-inset/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`material-symbols-outlined text-[18px] ${entry.type === "tree" ? "text-accent-fg" : "text-fg-muted"}`}>
                    {entry.type === "tree" ? "folder" : "description"}
                  </span>
                  <Link
                    to={`/repos/${fullName}/files/${entry.path}`}
                    className="font-mono text-[12px] font-medium text-fg-default hover:text-accent-fg"
                  >
                    {entry.name ?? entry.path}
                  </Link>
                </div>
                <span className="font-mono text-[11px] text-fg-muted">
                  {entry.size ? `${entry.size} bytes` : "directory"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Root Directory Tree Listing */}
        {!filePath && tree && (
          <div className="bg-canvas-subtle border border-border-default rounded-md overflow-hidden divide-y divide-border-default shadow-sm">
            {tree.map((entry) => (
              <div
                key={entry.path}
                className="flex items-center justify-between h-9 px-4 hover:bg-canvas-inset/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`material-symbols-outlined text-[18px] ${entry.type === "tree" ? "text-accent-fg" : "text-fg-muted"}`}>
                    {entry.type === "tree" ? "folder" : "description"}
                  </span>
                  <Link
                    to={`/repos/${fullName}/files/${entry.path}`}
                    className="font-mono text-[12px] font-medium text-fg-default hover:text-accent-fg"
                  >
                    {entry.path}
                  </Link>
                </div>
                <span className="font-mono text-[11px] text-fg-muted">
                  {entry.size ? `${entry.size} bytes` : "directory"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* File Content Preview */}
        {filePath && file && file.type !== "dir" && !file.entries && (
          <div className="bg-canvas-subtle border border-border-default rounded-md overflow-hidden shadow-sm flex flex-col">
            {(() => {
              let decoded = "";
              try {
                decoded = file.encoding === "base64" ? atob((file.content ?? "").replace(/\s/g, "")) : (file.content ?? "");
              } catch {
                decoded = file.content ?? "";
              }
              const lines = decoded.split("\n");
              const isMarkdown = filePath.endsWith(".md");

              return (
                <>
                  {/* File Header Bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-inset border-b border-border-default">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-fg-muted">description</span>
                      <span className="font-mono text-[12px] font-semibold text-fg-default">{filePath}</span>
                      <span className="font-mono text-[11px] text-fg-muted ml-2">
                        {lines.length} lines &bull; {file.size ? `${file.size} bytes` : `${decoded.length} bytes`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyContent(decoded)}
                        className="h-7 px-2.5 rounded-md bg-canvas-default border border-border-default hover:bg-canvas-subtle text-fg-default text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {copied ? "check" : "content_copy"}
                        </span>
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Content Container */}
                  {isMarkdown ? (
                    <div className="p-6">
                      <Markdown content={decoded} />
                    </div>
                  ) : (
                    <div className="flex font-mono text-[12px] overflow-x-auto bg-canvas-default text-fg-default p-4 leading-relaxed">
                      {/* Line numbers column */}
                      <div className="select-none text-fg-subtle text-right pr-4 border-r border-border-default">
                        {lines.map((_, i) => (
                          <div key={i}>{i + 1}</div>
                        ))}
                      </div>
                      {/* Code lines */}
                      <pre className="pl-4 m-0 overflow-visible">
                        <code>{decoded}</code>
                      </pre>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
