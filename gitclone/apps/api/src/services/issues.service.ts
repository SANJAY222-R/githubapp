import { getGithubClient } from "../github/client.js";
import { mapGithubError } from "../github/errors.js";
import { retryIdempotent } from "../github/retry.js";

export async function listIssues(userId: string, owner: string, repo: string, state: "open" | "closed" | "all" = "open", page = 1) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.issues.listForRepo({ owner, repo, state, per_page: 30, page })
    );
    return data.filter((i) => !i.pull_request).map(mapIssue);
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function getIssue(userId: string, owner: string, repo: string, issueNumber: number) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.issues.get({ owner, repo, issue_number: issueNumber })
    );
    return mapIssue(data);
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function createIssue(
  userId: string, owner: string, repo: string,
  payload: { title: string; body?: string; labels?: string[]; assignees?: string[] }
) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await octokit.issues.create({
      owner, repo, title: payload.title, body: payload.body,
      labels: payload.labels, assignees: payload.assignees,
    });
    return mapIssue(data);
  } catch (err) {
    throw mapGithubError(err);
  }
}

function mapIssue(data: Record<string, unknown>) {
  const user = data["user"] as { login: string; avatar_url: string } | null;
  const labels = (data["labels"] as Array<{ name: string; color: string }> | undefined) ?? [];
  const assignees = (data["assignees"] as Array<{ login: string; avatar_url: string }> | undefined) ?? [];
  return {
    number: data["number"] as number,
    title: data["title"] as string,
    body: data["body"] as string | null,
    state: data["state"] as "open" | "closed",
    createdAt: data["created_at"] as string,
    updatedAt: data["updated_at"] as string,
    closedAt: data["closed_at"] as string | null,
    htmlUrl: data["html_url"] as string,
    user: { login: user?.login ?? "", avatarUrl: user?.avatar_url ?? "" },
    labels: labels.map((l) => ({ name: l.name, color: l.color })),
    assignees: assignees.map((a) => ({ login: a.login, avatarUrl: a.avatar_url })),
    comments: data["comments"] as number,
    locked: data["locked"] as boolean,
  };
}
