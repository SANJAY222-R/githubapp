import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.js";

type Repo = { name: string; fullName: string; description: string | null; private: boolean; defaultBranch: string; stargazersCount: number; forksCount: number; language: string | null };

export function RepoDetailPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const fullName = `${owner}/${repo}`;
  const [showDelete, setShowDelete] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => http.get<Repo>(`/repos/${fullName}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => http.delete(`/repos/${fullName}`, { confirmationToken: fullName }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["repos"] }); navigate("/"); },
  });

  if (isLoading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!data) return <div style={{ padding: 24 }}>Repository not found.</div>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      {showDelete && (
        <ConfirmDialog
          title={`Delete ${fullName}`}
          message="This action is irreversible. All code, commits, and branches will be permanently deleted."
          confirmLabel="Delete repository"
          requireTyping={fullName}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDelete(false)}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>{fullName}</h1>
        {data.private && <span style={{ fontSize: 11, border: "1px solid #d0d7de", borderRadius: 20, padding: "1px 8px" }}>Private</span>}
      </div>
      {data.description && <p style={{ color: "#57606a" }}>{data.description}</p>}
      <nav style={{ display: "flex", gap: 16, borderBottom: "1px solid #e1e4e8", marginBottom: 20, paddingBottom: 8 }}>
        <Link to={`/repos/${fullName}/files`}>Files</Link>
        <Link to={`/repos/${fullName}/branches`}>Branches</Link>
        <Link to={`/repos/${fullName}/commits`}>Commits</Link>
        <Link to={`/repos/${fullName}/pulls`}>Pull Requests</Link>
        <Link to={`/repos/${fullName}/issues`}>Issues</Link>
      </nav>
      <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#57606a", marginBottom: 20 }}>
        {data.language && <span>{data.language}</span>}
        <span>☆ {data.stargazersCount}</span>
        <span>Forks: {data.forksCount}</span>
        <span>Default branch: {data.defaultBranch}</span>
      </div>
      <button
        onClick={() => setShowDelete(true)}
        style={{ padding: "6px 16px", background: "#d73a49", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
      >
        Delete repository
      </button>
    </div>
  );
}
