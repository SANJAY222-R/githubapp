import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { RepoHeader } from "../../components/RepoHeader.js";
import { Markdown } from "../../components/ui/Markdown.js";
import { DeleteFolderDialog } from "../../components/dialogs/DeleteFolderDialog.js";
import { DeleteFileDialog } from "../../components/dialogs/DeleteFileDialog.js";

interface RawTreeItem {
  path: string;
  name?: string;
  type: "blob" | "tree" | string;
  sha?: string;
  size?: number;
  downloadUrl?: string | null;
}

interface FileResponse {
  type: "file" | "dir";
  name?: string;
  path: string;
  sha?: string;
  size?: number;
  content?: string;
  encoding?: string;
  entries?: RawTreeItem[];
}

function decodeBase64Utf8(base64?: string, encoding?: string): string {
  if (!base64) return "";
  if (encoding === "base64") {
    try {
      const clean = base64.replace(/\s/g, "");
      const binary = atob(clean);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return base64;
    }
  }
  return base64;
}

export function FileBrowserPage() {
  const { owner, repo, "*": rawFilePath } = useParams<{ owner: string; repo: string; "*": string }>();
  const [copied, setCopied] = useState(false);
  const [viewRaw, setViewRaw] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<{ path: string; sha?: string } | null>(null);

  const fullName = `${owner}/${repo}`;
  const filePath = (rawFilePath ?? "").replace(/^\/+/, "");

  // 1. If at root (/repos/:owner/:repo/files), fetch tree
  const {
    data: treeData,
    isLoading: treeLoading,
    error: treeError,
  } = useQuery<RawTreeItem[]>({
    queryKey: ["tree", fullName],
    queryFn: () => http.get<RawTreeItem[]>(`/repos/${fullName}/tree`),
    enabled: !filePath && !!owner && !!repo,
  });

  // 2. If viewing a path (folder or file), fetch getContent
  const {
    data: fileData,
    isLoading: fileLoading,
    error: fileError,
  } = useQuery<FileResponse>({
    queryKey: ["file", fullName, filePath],
    queryFn: () => http.get<FileResponse>(`/repos/${fullName}/file?path=${encodeURIComponent(filePath)}`),
    enabled: !!filePath && !!owner && !!repo,
  });

  // Normalize root tree entries if viewing root
  const rootEntries = useMemo(() => {
    if (filePath || !treeData) return [];
    const rawItems = Array.isArray(treeData) ? treeData : [];
    const dirMap = new Map<string, RawTreeItem>();
    const files: RawTreeItem[] = [];

    for (const item of rawItems) {
      if (!item || !item.path) continue;
      const parts = item.path.split("/");
      const rootName = parts[0];
      if (!rootName) continue;

      if (parts.length === 1) {
        if (item.type === "tree" || item.type === "dir") {
          dirMap.set(rootName, {
            path: rootName,
            name: rootName,
            type: "tree",
            sha: item.sha,
            size: item.size || 0,
          });
        } else {
          files.push({
            path: rootName,
            name: rootName,
            type: "blob",
            sha: item.sha,
            size: item.size || 0,
          });
        }
      } else {
        if (!dirMap.has(rootName)) {
          dirMap.set(rootName, {
            path: rootName,
            name: rootName,
            type: "tree",
            sha: item.sha,
            size: 0,
          });
        }
      }
    }

    const sortedDirs = Array.from(dirMap.values()).sort((a, b) => (a.name || a.path).localeCompare(b.name || b.path));
    const sortedFiles = files.sort((a, b) => (a.name || a.path).localeCompare(b.name || b.path));
    return [...sortedDirs, ...sortedFiles];
  }, [filePath, treeData]);

  if (!owner || !repo) return null;

  const pathParts = filePath ? filePath.split("/").filter(Boolean) : [];
  const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";
  const parentLink = parentPath ? `/repos/${fullName}/files/${parentPath}` : `/repos/${fullName}`;

  const decodedContent = decodeBase64Utf8(fileData?.content, fileData?.encoding);

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDirectory = !filePath || fileData?.type === "dir" || (fileData?.entries && fileData.entries.length > 0);
  const directoryEntries = filePath ? fileData?.entries ?? [] : rootEntries;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-4">
        {/* Breadcrumb Bar */}
        <div className="flex items-center justify-between bg-canvas-subtle border border-border-default rounded-lg px-4 py-2.5 text-[13px] shadow-sm">
          <div className="flex items-center gap-1.5 flex-wrap font-mono">
            <Link to={`/repos/${fullName}`} className="text-accent-fg hover:underline font-semibold">
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

          <Link
            to={parentLink}
            className="text-[12px] text-fg-muted hover:text-fg-default flex items-center gap-1 transition-colors px-2 py-1 rounded bg-canvas-inset border border-border-default text-decoration-none"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>{filePath ? "Parent directory" : "Repository overview"}</span>
          </Link>
        </div>

        {/* Loading State */}
        {(treeLoading || fileLoading) && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg p-8 animate-pulse flex flex-col gap-3">
            <div className="h-4 bg-canvas-inset rounded w-1/4" />
            <div className="h-4 bg-canvas-inset rounded w-1/2" />
            <div className="h-4 bg-canvas-inset rounded w-3/4" />
          </div>
        )}

        {/* Error State */}
        {(treeError || fileError) && (
          <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="text-[13px]">Failed to load path: {((treeError || fileError) as Error).message}</span>
          </div>
        )}

        {/* Directory Listing (Root or Subfolder) */}
        {!treeLoading && !fileLoading && !treeError && !fileError && isDirectory && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden divide-y divide-border-default shadow-sm flex flex-col">
            <div className="px-4 py-2 bg-canvas-inset font-mono text-[11px] text-fg-muted uppercase tracking-wider flex items-center justify-between">
              <span>{filePath || "root directory"}</span>
              <div className="flex items-center gap-3">
                <span>{directoryEntries.length} items</span>
                <Link
                  to={`/repos/${fullName}/new/${filePath ? filePath + "/" : ""}`}
                  className="flex items-center gap-1 text-accent-fg hover:underline font-semibold lowercase tracking-normal text-[12px] normal-case"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>Add file</span>
                </Link>
              </div>
            </div>

            {directoryEntries.length === 0 ? (
              <div className="p-8 text-center text-fg-muted text-[13px]">
                No files found in this directory.
              </div>
            ) : (
              directoryEntries.map((entry) => {
                const isDir = entry.type === "dir" || entry.type === "tree";
                const entryName = entry.name || entry.path.split("/").pop() || entry.path;
                const entryPath = entry.path;

                return (
                  <div
                    key={entryPath}
                    className="flex items-center justify-between h-9 px-4 hover:bg-canvas-inset/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 w-1/2">
                      <span className={`material-symbols-outlined text-[18px] shrink-0 ${isDir ? "text-accent-fg" : "text-fg-muted"}`}>
                        {isDir ? "folder" : entryName.endsWith(".md") ? "menu_book" : "description"}
                      </span>
                      <Link
                        to={`/repos/${fullName}/files/${entryPath}`}
                        className={`font-mono text-[12px] truncate hover:underline ${
                          isDir ? "font-semibold text-fg-default hover:text-accent-fg" : "text-fg-default hover:text-accent-fg"
                        }`}
                      >
                        {entryName}
                      </Link>
                    </div>
                    <div className="w-1/4 truncate text-right pr-4 font-mono text-[11px] text-fg-muted">
                      {isDir ? "directory" : entry.size ? `${entry.size} bytes` : ""}
                    </div>
                    <div className="w-1/4 text-right font-mono text-[11px] text-fg-muted shrink-0 flex items-center justify-end gap-2">
                      <span>{entry.sha ? entry.sha.slice(0, 7) : ""}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isDir) {
                            setFolderToDelete(entryPath);
                          } else {
                            setFileToDelete({ path: entryPath, sha: entry.sha });
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger-subtle text-fg-muted hover:text-danger-fg transition-all"
                        title={isDir ? "Delete directory" : "Delete file"}
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

        {/* File Content Preview */}
        {!treeLoading && !fileLoading && !treeError && !fileError && !isDirectory && fileData && (
          <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden shadow-sm flex flex-col">
            {(() => {
              const lines = decodedContent.split("\n");
              const isMarkdown = filePath.endsWith(".md") || filePath.endsWith(".markdown");

              return (
                <>
                  {/* File Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-canvas-inset border-b border-border-default">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-accent-fg">
                        {isMarkdown ? "menu_book" : "description"}
                      </span>
                      <span className="font-mono text-[12px] font-semibold text-fg-default">{filePath}</span>
                      <span className="font-mono text-[11px] text-fg-muted ml-2">
                        {lines.length} lines &bull; {fileData.size ? `${fileData.size} bytes` : `${decodedContent.length} bytes`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/repos/${fullName}/edit/${filePath}`}
                        className="h-7 px-2.5 rounded-md bg-canvas-default border border-border-default hover:bg-canvas-subtle text-fg-default text-[12px] font-medium flex items-center gap-1.5 transition-colors text-decoration-none"
                        title="Edit this file"
                      >
                        <span className="material-symbols-outlined text-[15px] text-accent-fg">edit</span>
                        <span>Edit</span>
                      </Link>

                      {isMarkdown && (
                        <button
                          onClick={() => setViewRaw(!viewRaw)}
                          className={`h-7 px-2.5 rounded-md border text-[11px] font-mono flex items-center gap-1 transition-colors ${
                            viewRaw
                              ? "bg-accent-emphasis text-white border-accent-emphasis"
                              : "bg-canvas-default border-border-default text-fg-muted hover:text-fg-default hover:bg-canvas-subtle"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">code</span>
                          <span>{viewRaw ? "Preview" : "Raw"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => copyContent(decodedContent)}
                        className="h-7 px-2.5 rounded-md bg-canvas-default border border-border-default hover:bg-canvas-subtle text-fg-default text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {copied ? "check" : "content_copy"}
                        </span>
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>

                      <button
                        onClick={() => setFileToDelete({ path: filePath, sha: fileData.sha })}
                        className="h-7 px-2.5 rounded-md bg-canvas-default border border-border-default hover:bg-danger-subtle hover:border-danger-fg/40 text-fg-muted hover:text-danger-fg text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                        title="Delete this file"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Content Container */}
                  {isMarkdown && !viewRaw ? (
                    <div className="p-6">
                      <Markdown content={decodedContent} />
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
                      <pre className="pl-4 m-0 overflow-visible font-mono">
                        <code>{decodedContent}</code>
                      </pre>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Delete Folder Dialog */}
      {folderToDelete && (
        <DeleteFolderDialog
          owner={owner}
          repo={repo}
          folderPath={folderToDelete}
          isOpen={true}
          onClose={() => setFolderToDelete(null)}
        />
      )}

      {/* Delete File Dialog */}
      {fileToDelete && (
        <DeleteFileDialog
          owner={owner}
          repo={repo}
          filePath={fileToDelete.path}
          fileSha={fileToDelete.sha}
          isOpen={true}
          onClose={() => setFileToDelete(null)}
        />
      )}
    </div>
  );
}
