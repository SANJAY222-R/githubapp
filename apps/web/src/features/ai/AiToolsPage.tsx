import { useState } from "react";
import { http } from "../../lib/http.js";

export function AiToolsPage() {
  const [diff, setDiff] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [prTitle, setPrTitle] = useState("");
  const [prSummary, setPrSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCommit = async () => {
    setLoading(true); setError(null);
    try { const r = await http.post<{ message: string }>("/ai/commit-message", { diff }); setCommitMsg(r.message); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const generateSummary = async () => {
    setLoading(true); setError(null);
    try { const r = await http.post<{ summary: string }>("/ai/pr-summary", { title: prTitle, diff }); setPrSummary(r.summary); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <h2>AI Tools</h2>
      <div style={{ marginBottom: 24 }}>
        <h3>Commit message generator</h3>
        <textarea value={diff} onChange={(e) => setDiff(e.target.value)} placeholder="Paste your diff here" rows={8} style={{ width: "100%", padding: 12, fontFamily: "monospace", fontSize: 12, boxSizing: "border-box" }} />
        <button onClick={generateCommit} disabled={loading || !diff} style={{ margin: "8px 0", padding: "6px 16px", background: "#0969da", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Generate commit message</button>
        {commitMsg && <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 6 }}>{commitMsg}</pre>}
      </div>
      <div>
        <h3>PR summary generator</h3>
        <input value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder="PR title" style={{ width: "100%", padding: "6px 12px", boxSizing: "border-box", marginBottom: 8 }} />
        <button onClick={generateSummary} disabled={loading || !diff || !prTitle} style={{ padding: "6px 16px", background: "#0969da", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Generate summary</button>
        {prSummary && <p style={{ background: "#f6f8fa", padding: 12, borderRadius: 6 }}>{prSummary}</p>}
      </div>
      {error && <p style={{ color: "#d73a49" }}>{error}</p>}
    </div>
  );
}
