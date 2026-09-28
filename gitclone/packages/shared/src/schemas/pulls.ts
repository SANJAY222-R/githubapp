import { z } from "zod";

export const PullSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(["open", "closed"]),
  draft: z.boolean(),
  merged: z.boolean(),
  mergedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  htmlUrl: z.string(),
  user: z.object({ login: z.string(), avatarUrl: z.string() }),
  head: z.object({ label: z.string(), ref: z.string(), sha: z.string() }),
  base: z.object({ label: z.string(), ref: z.string(), sha: z.string() }),
  mergeable: z.boolean().nullable(),
  comments: z.number(),
  reviewComments: z.number(),
  commits: z.number(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
});

export const CreatePullSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  head: z.string(),
  base: z.string(),
  draft: z.boolean().optional(),
});

export const MergePullSchema = z.object({
  mergeMethod: z.enum(["merge", "squash", "rebase"]).default("merge"),
  commitTitle: z.string().optional(),
  commitMessage: z.string().optional(),
});

export type Pull = z.infer<typeof PullSchema>;
