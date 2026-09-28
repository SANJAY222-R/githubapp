import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

type Issue = { number: number; title: string; state: string; user: { login: string }; labels: { name: string; color: string }[]; createdAt: string; comments: number };

export function IssueListPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const [state, setState] = useState<"open" | "closed" | "all">("open");

  const { data } = useQuery({
    queryKey: ["issues", fullName, state],
    queryFn: () => http.get<Issue[]>(`/${fullName}/issues?state=${state}`),
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["open", "closed", "all"] as const).map((s) => (
            <button key={s} onClick={() => setState(s)} style={{ padding: "4px 12px", background: state === s ? "#0969da" : "#fff", color: state === s ? "#fff" : "#24292f", border: "1px solid #d0d7de", borderRadius: 6, cursor: "pointer" }}>{s}</button>
          ))}
        </div>
        <Link to={`/repos/${fullName}/issues/new`} style={{ padding: "6px 16px", background: "#2da44e", color: "#fff", textDecoration: "none", borderRadius: 6 }}>New issue</Link>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {data?.map((issue) => (
          <li key={issue.number} style={{ padding: "12px 0", borderBottom: "1px solid #e1e4e8" }}>
            <div>
              <Link to={`/repos/${fullName}/issues/${issue.number}`} style={{ fontWeight: 500, color: "#0969da" }}>#{issue.number} {issue.title}</Link>
              {issue.labels.map((l) => (
                <span key={l.name} style={{ fontSize: 11, borderRadius: 20, padding: "1px 8px", marginLeft: 6, background: `#${l.color}22`, border: `1px solid #${l.color}` }}>{l.name}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#57606a", marginTop: 4 }}>{issue.user.login} · {new Date(issue.createdAt).toLocaleDateString()} · {issue.comments} comments</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
