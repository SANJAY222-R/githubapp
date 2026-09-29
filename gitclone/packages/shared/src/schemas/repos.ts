import { z } from "zod";

export const OwnerNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_.-]+$/, "Invalid repository owner")
  .refine((val) => val !== "." && val !== "..", "Invalid repository owner");

export const RepoNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_.-]+$/, "Invalid repository name")
  .refine((val) => val !== "." && val !== "..", "Invalid repository name");

export const RepoSchema = z
  .object({
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
  })
  .strict();

export const CreateRepoSchema = z
  .object({
    name: RepoNameSchema,
    description: z.string().max(2000).optional(),
    private: z.boolean().default(false),
    autoInit: z.boolean().default(true),
  })
  .strict();

export const DeleteRepoSchema = z
  .object({
    confirmationToken: z.string().min(1).max(500),
  })
  .strict();

export const PatchRepoSchema = z
  .object({
    archived: z.boolean().optional(),
    private: z.boolean().optional(),
    description: z.string().max(2000).optional(),
    name: RepoNameSchema.optional(),
  })
  .strict();

export type Repo = z.infer<typeof RepoSchema>;
export type CreateRepo = z.infer<typeof CreateRepoSchema>;
