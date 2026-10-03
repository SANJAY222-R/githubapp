import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { RepoHeader } from "../../components/RepoHeader.js";
import { Markdown } from "../../components/ui/Markdown.js";
import { DeleteFolderDialog } from "../../components/dialogs/DeleteFolderDialog.js";
import { DeleteFileDialog } from "../../components/dialogs/DeleteFileDialog.js";
import { DeleteRepoDialog } from "../../components/dialogs/DeleteRepoDialog.js";

interface RawTreeItem {
  path: string;
  mode?: string;
  type: "blob" | "tree" | "commit" | string;
  sha: string;
  size?: number;
  url?: string;
}

interface DisplayFileEntry {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
}

interface Branch {
  name: string;
  sha: string;
  protected?: boolean;
}

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
  htmlUrl: string;
  cloneUrl: string;
  ownerLogin: string;
  ownerAvatarUrl?: string;
}

interface CommitItem {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author?: {
    login: string;
    avatarUrl?: string;
  } | null;
}

interface FileContentResponse {
  type: "file" | "dir";
  name: string;
  path: string;
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
}

function decodeBase64Utf8(base64: string): string {
  try {
    const clean = base64.replace(/\s/g, "");
    const binary = atob(clean);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return base64;
  }
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const delta = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (delta < 60) return "just now";
    if (delta < 3600) return `${Math.floor(delta / 60)} mins ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)} hours ago`;
    if (delta < 2592000) return `${Math.floor(delta / 86400)} days ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export function RepoDetailPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneTab, setCloneTab] = useState<"https" | "ssh">("https");
  const [copied, setCopied] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<{ path: string; sha: string } | null>(null);
  const [repoDeleteOpen, setRepoDeleteOpen] = useState(false);

  // 1. Fetch Repository Metadata
  const { data: repoData } = useQuery<RepoDetails>({
    queryKey: ["repo", owner, repo],
    queryFn: () => http.get<RepoDetails>(`/repos/${owner}/${repo}`),
    enabled: !!owner && !!repo,
  });

  // Effective active branch
  const activeBranch = selectedBranch || repoData?.defaultBranch || "main";

  // 2. Fetch Branches list
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches", `${owner}/${repo}`],
    queryFn: () => http.get<Branch[]>(`/repos/${owner}/${repo}/branches`),
    enabled: !!owner && !!repo,
  });

  // 3. Fetch Tree
  const {
    data: treeData,
    isLoading: treeLoading,
    error: treeError,
  } = useQuery<RawTreeItem[] | { entries: DisplayFileEntry[]; readme?: string }>({
    queryKey: ["repoTree", owner, repo, activeBranch],
    queryFn: () => http.get(`/repos/${owner}/${repo}/tree?ref=${encodeURIComponent(activeBranch)}`),
    enabled: !!owner && !!repo,
  });

  // Normalize entries into top-level items for the root view
  const entries: DisplayFileEntry[] = useMemo(() => {
    if (!treeData) return [];

    // If API returned { entries: [...] }
    if (!Array.isArray(treeData) && Array.isArray((treeData as any).entries)) {
      return (treeData as any).entries;
    }

    // If API returned RawTreeItem[] from git.getTree
    const rawItems = Array.isArray(treeData) ? treeData : [];
    const dirMap = new Map<string, DisplayFileEntry>();
    const files: DisplayFileEntry[] = [];

    for (const item of rawItems) {
      if (!item || !item.path) continue;
      const parts = item.path.split("/");
      const rootName = parts[0];
      if (!rootName) continue;

      if (parts.length === 1) {
        // Direct root child
        if (item.type === "tree" || item.type === "dir") {
          dirMap.set(rootName, {
            name: rootName,
            path: rootName,
            sha: item.sha || "",
            size: item.size || 0,
            type: "dir",
          });
        } else {
          files.push({
            name: rootName,
            path: rootName,
            sha: item.sha || "",
            size: item.size || 0,
            type: "file",
          });
        }
      } else {
        // Sub-child -> add root directory if not present
        if (!dirMap.has(rootName)) {
          dirMap.set(rootName, {
            name: rootName,
            path: rootName,
            sha: item.sha || "",
            size: 0,
            type: "dir",
          });
        }
      }
    }

    const sortedDirs = Array.from(dirMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));
    return [...sortedDirs, ...sortedFiles];
  }, [treeData]);

  // Find README file if present
  const readmeEntry = useMemo(() => {
    return entries.find((e) => /^readme(\.md|\.markdown|\.txt)?$/i.test(e.name));
  }, [entries]);

  // 4. Fetch README content
  const { data: readmeFile, isLoading: readmeLoading } = useQuery<FileContentResponse>({
    queryKey: ["repoReadme", owner, repo, activeBranch, readmeEntry?.path],
    queryFn: () =>
      http.get<FileContentResponse>(
        `/repos/${owner}/${repo}/file?path=${encodeURIComponent(readmeEntry!.path)}&ref=${encodeURIComponent(activeBranch)}`
      ),
    enabled: !!readmeEntry && !!owner && !!repo,
  });

  const readmeMarkdown = useMemo(() => {
    if (!readmeFile?.content) return null;
    return readmeFile.encoding === "base64" ? decodeBase64Utf8(readmeFile.content) : readmeFile.content;
  }, [readmeFile]);

  // 5. Fetch Latest Commit for current branch
  const { data: commitsData } = useQuery<CommitItem[]>({
    queryKey: ["repoLatestCommit", owner, repo, activeBranch],
    queryFn: () => http.get<CommitItem[]>(`/repos/${owner}/${repo}/commits?ref=${encodeURIComponent(activeBranch)}&page=1`),
    enabled: !!owner && !!repo,
  });

  const latestCommit = commitsData && commitsData.length > 0 ? commitsData[0] : null;

  const cloneUrlHttps = repoData?.cloneUrl || `https://github.com/${owner}/${repo}.git`;
  const cloneUrlSsh = `git@github.com:${owner}/${repo}.git`;
  const currentCloneUrl = cloneTab === "https" ? cloneUrlHttps : cloneUrlSsh;

  const copyCloneUrl = () => {
    navigator.clipboard.writeText(currentCloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!owner || !repo) return null;

  return (
    <div className="flex flex-col min-h-full">
      <RepoHeader owner={owner} repo={repo} isPrivate={repoData?.private} />

      <div className="p-6 max-w-[1520px] w-full mx-auto flex flex-col gap-5">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Branch Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setBranchMenuOpen(!branchMenuOpen)}
                className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-canvas-subtle text-fg-default font-mono text-[12px] flex items-center gap-2 border border-border-default shadow-sm transition-colors"
                title="Switch branch"
              >
                <span className="material-symbols-outlined text-[16px] text-fg-muted">fork_right</span>
                <span className="font-semibold">{activeBranch}</span>
                <span className="material-symbols-outlined text-[14px] text-fg-muted">arrow_drop_down</span>
              </button>

              {branchMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-64 rounded-lg bg-canvas-overlay border border-border-default shadow-overlay z-50 py-1 flex flex-col max-h-72 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-fg-muted border-b border-border-default uppercase tracking-wider">
                    Branches
                  </div>
                  {branches && branches.length > 0 ? (
                    branches.map((b) => (
                      <button
                        key={b.name}
                        onClick={() => {
                          setSelectedBranch(b.name);
                          setBranchMenuOpen(false);
                        }}
                        className={`px-3 py-2 text-left font-mono text-[12px] flex items-center justify-between hover:bg-canvas-subtle transition-colors ${
                          b.name === activeBranch ? "text-accent-fg font-semibold bg-canvas-subtle/50" : "text-fg-default"
                        }`}
                      >
                        <span className="truncate">{b.name}</span>
                        {b.name === activeBranch && (
                          <span className="material-symbols-outlined text-[16px] text-accent-fg">check</span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-[12px] text-fg-muted font-mono">{activeBranch}</div>
                  )}
                </div>
              )}
            </div>

            <Link
              to={`/repos/${owner}/${repo}/branches`}
              className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-canvas-subtle text-fg-muted hover:text-fg-default font-medium text-[12px] flex items-center gap-1.5 border border-border-default shadow-sm transition-colors text-decoration-none"
            >
              <span className="material-symbols-outlined text-[16px]">fork_right</span>
              <span>Branches</span>
              {branches && <span className="font-mono text-[11px] text-fg-muted">({branches.length})</span>}
            </Link>

            <Link
              to={`/repos/${owner}/${repo}/commits`}
              className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-canvas-subtle text-fg-muted hover:text-fg-default font-medium text-[12px] flex items-center gap-1.5 border border-border-default shadow-sm transition-colors text-decoration-none"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>Commits</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Add File Link */}
            <Link
              to={`/repos/${owner}/${repo}/new`}
              className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-canvas-subtle text-fg-default font-medium text-[12px] flex items-center gap-1.5 border border-border-default shadow-sm transition-colors text-decoration-none"
            >
              <span className="material-symbols-outlined text-[16px] text-accent-fg">add</span>
              <span>Add file</span>
            </Link>

            {/* Clone Repository Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCloneOpen(!cloneOpen)}
                className="h-8 px-3 rounded-md bg-success-emphasis hover:brightness-110 text-white font-medium text-[12px] flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">code</span>
                <span>Code</span>
                <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
              </button>

              {cloneOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-canvas-overlay border border-border-default p-4 shadow-overlay z-50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-fg-default">Clone repository</span>
                    <span className="font-mono text-[11px] text-fg-muted">Git Gateway</span>
                  </div>

                  <div className="flex rounded-md bg-canvas-inset border border-border-default p-0.5">
                    <button
                      onClick={() => setCloneTab("https")}
                      className={`flex-1 py-1 text-center font-mono text-[11px] rounded transition-colors ${
                        cloneTab === "https" ? "bg-canvas-default text-accent-fg font-semibold shadow-sm" : "text-fg-muted hover:text-fg-default"
                      }`}
                    >
                      HTTPS
                    </button>
                    <button
                      onClick={() => setCloneTab("ssh")}
                      className={`flex-1 py-1 text-center font-mono text-[11px] rounded transition-colors ${
                        cloneTab === "ssh" ? "bg-canvas-default text-accent-fg font-semibold shadow-sm" : "text-fg-muted hover:text-fg-default"
                      }`}
                    >
                      SSH
                    </button>
                  </div>

                  <div className="flex items-center rounded-md bg-canvas-inset border border-border-default px-2.5 py-1.5 justify-between gap-2">
                    <span className="font-mono text-[11px] text-fg-muted truncate">{currentCloneUrl}</span>
                    <button
                      onClick={copyCloneUrl}
                      className="text-fg-muted hover:text-accent-fg transition-colors p-1"
                      title="Copy URL"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copied ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          {/* Main Column: Tree & Readme */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Loading state */}
            {treeLoading && (
              <div className="rounded-lg bg-canvas-subtle border border-border-default p-6 flex flex-col gap-3 animate-pulse">
                <div className="h-5 bg-canvas-inset rounded w-1/3" />
                <div className="h-4 bg-canvas-inset rounded w-full" />
                <div className="h-4 bg-canvas-inset rounded w-full" />
                <div className="h-4 bg-canvas-inset rounded w-4/5" />
              </div>
            )}

            {/* Error state */}
            {treeError && (
              <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span className="text-[13px] font-medium">Failed to load repository files: {(treeError as Error).message}</span>
              </div>
            )}

            {/* Files Container */}
            {!treeLoading && !treeError && (
              <div className="rounded-lg bg-canvas-subtle border border-border-default overflow-hidden shadow-sm flex flex-col">
                {/* Latest Commit Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-canvas-inset border-b border-border-default text-fg-default">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-accent-emphasis flex items-center justify-center text-white font-mono text-[10px] font-bold shrink-0">
                      {latestCommit?.author?.login?.slice(0, 2).toUpperCase() || owner.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-mono text-[12px] font-semibold text-fg-default">
                      {latestCommit?.author?.login || latestCommit?.commit?.author?.name || owner}
                    </span>
                    <span className="font-mono text-[12px] text-fg-muted truncate max-w-md">
                      {latestCommit?.commit?.message || "Workspace synchronized"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-success-subtle text-success-fg border border-success-fg/30 font-mono text-[10px] font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      <span>Verified</span>
                    </span>
                    {latestCommit && (
                      <Link
                        to={`/repos/${owner}/${repo}/commits/${latestCommit.sha}`}
                        className="font-mono text-[11px] text-accent-fg hover:underline"
                      >
                        {latestCommit.sha.slice(0, 7)}
                      </Link>
                    )}
                    <span className="font-mono text-[11px] text-fg-muted">
                      {formatRelativeTime(latestCommit?.commit?.author?.date || repoData?.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* File Tree Rows */}
                <div className="flex flex-col divide-y divide-border-default">
                  {entries.length === 0 ? (
                    <div className="p-8 text-center text-fg-muted text-[13px] flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[32px] text-fg-subtle">folder_open</span>
                      <span>This repository has no files in branch <span className="font-mono font-semibold text-fg-default">{activeBranch}</span>.</span>
                    </div>
                  ) : (
                    entries.map((entry) => (
                      <div
                        key={entry.path}
                        className="flex items-center justify-between h-9 px-4 hover:bg-canvas-inset/60 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 w-2/5">
                          <span className={`material-symbols-outlined text-[18px] shrink-0 ${entry.type === "dir" ? "text-accent-fg" : "text-fg-muted"}`}>
                            {entry.type === "dir" ? "folder" : entry.name.endsWith(".md") ? "menu_book" : "description"}
                          </span>
                          <Link
                            to={`/repos/${owner}/${repo}/files/${entry.path}`}
                            className={`font-mono text-[12px] truncate hover:underline ${
                              entry.type === "dir" ? "font-semibold text-fg-default hover:text-accent-fg" : "text-fg-default hover:text-accent-fg"
                            }`}
                          >
                            {entry.name}
                          </Link>
                        </div>
                        <div className="w-2/5 truncate pr-4 flex items-center justify-between">
                          <span className="font-mono text-[11px] text-fg-muted group-hover:text-fg-default transition-colors truncate block">
                            {entry.type === "dir" ? "directory" : `${entry.size} bytes`}
                          </span>
                        </div>
                        <div className="w-1/5 text-right font-mono text-[11px] text-fg-muted shrink-0 flex items-center justify-end gap-2">
                          <span>{entry.sha ? entry.sha.slice(0, 7) : ""}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (entry.type === "dir") {
                                setFolderToDelete(entry.path);
                              } else {
                                setFileToDelete({ path: entry.path, sha: entry.sha });
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger-subtle text-fg-muted hover:text-danger-fg transition-all"
                            title={entry.type === "dir" ? "Delete directory" : "Delete file"}
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* README Markdown Block */}
            {readmeEntry && (
              <div className="rounded-lg bg-canvas-subtle border border-border-default overflow-hidden shadow-sm flex flex-col">
                <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-inset border-b border-border-default">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-accent-fg">menu_book</span>
                    <span className="font-mono text-[12px] font-semibold text-fg-default">{readmeEntry.name}</span>
                  </div>
                </div>
                <div className="p-6">
                  {readmeLoading ? (
                    <div className="animate-pulse flex flex-col gap-2">
                      <div className="h-4 bg-canvas-inset rounded w-1/3" />
                      <div className="h-4 bg-canvas-inset rounded w-2/3" />
                    </div>
                  ) : readmeMarkdown ? (
                    <Markdown content={readmeMarkdown} />
                  ) : (
                    <div className="text-fg-muted font-mono text-[12px]">No content found in {readmeEntry.name}.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: About & Metadata */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            <div className="rounded-lg bg-canvas-subtle border border-border-default p-4 flex flex-col gap-3 shadow-sm">
              <h3 className="text-[14px] font-semibold text-fg-default">About</h3>
              <p className="text-[13px] text-fg-muted">
                {repoData?.description || "Repository synchronized with GitHub Gateway via token envelope encryption."}
              </p>
              <div className="pt-2 border-t border-border-default flex flex-col gap-2 text-[12px] text-fg-muted">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-fg-muted">star</span>
                    <span>Stars</span>
                  </span>
                  <span className="font-mono text-fg-default font-semibold">{repoData?.stargazersCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-fg-muted">call_split</span>
                    <span>Forks</span>
                  </span>
                  <span className="font-mono text-fg-default font-semibold">{repoData?.forksCount ?? 0}</span>
                </div>
                {repoData?.language && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-fg-muted">code</span>
                      <span>Language</span>
                    </span>
                    <span className="font-mono text-accent-fg font-semibold">{repoData.language}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-fg-muted">
                      {repoData?.private ? "lock" : "public"}
                    </span>
                    <span>Visibility</span>
                  </span>
                  <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    repoData?.private
                      ? "bg-warning-subtle border-warning-fg/30 text-warning-fg"
                      : "bg-canvas-inset border-border-default text-fg-default"
                  }`}>
                    {repoData?.private ? "Private" : "Public"}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border-default text-[11px]">
                  <span className="material-symbols-outlined text-[15px] text-success-fg">lock</span>
                  <span>Zero-Knowledge Decryption</span>
                </div>
              </div>
            </div>

            {/* Danger Zone Actions Card */}
            <div className="rounded-lg bg-canvas-subtle border border-border-default p-4 flex flex-col gap-3 shadow-sm">
              <h3 className="text-[14px] font-semibold text-fg-default flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-fg-muted">admin_panel_settings</span>
                <span>Management</span>
              </h3>
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to={`/repos/${owner}/${repo}/settings`}
                  className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-canvas-subtle border border-border-default text-fg-default font-medium text-[12px] flex items-center justify-center gap-1.5 transition-colors text-decoration-none"
                >
                  <span className="material-symbols-outlined text-[15px]">settings</span>
                  <span>Repository Settings</span>
                </Link>
                <button
                  onClick={() => setRepoDeleteOpen(true)}
                  className="h-8 px-3 rounded-md bg-canvas-inset hover:bg-danger-subtle border border-border-default hover:border-danger-fg/40 text-danger-fg font-medium text-[12px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                  <span>Delete repository</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Folder Dialog */}
      {folderToDelete && (
        <DeleteFolderDialog
          owner={owner}
          repo={repo}
          folderPath={folderToDelete}
          isOpen={true}
          onClose={() => setFolderToDelete(null)}
          branch={activeBranch}
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
          branch={activeBranch}
        />
      )}

      {/* Delete Repo Dialog */}
      <DeleteRepoDialog
        owner={owner}
        repo={repo}
        isOpen={repoDeleteOpen}
        onClose={() => setRepoDeleteOpen(false)}
        commitsCount={commitsData?.length}
        branchesCount={branches?.length}
      />
    </div>
  );
}
