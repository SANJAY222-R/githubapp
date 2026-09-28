import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

export function NewPullPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [head, setHead] = useState("");
  const [base, setBase] = useState("main");
  const [draft, setDraft] = useState(false);

  const mutation = useMutation({
    mutationFn: () => http.post<{ number: number }>(`/${fullName}/pulls`, { title, body, head, base, draft }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pulls", fullName] });
      navigate(`/repos/${fullName}/pulls/${data.number}`);
    },
  });

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <h2>Open a pull request</h2>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={head} onChange={(e) => setHead(e.target.value)} placeholder="Head branch" required style={{ flex: 1, padding: "6px 12px" }} />
          <span style={{ lineHeight: "34px" }}>→</span>
          <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="Base branch" required style={{ flex: 1, padding: "6px 12px" }} />
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required style={{ width: "100%", padding: "6px 12px", boxSizing: "border-box", marginBottom: 8 }} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Leave a comment" rows={8} style={{ width: "100%", padding: "6px 12px", boxSizing: "border-box", marginBottom: 8 }} />
        <div style={{ marginBottom: 16 }}><label><input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} /> Draft</label></div>
        {mutation.error && <p style={{ color: "#d73a49" }}>{(mutation.error as Error).message}</p>}
        <button type="submit" disabled={mutation.isPending} style={{ padding: "8px 20px", background: "#2da44e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          {mutation.isPending ? "Creating..." : "Create pull request"}
        </button>
      </form>
    </div>
  );
}
