import { getGithubClient } from "../github/client.js";
import { mapGithubError } from "../github/errors.js";
import { retryIdempotent } from "../github/retry.js";

export async function listPulls(userId: string, owner: string, repo: string, state: "open" | "closed" | "all" = "open", page = 1) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.pulls.list({ owner, repo, state, per_page: 30, page })
    );
    return data.map(mapPull);
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function getPull(userId: string, owner: string, repo: string, pullNumber: number) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.pulls.get({ owner, repo, pull_number: pullNumber })
    );
    return mapPull(data);
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function createPull(
  userId: string, owner: string, repo: string,
  payload: { title: string; body?: string; head: string; base: string; draft?: boolean }
) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await octokit.pulls.create({
      owner, repo, title: payload.title, body: payload.body,
      head: payload.head, base: payload.base, draft: payload.draft,
    });
    return mapPull(data);
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function mergePull(
  userId: string, owner: string, repo: string, pullNumber: number,
  payload: { mergeMethod: "merge" | "squash" | "rebase"; commitTitle?: string; commitMessage?: string }
) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await octokit.pulls.merge({
      owner, repo, pull_number: pullNumber,
      merge_method: payload.mergeMethod,
      commit_title: payload.commitTitle,
      commit_message: payload.commitMessage,
    });
    return { merged: data.merged, sha: data.sha, message: data.message };
  } catch (err) {
    throw mapGithubError(err);
  }
}

function mapPull(data: Record<string, unknown>) {
  const user = data["user"] as { login: string; avatar_url: string } | null;
  const head = data["head"] as { label: string; ref: string; sha: string };
  const base = data["base"] as { label: string; ref: string; sha: string };
  return {
    number: data["number"] as number,
    title: data["title"] as string,
    body: data["body"] as string | null,
    state: data["state"] as "open" | "closed",
    draft: data["draft"] as boolean,
    merged: data["merged"] as boolean,
    mergedAt: data["merged_at"] as string | null,
    createdAt: data["created_at"] as string,
    updatedAt: data["updated_at"] as string,
    htmlUrl: data["html_url"] as string,
    user: { login: user?.login ?? "", avatarUrl: user?.avatar_url ?? "" },
    head: { label: head.label, ref: head.ref, sha: head.sha },
    base: { label: base.label, ref: base.ref, sha: base.sha },
    mergeable: data["mergeable"] as boolean | null,
    comments: data["comments"] as number,
    reviewComments: data["review_comments"] as number,
    commits: data["commits"] as number,
    additions: data["additions"] as number,
    deletions: data["deletions"] as number,
    changedFiles: data["changed_files"] as number,
  };
}
