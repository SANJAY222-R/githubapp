import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";

type Notification = { id: string; reason: string; unread: boolean; updatedAt: string; subject: { title: string; type: string }; repository: { fullName: string } };

export function NotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => http.get<Notification[]>("/notifications"),
    refetchInterval: 60_000,
  });

  if (isLoading) return <div style={{ padding: 24 }}>Loading notifications...</div>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h2>Notifications</h2>
      {!data?.length && <p style={{ color: "#57606a" }}>All caught up!</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {data?.map((n) => (
          <li key={n.id} style={{ padding: "12px 0", borderBottom: "1px solid #e1e4e8", opacity: n.unread ? 1 : 0.6 }}>
            <div style={{ fontWeight: n.unread ? 600 : 400 }}>{n.subject.title}</div>
            <div style={{ fontSize: 12, color: "#57606a", marginTop: 4 }}>
              {n.repository.fullName} · {n.subject.type} · {n.reason} · {new Date(n.updatedAt).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
