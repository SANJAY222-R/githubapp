import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

type Branch = { name: string; sha: string; protected: boolean };

export function BranchesPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const fullName = `${owner}/${repo}`;
  const navigate = useNavigate();
  const [newBranch, setNewBranch] = useState("");
  const [fromBranch, setFromBranch] = useState("main");

  const { data } = useQuery({
    queryKey: ["branches", fullName],
    queryFn: () => http.get<Branch[]>(`/repos/${fullName}/branches`),
  });

  const createMutation = useMutation({
    mutationFn: () => http.post(`/repos/${fullName}/branches`, { name: newBranch, from: fromBranch }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches", fullName] }); setNewBranch(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => http.delete(`/repos/${fullName}/branches/${name}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches", fullName] }),
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h2>Branches — {fullName}</h2>
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="New branch name" style={{ padding: "6px 12px" }} />
        <input value={fromBranch} onChange={(e) => setFromBranch(e.target.value)} placeholder="From branch" style={{ padding: "6px 12px" }} />
        <button type="submit" disabled={!newBranch} style={{ padding: "6px 16px", background: "#2da44e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Create</button>
      </form>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {data?.map((branch) => (
          <li key={branch.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e1e4e8" }}>
            <span style={{ fontFamily: "monospace" }}>{branch.name} {branch.protected && <span style={{ fontSize: 11 }}>🔒</span>}</span>
            {!branch.protected && (
              <button onClick={() => deleteMutation.mutate(branch.name)} style={{ padding: "2px 10px", color: "#d73a49", border: "1px solid #d73a49", borderRadius: 4, background: "none", cursor: "pointer" }}>Delete</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
