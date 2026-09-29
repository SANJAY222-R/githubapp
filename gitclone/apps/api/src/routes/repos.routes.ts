import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/requireAuth.js";
import { listRepos, getRepo, createRepo, deleteRepo, patchRepo } from "../services/repos.service.js";
import { CreateRepoSchema, DeleteRepoSchema, PatchRepoSchema } from "@gitclone/shared";
import { writeAudit } from "../services/audit.service.js";
import { assertOwnerRepo, validatePagination } from "../security/validators.js";
import { destructiveRateLimit } from "../middleware/destructiveRateLimit.js";
import { verifyAndConsumeConfirmToken } from "../services/auth/confirm.service.js";

const app = new Hono();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const { page } = validatePagination(c.req.query("page"));
  const repos = await listRepos(user.id, page);
  return c.json(repos);
});

app.post("/", requireAuth, zValidator("json", CreateRepoSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  try {
    const repo = await createRepo(user.id, body);
    await writeAudit(user.id, "repo.create", repo.fullName, "success");
    return c.json(repo, 201);
  } catch (err) {
    await writeAudit(user.id, "repo.create", body.name, "failure");
    throw err;
  }
});

app.get("/:owner/:repo", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  assertOwnerRepo(owner, repo);
  return c.json(await getRepo(user.id, owner, repo));
});

app.delete("/:owner/:repo", destructiveRateLimit, requireAuth, zValidator("json", DeleteRepoSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  assertOwnerRepo(owner, repo);
  const { confirmationToken } = c.req.valid("json");

  let confirmationTokenId: string | undefined;
  if (confirmationToken !== `${owner}/${repo}`) {
    const res = await verifyAndConsumeConfirmToken(user.id, "delete_repo", `${owner}/${repo}`, confirmationToken);
    confirmationTokenId = res.id;
  }

  try {
    await deleteRepo(user.id, owner, repo);
    await writeAudit(user.id, "repo.delete", `${owner}/${repo}`, "success", {
      confirmationTokenId,
    });
    return c.body(null, 204);
  } catch (err) {
    await writeAudit(user.id, "repo.delete", `${owner}/${repo}`, "failure", {
      confirmationTokenId,
    });
    throw err;
  }
});

app.patch("/:owner/:repo", requireAuth, zValidator("json", PatchRepoSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  assertOwnerRepo(owner, repo);
  const patch = c.req.valid("json");
  const updated = await patchRepo(user.id, owner, repo, patch);
  await writeAudit(user.id, "repo.patch", `${owner}/${repo}`, "success", patch as Record<string, unknown>);
  return c.json(updated);
});

export default app;
