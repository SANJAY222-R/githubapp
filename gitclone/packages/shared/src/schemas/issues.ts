import { z } from "zod";

export const IssueSchema = z
  .object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.enum(["open", "closed"]),
    createdAt: z.string(),
    updatedAt: z.string(),
    closedAt: z.string().nullable(),
    htmlUrl: z.string(),
    user: z.object({ login: z.string(), avatarUrl: z.string() }).strict(),
    labels: z.array(z.object({ name: z.string(), color: z.string() }).strict()),
    assignees: z.array(z.object({ login: z.string(), avatarUrl: z.string() }).strict()),
    comments: z.number(),
    locked: z.boolean(),
  })
  .strict();

export const CreateIssueSchema = z
  .object({
    title: z.string().min(1).max(1000),
    body: z.string().max(65536).optional(),
    labels: z.array(z.string().min(1).max(100)).max(50).optional(),
    assignees: z.array(z.string().min(1).max(100)).max(20).optional(),
  })
  .strict();

export type Issue = z.infer<typeof IssueSchema>;
