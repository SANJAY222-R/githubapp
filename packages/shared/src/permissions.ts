export const PERMISSIONS = {
  readRepos: "Contents: read",
  writeContents: "Contents: read & write",
  pullRequests: "Pull requests: read & write",
  issues: "Issues: read & write",
  notifications: "notifications (account-level)",
  deleteRepo: "Administration: read & write",
  workflows: "Actions / Workflows: write",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const FEATURE_PERMISSION_MAP: Record<string, PermissionKey[]> = {
  "read-repos": ["readRepos"],
  "edit-files": ["writeContents"],
  "delete-files": ["writeContents"],
  "pull-requests": ["pullRequests"],
  issues: ["issues"],
  notifications: ["notifications"],
  "delete-repo": ["deleteRepo"],
};
