import { useCallback } from "react";
import { useAuth } from "./AuthProvider.js";
import { useRealtimeSSE, invalidateOnPush } from "../lib/realtime.js";
import { queryClient } from "../lib/queryClient.js";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const handler = useCallback((event: string, data: unknown) => {
    if (!user) return;
    const d = data as Record<string, unknown>;
    if (event === "push") invalidateOnPush(d["owner"] as string, d["repo"] as string);
    if (event === "pull_request") queryClient.invalidateQueries({ queryKey: ["pulls", d["owner"], d["repo"]] });
    if (event === "issues") queryClient.invalidateQueries({ queryKey: ["issues", d["owner"], d["repo"]] });
  }, [user]);

  useRealtimeSSE(handler);

  return <>{children}</>;
}
