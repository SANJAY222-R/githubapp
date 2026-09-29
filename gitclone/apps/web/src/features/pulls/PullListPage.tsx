import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

type PR = { number: number; title: string; state: string; draft: boolean; user: { login: string }; createdAt: string; head: { ref: string }; base: { ref: string } };

export function PullListPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const [state, setState] = useState<"open" | "closed" | "all">("open");

  const { data } = useQuery({
    queryKey: ["pulls", fullName, state],
    queryFn: () => http.get<PR[]>(`/repos/${fullName}/pulls?state=${state}`),
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["open", "closed", "all"] as const).map((s) => (
            <button key={s} onClick={() => setState(s)} style={{ padding: "4px 12px", background: state === s ? "#0969da" : "#fff", color: state === s ? "#fff" : "#24292f", border: "1px solid #d0d7de", borderRadius: 6, cursor: "pointer" }}>{s}</button>
          ))}
        </div>
        <Link to={`/repos/${fullName}/pulls/new`} style={{ padding: "6px 16px", background: "#2da44e", color: "#fff", textDecoration: "none", borderRadius: 6 }}>New PR</Link>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {data?.map((pr) => (
          <li key={pr.number} style={{ padding: "12px 0", borderBottom: "1px solid #e1e4e8" }}>
            <Link to={`/repos/${fullName}/pulls/${pr.number}`} style={{ fontWeight: 500, color: "#0969da" }}>#{pr.number} {pr.title}</Link>
            {pr.draft && <span style={{ fontSize: 11, border: "1px solid #d0d7de", borderRadius: 20, padding: "1px 8px", marginLeft: 8 }}>Draft</span>}
            <div style={{ fontSize: 12, color: "#57606a", marginTop: 4 }}>{pr.user.login} · {pr.head.ref} → {pr.base.ref} · {new Date(pr.createdAt).toLocaleDateString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
