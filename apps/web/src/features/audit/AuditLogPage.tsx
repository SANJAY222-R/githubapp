import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";

type AuditEntry = { id: string; action: string; target: string; status: "success" | "failure"; metadata: Record<string, unknown>; createdAt: string };

export function AuditLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: () => http.get<AuditEntry[]>("/me/audit"),
  });

  if (isLoading) return <div style={{ padding: 24 }}>Loading audit log...</div>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h2>Audit Log</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e1e4e8", textAlign: "left" }}>
            <th style={{ padding: "8px 0" }}>Time</th>
            <th style={{ padding: "8px 0" }}>Action</th>
            <th style={{ padding: "8px 0" }}>Target</th>
            <th style={{ padding: "8px 0" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((entry) => (
            <tr key={entry.id} style={{ borderBottom: "1px solid #e1e4e8" }}>
              <td style={{ padding: "8px 0", color: "#57606a" }}>{new Date(entry.createdAt).toLocaleString()}</td>
              <td style={{ padding: "8px 0", fontFamily: "monospace" }}>{entry.action}</td>
              <td style={{ padding: "8px 0" }}>{entry.target}</td>
              <td style={{ padding: "8px 0", color: entry.status === "success" ? "#2da44e" : "#d73a49" }}>{entry.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
