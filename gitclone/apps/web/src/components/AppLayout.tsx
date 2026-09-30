import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.js";
import { useTheme } from "../providers/ThemeProvider.js";
import { GitCloneMark } from "./GitCloneMark.js";
import { http } from "../lib/http.js";
import { queryClient } from "../lib/queryClient.js";
import { wipeClientData } from "../lib/persister.js";
import { RateLimitBanner } from "./ui/RateLimitBanner.js";
import { GithubDegradedBanner } from "./ui/GithubDegradedBanner.js";

interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number | string;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, refetch } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const logout = async () => {
    try {
      await http.post("/auth/disconnect");
    } finally {
      wipeClientData();
      queryClient.clear();
      refetch();
      navigate("/login");
    }
  };

  const navItems: NavItem[] = [
    { label: "Repositories", path: "/", icon: "folder_data" },
    { label: "Notifications", path: "/notifications", icon: "notifications" },
    { label: "Audit log", path: "/audit", icon: "history" },
    { label: "AI Copilot", path: "/ai", icon: "terminal" },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-default text-fg-default font-sans flex flex-col">
      {/* Left Navigation Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-canvas-subtle border-r border-border-default z-50 flex flex-col justify-between select-none">
        <div className="flex flex-col">
          {/* Logo Bar */}
          <div className="h-14 px-4 border-b border-border-default flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 text-decoration-none">
              <GitCloneMark className="w-7 h-7" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-[15px] tracking-tight text-fg-default">GitClone</span>
                <span className="font-mono text-[10px] text-fg-muted px-1.5 py-0.5 rounded bg-canvas-inset border border-border-default">
                  v1.4.0
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col py-2 px-2 gap-0.5">
            {navItems.map((item) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/" || location.pathname.startsWith("/repos")
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-md transition-colors text-[13px] font-medium ${
                    isActive
                      ? "bg-canvas-inset text-accent-fg border-l-2 border-accent-emphasis shadow-sm"
                      : "text-fg-muted hover:bg-canvas-inset hover:text-fg-default"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-canvas-inset text-fg-muted border border-border-default">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Connection Status & Account Info */}
        <div className="p-3 border-t border-border-default flex flex-col gap-2">
          {user && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-canvas-inset border border-border-default">
              <div className="flex items-center gap-2 overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.login} className="w-6 h-6 rounded-full border border-border-default" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-accent-emphasis text-white flex items-center justify-center text-[10px] font-bold">
                    {user.login.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col truncate">
                  <span className="text-[12px] font-medium text-fg-default truncate">{user.login}</span>
                  <span className="font-mono text-[10px] text-fg-muted truncate">Active Session</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-success-fg animate-pulse"></span>
            <span className="font-mono text-[11px] text-fg-muted truncate" title="Connected to GitHub API via Gateway">
              api.github.com (Secure)
            </span>
          </div>
        </div>
      </aside>

      {/* Top Header Bar */}
      <header className="fixed top-0 left-64 right-0 h-14 bg-canvas-subtle/95 backdrop-blur-md border-b border-border-default z-40 flex items-center justify-between px-6">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-fg-muted">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories, pull requests, commits..."
              className="w-full h-8 pl-9 pr-12 bg-canvas-default border border-border-default rounded-md font-mono text-[12px] text-fg-default placeholder:text-fg-muted focus:outline-none focus:border-accent-emphasis focus:ring-1 focus:ring-accent-emphasis transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-fg-muted bg-canvas-inset border border-border-default px-1.5 py-0.5 rounded leading-none pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </form>

        <div className="flex items-center gap-3">
          <Link
            to="/repos/new"
            className="flex items-center gap-1.5 h-8 px-3 bg-success-emphasis hover:brightness-110 text-white text-[12px] font-medium rounded-md shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New</span>
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-canvas-inset border border-border-default text-fg-muted hover:text-fg-default hover:bg-canvas-subtle transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>

          {/* User Profile & Sign Out Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-md hover:bg-canvas-inset border border-transparent hover:border-border-default transition-colors"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.login} className="w-6 h-6 rounded-full border border-border-default" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-accent-emphasis text-white flex items-center justify-center text-[10px] font-bold">
                  {user?.login.slice(0, 2).toUpperCase() || "GC"}
                </div>
              )}
              <span className="material-symbols-outlined text-[16px] text-fg-muted">arrow_drop_down</span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-canvas-overlay border border-border-default rounded-md shadow-overlay py-1 z-50">
                <div className="px-3 py-2 border-b border-border-default">
                  <div className="text-[11px] text-fg-muted font-normal">Signed in as</div>
                  <div className="text-[13px] font-semibold text-fg-default truncate">{user?.login}</div>
                </div>
                <Link
                  to="/"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-fg-default hover:bg-canvas-inset"
                >
                  <span className="material-symbols-outlined text-[16px] text-fg-muted">folder_data</span>
                  Your Repositories
                </Link>
                <Link
                  to="/audit"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-fg-default hover:bg-canvas-inset"
                >
                  <span className="material-symbols-outlined text-[16px] text-fg-muted">history</span>
                  Audit Logs
                </Link>
                <div className="border-t border-border-default my-1"></div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-danger-fg hover:bg-danger-subtle text-left"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="pl-64 pt-14 flex-1 flex flex-col bg-canvas-default">
        <RateLimitBanner />
        <GithubDegradedBanner />
        <div className="flex-1 w-full">{children}</div>
      </main>
    </div>
  );
}
