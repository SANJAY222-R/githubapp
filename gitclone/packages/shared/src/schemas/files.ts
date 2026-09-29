import { z } from "zod";

export const FilePathSchema = z
  .string()
  .min(1)
  .max(1000)
  .refine((p) => !p.includes("\0") && !p.includes("%00"), "Null bytes are not allowed in file paths")
  .refine((p) => !p.includes("\\"), "Backslashes are not allowed in file paths")
  .refine((p) => !p.startsWith("/"), "Leading slashes are not allowed in relative file paths")
  .refine((p) => {
    const parts = p.split("/");
    return parts.every((part) => part !== "." && part !== ".." && part.length > 0);
  }, "Path traversal segments ('.' or '..') and empty segments ('//') are not allowed");

export const GitRefSchema = z
  .string()
  .min(1)
  .max(255)
  .refine((r) => !r.startsWith("/") && !r.endsWith("/") && !r.includes("//"), "Invalid slash placement in git ref")
  .refine((r) => !r.includes("..") && !r.includes("@{"), "Invalid characters '..' or '@{' in git ref")
  .refine((r) => !r.endsWith(".lock") && !r.endsWith("."), "Git ref cannot end with '.lock' or '.'")
  .refine((r) => r !== "@", "Git ref cannot be '@'")
  .refine((r) => !/[\x00-\x20\x7F~^:?*\[\\]/.test(r), "Git ref contains invalid characters");

export const TreeItemSchema = z
  .object({
    path: z.string(),
    mode: z.string(),
    type: z.enum(["blob", "tree", "commit"]),
    sha: z.string(),
    size: z.number().optional(),
    url: z.string(),
  })
  .strict();

export const FileContentSchema = z
  .object({
    name: z.string(),
    path: z.string(),
    sha: z.string(),
    size: z.number(),
    content: z.string(),
    encoding: z.string(),
    downloadUrl: z.string().nullable(),
  })
  .strict();

export const PutFileSchema = z
  .object({
    path: FilePathSchema,
    message: z.string().min(1).max(65536),
    content: z.string().max(5 * 1024 * 1024), // Max 5MB
    sha: z.string().optional(),
    branch: GitRefSchema.optional(),
  })
  .strict();

export const DeleteFileSchema = z
  .object({
    path: FilePathSchema,
    message: z.string().min(1).max(65536),
    sha: z.string().min(1),
    branch: GitRefSchema.optional(),
  })
  .strict();

export const DeleteFolderSchema = z
  .object({
    path: FilePathSchema,
    message: z.string().min(1).max(65536),
    branch: GitRefSchema.optional(),
  })
  .strict();

export type TreeItem = z.infer<typeof TreeItemSchema>;
export type FileContent = z.infer<typeof FileContentSchema>;
