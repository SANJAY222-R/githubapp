import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

type PR = { number: number; title: string; state: string; body: string | null; draft: boolean; merged: boolean; mergeable: boolean | null; user: { login: string; avatarUrl: string }; head: { ref: string; sha: string }; base: { ref: string }; additions: number; deletions: number; changedFiles: number };

export function PullDetailPage() {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const fullName = `${owner}/${repo}`;
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">("merge");

  const { data } = useQuery({
    queryKey: ["pull", fullName, number],
    queryFn: () => http.get<PR>(`/repos/${fullName}/pulls/${number}`),
  });

  const mergeMutation = useMutation({
    mutationFn: () => http.post(`/repos/${fullName}/pulls/${number}/merge`, { mergeMethod }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pulls", fullName] }),
  });

  if (!data) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h2>#{data.number} {data.title}</h2>
      <div style={{ fontSize: 13, color: "#57606a", marginBottom: 16 }}>
        <strong>{data.user.login}</strong> · {data.state} · {data.head.ref} → {data.base.ref} · +{data.additions} -{data.deletions} ({data.changedFiles} files)
      </div>
      {data.body && <p style={{ background: "#f6f8fa", padding: 16, borderRadius: 6 }}>{data.body}</p>}
      {data.state === "open" && !data.merged && (
        <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <select value={mergeMethod} onChange={(e) => setMergeMethod(e.target.value as typeof mergeMethod)} style={{ padding: "6px 10px" }}>
            <option value="merge">Merge commit</option>
            <option value="squash">Squash and merge</option>
            <option value="rebase">Rebase and merge</option>
          </select>
          <button onClick={() => mergeMutation.mutate()} disabled={mergeMutation.isPending || data.mergeable === false} style={{ padding: "6px 16px", background: "#2da44e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            {mergeMutation.isPending ? "Merging..." : "Merge"}
          </button>
        </div>
      )}
      {data.merged && <p style={{ color: "#8250df", marginTop: 16 }}>Merged</p>}
    </div>
  );
}
