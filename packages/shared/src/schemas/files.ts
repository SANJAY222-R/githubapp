import { z } from "zod";

export const TreeItemSchema = z.object({
  path: z.string(),
  mode: z.string(),
  type: z.enum(["blob", "tree", "commit"]),
  sha: z.string(),
  size: z.number().optional(),
  url: z.string(),
});

export const FileContentSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number(),
  content: z.string(),
  encoding: z.string(),
  downloadUrl: z.string().nullable(),
});

export const PutFileSchema = z.object({
  path: z.string(),
  message: z.string().min(1),
  content: z.string(),
  sha: z.string().optional(),
  branch: z.string().optional(),
});

export const DeleteFileSchema = z.object({
  path: z.string(),
  message: z.string().min(1),
  sha: z.string(),
  branch: z.string().optional(),
});

export const DeleteFolderSchema = z.object({
  path: z.string(),
  message: z.string().min(1),
  branch: z.string().optional(),
});

export type TreeItem = z.infer<typeof TreeItemSchema>;
export type FileContent = z.infer<typeof FileContentSchema>;
