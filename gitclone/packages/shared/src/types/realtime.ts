export type RealtimeEventType =
  | "repo.updated"
  | "repo.deleted"
  | "pr.opened"
  | "pr.closed"
  | "pr.merged"
  | "issue.opened"
  | "issue.closed"
  | "push"
  | "notification.new";

export type RealtimeEvent = {
  type: RealtimeEventType;
  payload: Record<string, unknown>;
  timestamp: string;
};
