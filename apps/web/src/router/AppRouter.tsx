import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.js";
import { LoginPage } from "../features/auth/LoginPage.js";
import { RepoListPage } from "../features/repos/RepoListPage.js";
import { NewRepoPage } from "../features/repos/NewRepoPage.js";
import { RepoDetailPage } from "../features/repos/RepoDetailPage.js";
import { FileBrowserPage } from "../features/files/FileBrowserPage.js";
import { BranchesPage } from "../features/branches/BranchesPage.js";
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
import { http } from "../lib/http.js";
import { queryClient } from "../lib/queryClient.js";

function NavBar() {
  const { user, refetch } = useAuth();
  const logout = async () => {
    await http.post("/auth/disconnect");
    queryClient.clear();
    refetch();
  };
  return (
    <nav style={{ background: "#24292f", color: "#fff", padding: "10px 24px", display: "flex", alignItems: "center", gap: 20 }}>
      <Link to="/" style={{ color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: 18 }}>GitClone</Link>
      <Link to="/notifications" style={{ color: "#ccc", textDecoration: "none" }}>Notifications</Link>
      <Link to="/audit" style={{ color: "#ccc", textDecoration: "none" }}>Audit</Link>
      <Link to="/ai" style={{ color: "#ccc", textDecoration: "none" }}>AI</Link>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        {user && <span style={{ fontSize: 13 }}>{user.login}</span>}
        <button onClick={logout} style={{ background: "none", border: "1px solid #555", color: "#ccc", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Sign out</button>
      </div>
    </nav>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <BrowserRouter>
      {user && <NavBar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<RequireAuth><RepoListPage /></RequireAuth>} />
        <Route path="/repos/new" element={<RequireAuth><NewRepoPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo" element={<RequireAuth><RepoDetailPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/files/*" element={<RequireAuth><FileBrowserPage /></RequireAuth>} />
        <Route path="/repos/:owner/:repo/branches" element={<RequireAuth><BranchesPage /></RequireAuth>} />
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
