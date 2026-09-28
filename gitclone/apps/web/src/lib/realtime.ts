import { useEffect } from "react";
import { queryClient } from "./queryClient.js";

type SSEHandler = (event: string, data: unknown) => void;

export function useRealtimeSSE(handler: SSEHandler) {
  useEffect(() => {
    const es = new EventSource("/api/stream", { withCredentials: true });
    const events = ["push", "pull_request", "issues", "ping", "cache_invalidated", "connected"];
    const listeners = events.map((evt) => {
      const fn = (e: MessageEvent) => {
        try { handler(evt, JSON.parse(e.data as string)); } catch {}
      };
      es.addEventListener(evt, fn);
      return { evt, fn };
    });
    return () => {
      listeners.forEach(({ evt, fn }) => es.removeEventListener(evt, fn));
      es.close();
    };
  }, [handler]);
}

export function invalidateOnPush(owner: string, repo: string) {
  queryClient.invalidateQueries({ queryKey: ["commits", owner, repo] });
  queryClient.invalidateQueries({ queryKey: ["branches", owner, repo] });
  queryClient.invalidateQueries({ queryKey: ["tree", owner, repo] });
}
