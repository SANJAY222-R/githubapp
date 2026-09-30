import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.js";
import { AppLayout } from "../components/AppLayout.js";
import { LoginPage } from "../features/auth/LoginPage.js";
import { RepoListPage } from "../features/repos/RepoListPage.js";
import { NewRepoPage } from "../features/repos/NewRepoPage.js";
import { RepoDetailPage } from "../features/repos/RepoDetailPage.js";
import { FileBrowserPage } from "../features/files/FileBrowserPage.js";
import { BranchesPage } from "../features/branches/BranchesPage.js";
import { RepoSettingsPage } from "../features/repos/RepoSettingsPage.js";
import { CommitListPage } from "../features/commits/CommitListPage.js";
import { CommitDiffPage } from "../features/commits/CommitDiffPage.js";
import { PullListPage } from "../features/pulls/PullListPage.js";
import { PullDetailPage } from "../features/pulls/PullDetailPage.js";
import { NewPullPage } from "../features/pulls/NewPullPage.js";
import { IssueListPage } from "../features/issues/IssueListPage.js";
import { IssueDetailPage } from "../features/issues/IssueDetailPage.js";
import { NewIssuePage } from "../features/issues/NewIssuePage.js";
import { NotificationsPage } from "../features/notifications/NotificationsPage.js";
import { AuditLogPage } from "../features/audit/AuditLogPage.js";
import { AiToolsPage } from "../features/ai/AiToolsPage.js";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-default text-fg-muted flex items-center justify-center font-mono text-[13px]">
        Loading application state...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-default text-fg-muted flex items-center justify-center font-mono text-[13px]">
        Loading application state...
      </div>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<RequireAuth><RepoListPage /></RequireAuth>} />
        <Route path="/repos/new" element={<RequireAuth><NewRepoPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo" element={<RequireAuth><RepoDetailPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/files/*" element={<RequireAuth><FileBrowserPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/branches" element={<RequireAuth><BranchesPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/settings" element={<RequireAuth><RepoSettingsPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/commits" element={<RequireAuth><CommitListPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/commits/:sha" element={<RequireAuth><CommitDiffPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/pulls" element={<RequireAuth><PullListPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/pulls/new" element={<RequireAuth><NewPullPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/pulls/:number" element={<RequireAuth><PullDetailPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/issues" element={<RequireAuth><IssueListPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/issues/new" element={<RequireAuth><NewIssuePage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/issues/:number" element={<RequireAuth><IssueDetailPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/audit" element={<RequireAuth><AuditLogPage /></RequireAuth>} />
        <Route path="/ai" element={<RequireAuth><AiToolsPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
