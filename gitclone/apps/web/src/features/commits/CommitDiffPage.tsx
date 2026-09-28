import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";

type DiffFile = { filename: string; status: string; additions: number; deletions: number; patch?: string };
type CommitDetail = { sha: string; message: string; authorName: string; authorDate: string; files: DiffFile[] };

export function CommitDiffPage() {
  const { owner, repo, sha } = useParams<{ owner: string; repo: string; sha: string }>();
  const fullName = `${owner}/${repo}`;

  const { data } = useQuery({
    queryKey: ["commitDiff", fullName, sha],
    queryFn: () => http.get<CommitDetail>(`/${fullName}/commits/${sha}`),
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h2 style={{ fontFamily: "monospace" }}>{sha?.slice(0, 7)}</h2>
      <p style={{ fontWeight: 500 }}>{data?.message}</p>
      <p style={{ color: "#57606a", fontSize: 13 }}>{data?.authorName} · {data?.authorDate && new Date(data.authorDate).toLocaleString()}</p>
      {data?.files.map((f) => (
        <div key={f.filename} style={{ marginBottom: 20 }}>
          <div style={{ background: "#f6f8fa", padding: "8px 12px", borderRadius: "6px 6px 0 0", border: "1px solid #e1e4e8", fontFamily: "monospace", fontSize: 13 }}>
            {f.filename} <span style={{ color: "#2da44e" }}>+{f.additions}</span> <span style={{ color: "#d73a49" }}>-{f.deletions}</span>
          </div>
          {f.patch && (
            <pre style={{ margin: 0, padding: 12, background: "#fff", border: "1px solid #e1e4e8", borderTop: 0, overflow: "auto", fontSize: 12 }}>
              {f.patch.split("\n").map((line, i) => (
                <span key={i} style={{ display: "block", background: line.startsWith("+") ? "#e6ffec" : line.startsWith("-") ? "#ffebe9" : undefined }}>{line}</span>
              ))}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
