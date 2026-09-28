import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { Markdown } from "../../components/ui/Markdown.js";

type Issue = { number: number; title: string; state: string; body: string | null; user: { login: string; avatarUrl: string }; labels: { name: string; color: string }[]; assignees: { login: string }[]; createdAt: string; comments: number; locked: boolean };

export function IssueDetailPage() {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const fullName = `${owner}/${repo}`;

  const { data } = useQuery({
    queryKey: ["issue", fullName, number],
    queryFn: () => http.get<Issue>(`/${fullName}/issues/${number}`),
  });

  if (!data) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h2>#{data.number} {data.title}</h2>
      <div style={{ fontSize: 13, color: "#57606a", marginBottom: 16 }}>
        <strong>{data.user.login}</strong> · {data.state} · {new Date(data.createdAt).toLocaleDateString()} · {data.comments} comments
        {data.labels.map((l) => (
          <span key={l.name} style={{ fontSize: 11, borderRadius: 20, padding: "1px 8px", marginLeft: 6, background: `#${l.color}22`, border: `1px solid #${l.color}` }}>{l.name}</span>
        ))}
      </div>
      {data.body ? <Markdown content={data.body} /> : <p style={{ color: "#57606a" }}>No description.</p>}
    </div>
  );
}
