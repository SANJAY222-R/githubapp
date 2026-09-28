import { z } from "zod";

export const ConnectPatSchema = z.object({
  token: z.string().min(1),
});

export const OAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

export const SessionUserSchema = z.object({
  id: z.string(),
  githubId: z.number(),
  login: z.string(),
  avatarUrl: z.string(),
  name: z.string().nullable(),
  authType: z.enum(["oauth", "pat"]),
});

export type SessionUser = z.infer<typeof SessionUserSchema>;
