export type RealtimePayload =
  | { type: "push"; owner: string; repo: string; ref: string; commits: number }
  | { type: "pull_request"; action: string; owner: string; repo: string; number: number }
  | { type: "issues"; action: string; owner: string; repo: string; number: number }
  | { type: "ping"; zen: string }
  | { type: "cache_invalidated"; key: string };
