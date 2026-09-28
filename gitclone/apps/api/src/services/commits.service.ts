import { getGithubClient } from "../github/client.js";
import { mapGithubError } from "../github/errors.js";
import { retryIdempotent } from "../github/retry.js";

export async function listCommits(userId: string, owner: string, repo: string, ref?: string, page = 1) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.repos.listCommits({ owner, repo, sha: ref, per_page: 30, page })
    );
    return data.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      authorName: c.commit.author?.name ?? "",
      authorEmail: c.commit.author?.email ?? "",
      authorDate: c.commit.author?.date ?? "",
      committerName: c.commit.committer?.name ?? "",
      committerDate: c.commit.committer?.date ?? "",
      htmlUrl: c.html_url,
      parents: c.parents.map((p) => p.sha),
    }));
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function getCommitDiff(userId: string, owner: string, repo: string, sha: string) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.repos.getCommit({ owner, repo, ref: sha })
    );
    return {
      sha: data.sha,
      files: (data.files ?? []).map((f) => ({
        filename: f.filename ?? "",
        status: f.status ?? "",
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
      })),
      stats: {
        additions: data.stats?.additions ?? 0,
        deletions: data.stats?.deletions ?? 0,
        total: data.stats?.total ?? 0,
      },
    };
  } catch (err) {
    throw mapGithubError(err);
  }
}
