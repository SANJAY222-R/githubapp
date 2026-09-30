import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";

interface Notification {
  id: string;
  reason: string;
  unread: boolean;
  updatedAt: string;
  subject: { title: string; type: string };
  repository: { fullName: string };
}

export function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => http.get<Notification[]>("/notifications"),
    refetchInterval: 60_000,
  });

  const filtered = (notifications || []).filter((n) => (filter === "unread" ? n.unread : true));

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-default">
        <div>
          <h1 className="text-[20px] font-semibold text-fg-default tracking-tight">Notifications</h1>
          <p className="text-[13px] text-fg-muted mt-0.5">
            Real-time GitHub webhook notifications and repository event subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-canvas-inset border border-border-default p-0.5 rounded-md">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
              filter === "all" ? "bg-canvas-default text-fg-default font-semibold shadow-sm" : "text-fg-muted hover:text-fg-default"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
              filter === "unread" ? "bg-canvas-default text-fg-default font-semibold shadow-sm" : "text-fg-muted hover:text-fg-default"
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-canvas-subtle border border-border-default rounded-lg p-6 animate-pulse flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-10 bg-canvas-inset rounded" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-md">
          Failed to load notifications: {(error as Error).message}
        </div>
      )}

      {/* Notifications Container */}
      {!isLoading && !error && (
        <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden divide-y divide-border-default shadow-sm">
          {filtered.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[36px] text-fg-muted">inbox</span>
              <span className="text-[14px] font-semibold text-fg-default">All caught up!</span>
              <span className="text-[12px] text-fg-muted">You have no {filter === "unread" ? "unread" : ""} notifications.</span>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start gap-3 hover:bg-canvas-inset/60 transition-colors ${
                  n.unread ? "bg-canvas-subtle" : "opacity-75"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${
                    n.subject.type === "PullRequest"
                      ? "text-success-fg"
                      : n.subject.type === "Issue"
                      ? "text-attention-fg"
                      : "text-accent-fg"
                  }`}
                >
                  {n.subject.type === "PullRequest"
                    ? "call_merge"
                    : n.subject.type === "Issue"
                    ? "adjust"
                    : "notifications"}
                </span>

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[13px] text-fg-default">{n.subject.title}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-canvas-inset border border-border-default text-fg-muted">
                      {n.subject.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-fg-muted text-[11px] font-mono flex-wrap">
                    <span className="text-accent-fg font-medium">{n.repository.fullName}</span>
                    <span>&bull;</span>
                    <span>reason: {n.reason}</span>
                    <span>&bull;</span>
                    <span>{new Date(n.updatedAt).toLocaleString()}</span>
                  </div>
                </div>

                {n.unread && <span className="w-2 h-2 rounded-full bg-accent-fg shrink-0 mt-2" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
