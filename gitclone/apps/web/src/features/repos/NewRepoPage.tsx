import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { queryClient } from "../../lib/queryClient.js";

export function NewRepoPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);

  const mutation = useMutation({
    mutationFn: () => http.post<{ fullName: string }>("/repos", { name, description, private: isPrivate, autoInit }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      navigate(`/repos/${data.fullName}`);
    },
  });

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <h1>Create new repository</h1>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", padding: "6px 12px", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: "6px 12px", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label><input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> Private</label>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label><input type="checkbox" checked={autoInit} onChange={(e) => setAutoInit(e.target.checked)} /> Initialize with README</label>
        </div>
        {mutation.error && <p style={{ color: "#d73a49" }}>{(mutation.error as Error).message}</p>}
        <button type="submit" disabled={mutation.isPending || !name} style={{ padding: "8px 20px", background: "#2da44e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          {mutation.isPending ? "Creating..." : "Create repository"}
        </button>
      </form>
    </div>
  );
}
