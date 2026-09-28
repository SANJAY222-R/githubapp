import { useState } from "react";
import { http } from "../../lib/http.js";
import { useAuth } from "../../providers/AuthProvider.js";

export function LoginPage() {
  const { refetch } = useAuth();
  const [pat, setPat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connectPat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await http.post("/auth/pat", { token: pat });
      refetch();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>GitClone</h1>
      <a
        href="/api/auth/oauth/start"
        style={{ display: "block", padding: "10px 16px", background: "#24292f", color: "#fff", textDecoration: "none", borderRadius: 6, textAlign: "center", marginBottom: 16 }}
      >
        Sign in with GitHub (OAuth)
      </a>
      <div style={{ textAlign: "center", marginBottom: 16, color: "#888" }}>or</div>
      <form onSubmit={connectPat}>
        <input
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          placeholder="GitHub Personal Access Token"
          type="password"
          style={{ width: "100%", padding: "8px 12px", boxSizing: "border-box", marginBottom: 8 }}
        />
        {error && <p style={{ color: "#d73a49", fontSize: 13, margin: "0 0 8px" }}>{error}</p>}
        <button type="submit" disabled={loading || !pat} style={{ width: "100%", padding: "10px 16px", background: "#0969da", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          {loading ? "Connecting..." : "Connect PAT"}
        </button>
      </form>
    </div>
  );
}
