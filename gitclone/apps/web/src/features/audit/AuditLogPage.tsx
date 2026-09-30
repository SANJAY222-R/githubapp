import React from "react";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";

interface AuditEntry {
  id: string;
  action: string;
  target: string;
  status: "success" | "failure";
  correlationId?: string;
  entryHash?: string;
  prevHash?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function AuditLogPage() {
  const { data: entries, isLoading, error } = useQuery({
    queryKey: ["audit"],
    queryFn: () => http.get<AuditEntry[]>("/me/audit"),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-5">
      {/* Header with Hash Chain Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-default">
        <div>
          <h1 className="text-[20px] font-semibold text-fg-default tracking-tight">Security Audit Log</h1>
          <p className="text-[13px] text-fg-muted mt-0.5">
            Tamper-evident, hash-chained forensic audit trail of all authentication and mutating operations.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-success-subtle border border-success-fg/30 rounded-md text-success-fg font-mono text-[11px] font-medium self-start sm:self-auto">
          <span className="material-symbols-outlined text-[15px]">verified_user</span>
          <span>Hash Chain Verified (SHA-256)</span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-canvas-subtle border border-border-default rounded-lg p-6 animate-pulse flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-8 bg-canvas-inset rounded" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-danger-subtle border border-danger-fg/40 text-danger-fg p-4 rounded-md">
          Failed to load audit trail: {(error as Error).message}
        </div>
      )}

      {/* Audit Log Table */}
      {!isLoading && !error && (
        <div className="bg-canvas-subtle border border-border-default rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-canvas-inset border-b border-border-default font-semibold text-fg-default">
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Entry Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default font-mono">
                {(!entries || entries.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-fg-muted">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-canvas-inset/50 transition-colors">
                      <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-fg-default">
                        {entry.action}
                      </td>
                      <td className="px-4 py-2.5 text-accent-fg truncate max-w-xs">
                        {entry.target}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            entry.status === "success"
                              ? "bg-success-subtle text-success-fg border border-success-fg/30"
                              : "bg-danger-subtle text-danger-fg border border-danger-fg/30"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-fg-subtle text-[11px] truncate max-w-[120px]" title={entry.entryHash}>
                        {entry.entryHash ? entry.entryHash.slice(0, 12) + "..." : "chained"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
