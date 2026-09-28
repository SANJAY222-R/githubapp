import { describe, it, expect } from "vitest";
import {
  ConnectPatSchema,
  CreateRepoSchema,
  DeleteRepoSchema,
  PatchRepoSchema,
  PutFileSchema,
  DeleteFileSchema,
  DeleteFolderSchema,
  CreatePullSchema,
  MergePullSchema,
  CreateIssueSchema,
} from "@gitclone/shared";

describe("shared zod schemas", () => {
  it("validates PAT connection schema", () => {
    expect(ConnectPatSchema.safeParse({ token: "ghp_12345" }).success).toBe(true);
    expect(ConnectPatSchema.safeParse({ token: "" }).success).toBe(false);
  });

  it("validates repo schemas", () => {
    expect(CreateRepoSchema.safeParse({ name: "my-repo", private: true }).success).toBe(true);
    expect(CreateRepoSchema.safeParse({ name: "" }).success).toBe(false);
    expect(DeleteRepoSchema.safeParse({ confirmationToken: "owner/repo" }).success).toBe(true);
    expect(DeleteRepoSchema.safeParse({ confirmationToken: "" }).success).toBe(false);
    expect(PatchRepoSchema.safeParse({ private: false, archived: true }).success).toBe(true);
  });

  it("validates file and folder schemas", () => {
    expect(
      PutFileSchema.safeParse({
        path: "README.md",
        content: "hello",
        message: "add readme",
      }).success
    ).toBe(true);

    expect(
      DeleteFileSchema.safeParse({
        path: "README.md",
        sha: "abc1234",
        message: "delete readme",
      }).success
    ).toBe(true);

    expect(
      DeleteFolderSchema.safeParse({
        path: "src/old-dir",
        message: "remove folder",
      }).success
    ).toBe(true);
  });

  it("validates PR and Issue schemas", () => {
    expect(
      CreatePullSchema.safeParse({
        title: "feat: add stuff",
        head: "feature-branch",
        base: "main",
      }).success
    ).toBe(true);

    expect(
      MergePullSchema.safeParse({
        mergeMethod: "squash",
      }).success
    ).toBe(true);

    expect(
      CreateIssueSchema.safeParse({
        title: "bug: broken button",
        body: "description",
      }).success
    ).toBe(true);
  });
});
