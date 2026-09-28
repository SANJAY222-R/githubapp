import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/requireAuth.js";
import { getTree, getFile, putFile, deleteFile } from "../services/files.service.js";
import { deleteFolder } from "../services/folder-delete.service.js";
import { PutFileSchema, DeleteFileSchema, DeleteFolderSchema } from "@gitclone/shared";
import { writeAudit } from "../services/audit.service.js";

const app = new Hono();

app.get("/:owner/:repo/tree", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  const ref = c.req.query("ref") ?? "HEAD";
  return c.json(await getTree(user.id, owner, repo, ref));
});

app.get("/:owner/:repo/file", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  const path = c.req.query("path") ?? "";
  const ref = c.req.query("ref");
  return c.json(await getFile(user.id, owner, repo, path, ref));
});

app.put("/:owner/:repo/file", requireAuth, zValidator("json", PutFileSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  const body = c.req.valid("json");
  try {
    const result = await putFile(user.id, owner, repo, body);
    await writeAudit(user.id, "file.put", `${owner}/${repo}/${body.path}`, "success");
    return c.json(result);
  } catch (err) {
    await writeAudit(user.id, "file.put", `${owner}/${repo}/${body.path}`, "failure");
    throw err;
  }
});

app.delete("/:owner/:repo/file", requireAuth, zValidator("json", DeleteFileSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  const body = c.req.valid("json");
  try {
    await deleteFile(user.id, owner, repo, body);
    await writeAudit(user.id, "file.delete", `${owner}/${repo}/${body.path}`, "success");
    return c.body(null, 204);
  } catch (err) {
    await writeAudit(user.id, "file.delete", `${owner}/${repo}/${body.path}`, "failure");
    throw err;
  }
});

app.delete("/:owner/:repo/folder", requireAuth, zValidator("json", DeleteFolderSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  const body = c.req.valid("json");
  try {
    const result = await deleteFolder(user.id, owner, repo, body);
    await writeAudit(user.id, "folder.delete", `${owner}/${repo}/${body.path}`, "success", { filesRemoved: result.filesRemoved });
    return c.json(result);
  } catch (err) {
    await writeAudit(user.id, "folder.delete", `${owner}/${repo}/${body.path}`, "failure");
    throw err;
  }
});

export default app;
