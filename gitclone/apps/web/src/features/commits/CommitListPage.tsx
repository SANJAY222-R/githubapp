import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";

type Commit = { sha: string; message: string; authorName: string; authorDate: string; htmlUrl: string };

export function CommitListPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;

  const { data } = useQuery({
    queryKey: ["commits", fullName],
    queryFn: () => http.get<Commit[]>(`/${fullName}/commits`),
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h2>Commits — {fullName}</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {data?.map((commit) => (
          <li key={commit.sha} style={{ padding: "12px 0", borderBottom: "1px solid #e1e4e8" }}>
            <div><Link to={`/repos/${fullName}/commits/${commit.sha}`} style={{ fontWeight: 500, color: "#0969da" }}>{commit.message.split("\n")[0]}</Link></div>
            <div style={{ fontSize: 12, color: "#57606a", marginTop: 4 }}>
              {commit.authorName} · {new Date(commit.authorDate).toLocaleDateString()} · <code style={{ fontSize: 11 }}>{commit.sha.slice(0, 7)}</code>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
