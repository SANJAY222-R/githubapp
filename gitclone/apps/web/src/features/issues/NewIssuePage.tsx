import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

export function NewIssuePage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const mutation = useMutation({
    mutationFn: () => http.post<{ number: number }>(`/${fullName}/issues`, { title, body }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["issues", fullName] });
      navigate(`/repos/${fullName}/issues/${data.number}`);
    },
  });

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <h2>New issue</h2>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required style={{ width: "100%", padding: "6px 12px", boxSizing: "border-box", marginBottom: 8 }} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe the issue..." rows={10} style={{ width: "100%", padding: "6px 12px", boxSizing: "border-box", marginBottom: 12 }} />
        {mutation.error && <p style={{ color: "#d73a49" }}>{(mutation.error as Error).message}</p>}
        <button type="submit" disabled={mutation.isPending || !title} style={{ padding: "8px 20px", background: "#2da44e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          {mutation.isPending ? "Submitting..." : "Submit new issue"}
        </button>
      </form>
    </div>
  );
}
