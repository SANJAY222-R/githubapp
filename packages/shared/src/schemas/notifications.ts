import { z } from "zod";

export const NotificationSchema = z.object({
  id: z.string(),
  reason: z.string(),
  unread: z.boolean(),
  updatedAt: z.string(),
  lastReadAt: z.string().nullable(),
  subject: z.object({
    title: z.string(),
    type: z.string(),
    url: z.string().nullable(),
  }),
  repository: z.object({
    fullName: z.string(),
    htmlUrl: z.string(),
  }),
});

export type Notification = z.infer<typeof NotificationSchema>;
