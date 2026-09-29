import { z } from "zod";

export const IssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(["open", "closed"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().nullable(),
  htmlUrl: z.string(),
  user: z.object({ login: z.string(), avatarUrl: z.string() }),
  labels: z.array(z.object({ name: z.string(), color: z.string() })),
  assignees: z.array(z.object({ login: z.string(), avatarUrl: z.string() })),
  comments: z.number(),
  locked: z.boolean(),
});

export const CreateIssueSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
});

export type Issue = z.infer<typeof IssueSchema>;
