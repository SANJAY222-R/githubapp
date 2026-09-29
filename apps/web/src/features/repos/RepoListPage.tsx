import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { http } from "../../lib/http.js";

type Repo = { name: string; fullName: string; description: string | null; private: boolean; stargazersCount: number; language: string | null; updatedAt: string };

export function RepoListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["repos"],
    queryFn: () => http.get<Repo[]>("/repos"),
  });

  if (isLoading) return <div style={{ padding: 24 }}>Loading repositories...</div>;
  if (error) return <div style={{ padding: 24, color: "#d73a49" }}>Failed to load repositories.</div>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Your Repositories</h1>
        <Link to="/repos/new" style={{ padding: "6px 16px", background: "#2da44e", color: "#fff", textDecoration: "none", borderRadius: 6 }}>New</Link>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {data?.map((repo) => (
          <li key={repo.fullName} style={{ borderBottom: "1px solid #e1e4e8", padding: "16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link to={`/repos/${repo.fullName}`} style={{ fontWeight: 600, fontSize: 16, color: "#0969da" }}>{repo.fullName}</Link>
              {repo.private && <span style={{ fontSize: 11, border: "1px solid #d0d7de", borderRadius: 20, padding: "1px 8px" }}>Private</span>}
            </div>
            {repo.description && <p style={{ margin: "4px 0 0", color: "#57606a", fontSize: 13 }}>{repo.description}</p>}
            <div style={{ marginTop: 8, fontSize: 12, color: "#57606a", display: "flex", gap: 16 }}>
              {repo.language && <span>{repo.language}</span>}
              <span>☆ {repo.stargazersCount}</span>
              <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
