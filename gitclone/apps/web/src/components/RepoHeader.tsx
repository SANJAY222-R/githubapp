import React from "react";
import { Link, useLocation } from "react-router-dom";

interface RepoHeaderProps {
  owner: string;
  repo: string;
  isPrivate?: boolean;
}

export function RepoHeader({ owner, repo, isPrivate = false }: RepoHeaderProps) {
  const location = useLocation();
  const basePath = `/repos/${owner}/${repo}`;

  const tabs = [
    { label: "Code", path: basePath, icon: "code", exact: true },
    { label: "Issues", path: `${basePath}/issues`, icon: "adjust" },
    { label: "Pull requests", path: `${basePath}/pulls`, icon: "call_merge" },
    { label: "Commits", path: `${basePath}/commits`, icon: "commit" },
    { label: "Branches", path: `${basePath}/branches`, icon: "fork_right" },
  ];

  return (
    <div className="bg-canvas-subtle border-b border-border-default pt-4 px-6 select-none">
      {/* Top Repo Identification Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="material-symbols-outlined text-[22px] text-accent-fg">folder_open</span>
          <div className="flex items-baseline gap-1 text-[16px]">
            <Link to="/" className="text-accent-fg hover:underline font-normal">
              {owner}
            </Link>
            <span className="text-fg-muted font-normal">/</span>
            <Link to={basePath} className="text-fg-default font-semibold hover:underline">
              {repo}
            </Link>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-canvas-inset border border-border-default text-fg-muted font-mono text-[11px] font-medium tracking-wide">
            {isPrivate ? "Private" : "Public"}
          </span>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 h-7 px-2.5 bg-canvas-inset hover:bg-canvas-subtle border border-border-default rounded-md text-[12px] font-medium text-fg-default shadow-sm transition-colors">
            <span className="material-symbols-outlined text-[16px] text-fg-muted">notifications</span>
            <span>Watch</span>
          </button>
          <button className="flex items-center gap-1.5 h-7 px-2.5 bg-canvas-inset hover:bg-canvas-subtle border border-border-default rounded-md text-[12px] font-medium text-fg-default shadow-sm transition-colors">
            <span className="material-symbols-outlined text-[16px] text-fg-muted">star</span>
            <span>Star</span>
          </button>
          <button className="flex items-center gap-1.5 h-7 px-2.5 bg-canvas-inset hover:bg-canvas-subtle border border-border-default rounded-md text-[12px] font-medium text-fg-default shadow-sm transition-colors">
            <span className="material-symbols-outlined text-[16px] text-fg-muted">fork_right</span>
            <span>Fork</span>
          </button>
        </div>
      </div>

      {/* Secondary Tab Bar */}
      <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/files`)
            : location.pathname.startsWith(tab.path);

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-accent-emphasis text-fg-default font-semibold"
                  : "border-transparent text-fg-muted hover:text-fg-default hover:border-border-muted"
              }`}
            >
              <span className={`material-symbols-outlined text-[17px] ${isActive ? "text-fg-default" : "text-fg-muted"}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
