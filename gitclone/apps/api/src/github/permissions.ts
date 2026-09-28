export const FEATURE_PERMISSION_MAP: Record<string, string> = {
  "read-repos": "Contents: read",
  "edit-files": "Contents: read & write",
  "delete-files": "Contents: read & write",
  "pull-requests": "Pull requests: read & write",
  issues: "Issues: read & write",
  notifications: "notifications",
  "delete-repo": "Administration: read & write",
  workflows: "Actions / Workflows: write",
};
