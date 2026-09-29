import { z } from "zod";

export const RepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  private: z.boolean(),
  fork: z.boolean(),
  archived: z.boolean(),
  stargazersCount: z.number(),
  forksCount: z.number(),
  language: z.string().nullable(),
  defaultBranch: z.string(),
  updatedAt: z.string(),
  htmlUrl: z.string(),
  cloneUrl: z.string(),
  ownerLogin: z.string(),
  ownerAvatarUrl: z.string(),
});

export const CreateRepoSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  private: z.boolean().default(false),
  autoInit: z.boolean().default(true),
});

export const DeleteRepoSchema = z.object({
  confirmationToken: z.string().min(1),
});

export const PatchRepoSchema = z.object({
  archived: z.boolean().optional(),
  private: z.boolean().optional(),
  description: z.string().optional(),
  name: z.string().optional(),
});

export type Repo = z.infer<typeof RepoSchema>;
export type CreateRepo = z.infer<typeof CreateRepoSchema>;
