import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { useAuth } from "../../providers/AuthProvider.js";
import { RepoHeader } from "../../components/RepoHeader.js";

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
  defaultBranch: string;
  ownerLogin: string;
}

interface FileResponse {
  type: "file" | "dir";
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
  encoding: string;
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

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript (React)",
    js: "JavaScript",
    jsx: "JavaScript (React)",
    json: "JSON",
    rs: "Rust",
    py: "Python",
    go: "Go",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    md: "Markdown",
    sql: "SQL",
    yaml: "YAML",
    yml: "YAML",
    sh: "Shell Script",
    bash: "Bash",
    toml: "TOML",
    env: "Dotenv",
  };
  return map[ext] || "Plain Text";
}

export function FileEditorPage() {
  const { owner, repo, "*": rawPath } = useParams<{ owner: string; repo: string; "*": string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isNewFileMode = location.pathname.includes("/new");
  const initialFilePath = (rawPath ?? "").replace(/^\/+/, "");

  const [filePath, setFilePath] = useState(initialFilePath);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [fileSha, setFileSha] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });

  // Commit Modal State
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitTitle, setCommitTitle] = useState("");
  const [commitDescription, setCommitDescription] = useState("");
  const [commitTarget, setCommitTarget] = useState<"direct" | "pr">("direct");
  const [newBranchName, setNewBranchName] = useState("");
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const fullName = `${owner}/${repo}`;

  // Fetch Repo info
  const { data: repoData } = useQuery<RepoDetails>({
    queryKey: ["repo", owner, repo],
    queryFn: () => http.get<RepoDetails>(`/repos/${owner}/${repo}`),
    enabled: !!owner && !!repo,
  });

  const defaultBranch = repoData?.defaultBranch || "main";
  const activeBranch = selectedBranch || defaultBranch;

  // Fetch Branches
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches", fullName],
    queryFn: () => http.get<Branch[]>(`/repos/${fullName}/branches`),
    enabled: !!owner && !!repo,
  });

  const currentBranchObj = branches?.find((b) => b.name === activeBranch);
  const isBranchProtected = currentBranchObj?.protected ?? activeBranch === defaultBranch;

  // Fetch Existing File if in Edit Mode
  const { data: fileData, isLoading: fileLoading } = useQuery<FileResponse>({
    queryKey: ["file", fullName, initialFilePath, activeBranch],
    queryFn: () => http.get<FileResponse>(`/repos/${fullName}/file?path=${encodeURIComponent(initialFilePath)}&ref=${encodeURIComponent(activeBranch)}`),
    enabled: !isNewFileMode && !!initialFilePath && !!owner && !!repo,
  });

  useEffect(() => {
    if (!isNewFileMode && fileData) {
      const decoded = decodeBase64Utf8(fileData.content, fileData.encoding);
      setContent(decoded);
      setOriginalContent(decoded);
      setFileSha(fileData.sha);
      setFilePath(fileData.path);
    }
  }, [fileData, isNewFileMode]);

  useEffect(() => {
    if (isNewFileMode && !filePath && initialFilePath) {
      setFilePath(initialFilePath.endsWith("/") ? initialFilePath : `${initialFilePath}/`);
    }
  }, [isNewFileMode, initialFilePath]);

  // Set default commit titles when filePath changes
  useEffect(() => {
    const filename = filePath.split("/").pop() || "file";
    if (isNewFileMode) {
      setCommitTitle(`Create ${filename}`);
      setNewBranchName(`${user?.login || "patch"}-create-${filename.replace(/[^a-zA-Z0-9_-]/g, "-")}`);
    } else {
      setCommitTitle(`Update ${filename}`);
      setNewBranchName(`${user?.login || "patch"}-update-${filename.replace(/[^a-zA-Z0-9_-]/g, "-")}`);
    }
  }, [filePath, isNewFileMode, user?.login]);

  // Cursor and line counting
  const lines = useMemo(() => content.split("\n"), [content]);
  const originalLines = useMemo(() => originalContent.split("\n"), [originalContent]);
  const byteLength = useMemo(() => new Blob([content]).size, [content]);

  // Calculate simple diff statistics
  const diffStats = useMemo(() => {
    if (isNewFileMode) {
      return { added: lines.length, removed: 0 };
    }
    const added = Math.max(0, lines.length - originalLines.length);
    const removed = Math.max(0, originalLines.length - lines.length);
    return {
      added: added > 0 ? added : lines.some((l, i) => l !== originalLines[i]) ? 1 : 0,
      removed: removed > 0 ? removed : 0,
    };
  }, [lines, originalLines, isNewFileMode]);

  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;
    const lineNum = text.substring(0, selStart).split("\n").length;
    const colNum = selStart - text.lastIndexOf("\n", selStart - 1);
    setCursorPosition({ line: lineNum, col: colNum });
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const spaces = "  "; // 2 spaces
      const newText = content.substring(0, start) + spaces + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + spaces.length;
        }
      }, 0);
    }
  };

  // Commit Mutation
  const commitMutation = useMutation({
    mutationFn: async () => {
      setCommitError(null);
      const cleanPath = filePath.trim().replace(/^\/+/, "");
      if (!cleanPath) {
        throw new Error("File path cannot be empty");
      }

      const fullMessage = commitDescription ? `${commitTitle.trim()}\n\n${commitDescription.trim()}` : commitTitle.trim();

      if (commitTarget === "pr") {
        const cleanBranch = newBranchName.trim();
        if (!cleanBranch) {
          throw new Error("New branch name is required");
        }

        // 1. Create the new branch from activeBranch
        await http.post(`/repos/${fullName}/branches`, {
          name: cleanBranch,
          from: activeBranch,
        });

        // 2. Commit file to the new branch
        await http.put(`/repos/${fullName}/file`, {
          path: cleanPath,
          message: fullMessage,
          content: content,
          sha: isNewFileMode ? undefined : fileSha,
          branch: cleanBranch,
        });

        // 3. Create Pull Request
        const pr = await http.post<{ number: number }>(`/repos/${fullName}/pulls`, {
          title: commitTitle.trim(),
          head: cleanBranch,
          base: activeBranch,
          body: commitDescription || `Commit changes to \`${cleanPath}\``,
        });

        return { type: "pr", prNumber: pr.number, branch: cleanBranch, path: cleanPath };
      } else {
        // Direct commit to branch
        await http.put(`/repos/${fullName}/file`, {
          path: cleanPath,
          message: fullMessage,
          content: content,
          sha: isNewFileMode ? undefined : fileSha,
          branch: activeBranch,
        });

        return { type: "direct", branch: activeBranch, path: cleanPath };
      }
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["repoTree", owner, repo] });
      queryClient.invalidateQueries({ queryKey: ["tree", fullName] });
      queryClient.invalidateQueries({ queryKey: ["file", fullName] });
      queryClient.invalidateQueries({ queryKey: ["commits", fullName] });
      queryClient.invalidateQueries({ queryKey: ["branches", fullName] });
      queryClient.invalidateQueries({ queryKey: ["pulls", fullName] });

      setCommitModalOpen(false);

      if (result.type === "pr") {
        navigate(`/repos/${fullName}/pulls/${result.prNumber}`);
      } else {
        navigate(`/repos/${fullName}/files/${result.path}`);
      }
    },
    onError: (err: any) => {
      setCommitError(err.message || "Failed to commit changes");
    },
  });

  const language = detectLanguage(filePath);

  // Generate standard AI commit message suggestions
  const suggestedMessages = useMemo(() => {
    const filename = filePath.split("/").pop() || "file";
    const nameWithoutExt = filename.split(".")[0];
    if (isNewFileMode) {
      return [
        `feat(${nameWithoutExt}): add ${filename} module`,
        `feat: create ${filename} for ${repo} implementation`,
        `docs: initialize ${filename} documentation`,
      ];
    } else {
      return [
        `feat(${nameWithoutExt}): update ${filename} implementation`,
        `fix(${nameWithoutExt}): resolve handling in ${filename}`,
        `refactor(${nameWithoutExt}): optimize logic in ${filename}`,
      ];
    }
  }, [filePath, isNewFileMode, repo]);

  if (!owner || !repo) return null;

  return (
    <div className={`flex flex-col min-h-screen bg-canvas-default text-fg-default ${isFullscreen ? "fixed inset-0 z-50 overflow-auto" : ""}`}>
      {!isFullscreen && <RepoHeader owner={owner} repo={repo} />}

      <main className="flex-1 flex flex-col max-w-[1520px] w-full mx-auto p-4 md:p-6 gap-4">
        {/* Repository Context & Breadcrumbs Header */}
        <div className="bg-canvas-subtle border border-border-default rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <span className="material-symbols-outlined text-[18px] text-accent-fg">folder_open</span>
            <div className="flex items-center gap-1.5 font-mono text-[13px] text-fg-muted flex-wrap">
              <Link to={`/repos/${fullName}`} className="text-accent-fg hover:underline">
                {repo}
              </Link>
              <span>/</span>
              {isNewFileMode ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="Name your file (e.g. src/utils.ts)..."
                    className="h-8 px-2.5 rounded bg-canvas-default border border-border-default text-fg-default font-mono text-[13px] focus:outline-none focus:border-accent-emphasis focus:ring-1 focus:ring-accent-emphasis w-64 sm:w-80"
                  />
                  <span className="text-[11px] text-fg-muted">in</span>
                </div>
              ) : (
                <span className="font-semibold text-fg-default font-mono">{filePath}</span>
              )}
            </div>

            {/* Branch Selector Pill */}
            <div className="flex items-center gap-1.5 bg-canvas-inset border border-border-default px-2.5 py-1 rounded-md text-[12px] font-mono">
              <span className="material-symbols-outlined text-[15px] text-accent-fg">alt_route</span>
              <span className="font-medium text-fg-default">{activeBranch}</span>
              {isBranchProtected && (
                <span className="ml-1 inline-flex items-center gap-0.5 bg-warning-subtle text-warning-fg px-1.5 py-0.2 rounded text-[10px] font-semibold border border-warning-fg/30">
                  <span className="material-symbols-outlined text-[11px]">lock</span>
                  Protected
                </span>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {!isNewFileMode && (
              <Link
                to={`/repos/${fullName}/commits`}
                className="h-8 px-3 rounded-md bg-canvas-inset border border-border-default hover:bg-canvas-subtle text-fg-default text-[12px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-fg-muted">history</span>
                <span>History</span>
              </Link>
            )}

            <button
              onClick={() => {
                if (!filePath.trim()) {
                  alert("Please provide a valid file name");
                  return;
                }
                setCommitModalOpen(true);
              }}
              className="h-8 px-4 rounded-md bg-accent-emphasis hover:bg-accent-emphasis/90 text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Commit changes...</span>
            </button>
          </div>
        </div>

        {/* Editor Container Card */}
        <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden flex flex-col shadow-sm">
          {/* Editor Mode Tab Strip & Settings */}
          <div className="bg-canvas-inset px-4 pt-2 border-b border-border-default flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-3 py-1.5 rounded-t-md text-[13px] font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "edit"
                    ? "bg-canvas-default text-accent-fg border-accent-emphasis font-semibold"
                    : "text-fg-muted hover:text-fg-default border-transparent"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>Edit file</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-t-md text-[13px] font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "preview"
                    ? "bg-canvas-default text-accent-fg border-accent-emphasis font-semibold"
                    : "text-fg-muted hover:text-fg-default border-transparent"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">difference</span>
                <span>Preview changes</span>
                <span className="flex items-center gap-1 font-mono text-[10px] bg-canvas-inset px-1.5 py-0.2 rounded-full border border-border-default">
                  <span className="text-success-fg">+{diffStats.added}</span>
                  <span className="text-danger-fg">-{diffStats.removed}</span>
                </span>
              </button>
            </div>

            {/* Editor Meta Controls */}
            <div className="flex items-center gap-3 text-fg-muted text-[11px] font-mono pb-1">
              <div className="flex items-center gap-1 bg-canvas-default border border-border-default px-2 py-0.5 rounded">
                <span>Spaces: 2</span>
              </div>
              <div className="flex items-center gap-1 bg-canvas-default border border-border-default px-2 py-0.5 rounded">
                <span>UTF-8</span>
              </div>
              <div className="flex items-center gap-1 bg-canvas-default border border-border-default px-2 py-0.5 rounded text-accent-fg">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-emphasis inline-block"></span>
                <span>{language}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 rounded hover:bg-canvas-default hover:text-fg-default transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                </span>
              </button>
            </div>
          </div>

          {/* Loading State for Edit Mode */}
          {fileLoading && !isNewFileMode ? (
            <div className="p-12 text-center text-fg-muted font-mono text-[13px] animate-pulse">
              Loading file contents...
            </div>
          ) : activeTab === "edit" ? (
            /* Primary Code Editor Viewport */
            <div className="relative flex min-h-[540px] bg-canvas-default">
              {/* Line Numbers Column */}
              <div
                ref={lineNumbersRef}
                className="w-14 bg-canvas-inset/60 select-none py-3 pr-3 text-right font-mono text-[12px] text-fg-subtle border-r border-border-default overflow-hidden leading-6"
              >
                {lines.map((_, i) => {
                  const lineNum = i + 1;
                  const isModified = !isNewFileMode && lines[i] !== originalLines[i];
                  return (
                    <div
                      key={i}
                      className={`relative w-full ${isModified ? "text-accent-fg font-semibold" : ""}`}
                    >
                      {isModified && (
                        <span className="absolute left-1 top-1 bottom-1 w-0.5 bg-accent-emphasis rounded-full"></span>
                      )}
                      {lineNum}
                    </div>
                  );
                })}
              </div>

              {/* Code Textarea Area */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyUp={updateCursorPosition}
                  onClick={updateCursorPosition}
                  onScroll={handleScroll}
                  onKeyDown={handleKeyDown}
                  placeholder="Type or paste your code here..."
                  spellCheck={false}
                  className="w-full h-full min-h-[540px] p-3 font-mono text-[12px] leading-6 bg-transparent text-fg-default resize-none focus:outline-none focus:ring-0 border-0 overflow-auto"
                />
              </div>

              {/* Simple Minimap preview on wide screens */}
              <div className="w-20 bg-canvas-inset/30 p-2 hidden xl:flex flex-col gap-1 select-none border-l border-border-default">
                {lines.slice(0, 35).map((l, i) => (
                  <div
                    key={i}
                    className={`h-0.5 rounded-full ${
                      l.trim() ? (!isNewFileMode && l !== originalLines[i] ? "bg-accent-emphasis w-full" : "bg-border-muted w-3/4") : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Diff Preview Tab */
            <div className="p-4 overflow-x-auto min-h-[540px] font-mono text-[12px] leading-relaxed bg-canvas-default">
              <div className="mb-3 px-3 py-2 bg-canvas-inset border border-border-default rounded text-[12px] flex items-center justify-between">
                <span className="text-fg-muted">
                  Showing changes compared to <span className="text-accent-fg font-semibold">{activeBranch}</span>
                </span>
                <span className="font-semibold">
                  <span className="text-success-fg">+{diffStats.added}</span>{" "}
                  <span className="text-danger-fg">-{diffStats.removed}</span>
                </span>
              </div>

              <div className="divide-y divide-border-default border border-border-default rounded overflow-hidden">
                {lines.map((line, idx) => {
                  const orig = originalLines[idx];
                  const isNew = orig === undefined;
                  const isChanged = orig !== undefined && orig !== line;

                  if (isNew || isChanged) {
                    return (
                      <div key={idx} className="flex bg-success-subtle/20 text-success-fg px-3 py-1">
                        <span className="w-10 text-fg-subtle select-none">+{idx + 1}</span>
                        <pre className="m-0 font-mono whitespace-pre-wrap flex-1">{line}</pre>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="flex px-3 py-1 hover:bg-canvas-inset/40 text-fg-default">
                      <span className="w-10 text-fg-subtle select-none">{idx + 1}</span>
                      <pre className="m-0 font-mono whitespace-pre-wrap flex-1">{line}</pre>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Editor Status Bar */}
          <div className="bg-canvas-inset px-4 py-1.5 border-t border-border-default flex items-center justify-between text-fg-muted font-mono text-[11px] select-none">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-fg-default">
                <span className="material-symbols-outlined text-[14px] text-success-fg">check_circle</span>
                <span>Ready</span>
              </span>
              <span>
                Ln {cursorPosition.line}, Col {cursorPosition.col}
              </span>
              <span>{lines.length} lines</span>
              <span>{byteLength.toLocaleString()} bytes</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{language}</span>
              <span>LF</span>
              <span>UTF-8</span>
            </div>
          </div>
        </div>
      </main>

      {/* Commit Changes Modal Dialog Overlay */}
      {commitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-canvas-subtle border border-border-default rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-canvas-inset border-b border-border-default flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-fg text-[20px]">commit</span>
                <h2 className="text-[16px] font-semibold text-fg-default">
                  {isNewFileMode ? `Create ${filePath}` : `Commit changes to ${filePath}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCommitModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-canvas-subtle flex items-center justify-center text-fg-muted hover:text-fg-default transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4">
              {/* Error Banner if any */}
              {commitError && (
                <div className="p-3 rounded-lg bg-danger-subtle border border-danger-fg/40 text-danger-fg text-[13px] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{commitError}</span>
                </div>
              )}

              {/* Protected Branch Notice */}
              {isBranchProtected && (
                <div className="rounded-lg bg-warning-subtle/40 border border-warning-fg/30 p-3 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-warning-fg text-[18px] shrink-0 mt-0.5">
                    shield_lock
                  </span>
                  <div className="flex flex-col text-[12px] text-fg-default">
                    <span className="font-semibold text-warning-fg">Branch &quot;{activeBranch}&quot; is protected</span>
                    <span className="text-fg-muted mt-0.5">
                      Direct commits to this branch require admin override. It is recommended to create a new branch and open a pull request.
                    </span>
                  </div>
                </div>
              )}

              {/* Commit Title Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-fg-default">
                    Commit message <span className="text-danger-fg">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAiSuggestionsOpen(!aiSuggestionsOpen)}
                      className="text-[11px] font-medium text-accent-fg hover:underline flex items-center gap-1 bg-accent-subtle/30 px-2 py-0.5 rounded border border-accent-fg/20"
                    >
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                      <span>AI Suggestions</span>
                    </button>
                    <span className="font-mono text-[11px] text-fg-muted">{commitTitle.length} / 72</span>
                  </div>
                </div>

                <input
                  type="text"
                  value={commitTitle}
                  onChange={(e) => setCommitTitle(e.target.value)}
                  placeholder="Summary of changes (50 chars recommended)..."
                  className="w-full h-9 px-3 rounded-md bg-canvas-default border border-border-default font-mono text-[13px] text-fg-default focus:outline-none focus:border-accent-emphasis focus:ring-1 focus:ring-accent-emphasis"
                />

                {/* AI Suggestions Dropdown */}
                {aiSuggestionsOpen && (
                  <div className="p-3 bg-canvas-inset border border-border-default rounded-lg flex flex-col gap-2 shadow-md">
                    <div className="flex items-center justify-between text-[11px] font-medium text-fg-muted">
                      <span className="flex items-center gap-1 text-accent-fg">
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        <span>Suggested conventional commit messages:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiSuggestionsOpen(false)}
                        className="hover:text-fg-default"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {suggestedMessages.map((msg, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setCommitTitle(msg);
                            setAiSuggestionsOpen(false);
                          }}
                          className="text-left font-mono text-[12px] text-fg-default hover:text-accent-fg hover:bg-canvas-subtle p-1.5 rounded transition-colors"
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Extended Description Textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-fg-default">
                  Extended description <span className="text-[11px] text-fg-muted font-normal">(optional)</span>
                </label>
                <textarea
                  value={commitDescription}
                  onChange={(e) => setCommitDescription(e.target.value)}
                  rows={3}
                  placeholder="Add an optional extended description..."
                  className="w-full p-3 rounded-md bg-canvas-default border border-border-default text-[13px] text-fg-default focus:outline-none focus:border-accent-emphasis focus:ring-1 focus:ring-accent-emphasis resize-none"
                />
              </div>

              {/* Commit Destination Radio Selection */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="text-[13px] font-semibold text-fg-default">Commit destination</label>

                {/* Radio 1: Direct Commit */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    commitTarget === "direct"
                      ? "bg-canvas-inset border-accent-emphasis"
                      : "bg-canvas-default border-border-default hover:bg-canvas-inset/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="commit_target"
                    value="direct"
                    checked={commitTarget === "direct"}
                    onChange={() => setCommitTarget("direct")}
                    className="mt-1 accent-accent-emphasis"
                  />
                  <div className="flex flex-col text-[12px]">
                    <span className="font-semibold text-fg-default">
                      Commit directly to the <code className="font-mono text-accent-fg bg-canvas-subtle px-1 py-0.5 rounded">{activeBranch}</code> branch
                    </span>
                    {isBranchProtected && (
                      <span className="text-warning-fg mt-0.5 flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[13px]">lock</span>
                        Protected branch
                      </span>
                    )}
                  </div>
                </label>

                {/* Radio 2: Create New Branch + PR */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    commitTarget === "pr"
                      ? "bg-canvas-inset border-accent-emphasis"
                      : "bg-canvas-default border-border-default hover:bg-canvas-inset/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="commit_target"
                    value="pr"
                    checked={commitTarget === "pr"}
                    onChange={() => setCommitTarget("pr")}
                    className="mt-1 accent-accent-emphasis"
                  />
                  <div className="flex flex-col flex-1 text-[12px]">
                    <span className="font-semibold text-fg-default">
                      Create a <span className="text-accent-fg">new branch</span> for this commit and start a pull request
                    </span>
                    <span className="text-fg-muted mt-0.5">
                      Recommended flow for peer reviews, test pipelines, and audit logs.
                    </span>

                    {commitTarget === "pr" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-accent-fg text-[15px]">
                            fork_right
                          </span>
                          <input
                            type="text"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            placeholder="new-branch-name"
                            className="w-full h-8 pl-8 pr-2.5 rounded bg-canvas-default border border-border-default font-mono text-[12px] text-fg-default focus:outline-none focus:border-accent-emphasis"
                          />
                        </div>
                        <span className="text-fg-muted font-mono text-[11px]">from {activeBranch}</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-canvas-inset border-t border-border-default flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCommitModalOpen(false)}
                disabled={commitMutation.isPending}
                className="h-8 px-4 rounded-md bg-canvas-default border border-border-default hover:bg-canvas-subtle text-fg-default text-[12px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => commitMutation.mutate()}
                disabled={commitMutation.isPending || !commitTitle.trim()}
                className="h-8 px-4 rounded-md bg-accent-emphasis hover:bg-accent-emphasis/90 text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                {commitMutation.isPending ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Saving...</span>
                  </>
                ) : commitTarget === "pr" ? (
                  <>
                    <span className="material-symbols-outlined text-[16px]">call_merge</span>
                    <span>Propose changes</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">commit</span>
                    <span>Commit changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
