import { z } from "zod";
import { GitRefSchema } from "./files.js";

export const PullSchema = z
  .object({
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
    user: z.object({ login: z.string(), avatarUrl: z.string() }).strict(),
    head: z.object({ label: z.string(), ref: z.string(), sha: z.string() }).strict(),
    base: z.object({ label: z.string(), ref: z.string(), sha: z.string() }).strict(),
    mergeable: z.boolean().nullable(),
    comments: z.number(),
    reviewComments: z.number(),
    commits: z.number(),
    additions: z.number(),
    deletions: z.number(),
    changedFiles: z.number(),
  })
  .strict();

export const CreatePullSchema = z
  .object({
    title: z.string().min(1).max(1000),
    body: z.string().max(65536).optional(),
    head: GitRefSchema,
    base: GitRefSchema,
    draft: z.boolean().optional(),
  })
  .strict();

export const MergePullSchema = z
  .object({
    mergeMethod: z.enum(["merge", "squash", "rebase"]).default("merge"),
    commitTitle: z.string().max(1000).optional(),
    commitMessage: z.string().max(65536).optional(),
  })
  .strict();

export type Pull = z.infer<typeof PullSchema>;
