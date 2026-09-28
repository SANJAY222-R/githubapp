import { getGithubClient } from "../github/client.js";
import { mapGithubError } from "../github/errors.js";
import { retryIdempotent } from "../github/retry.js";

export async function listBranches(userId: string, owner: string, repo: string) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.repos.listBranches({ owner, repo, per_page: 100 })
    );
    return data.map((b) => ({ name: b.name, sha: b.commit.sha, protected: b.protected }));
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function createBranch(userId: string, owner: string, repo: string, name: string, from?: string, fromSha?: string) {
  const octokit = await getGithubClient(userId);
  try {
    let targetSha = fromSha;
    if (!targetSha && from) {
      if (/^[0-9a-f]{40}$/i.test(from)) {
        targetSha = from;
      } else {
        const branchRes = await octokit.repos.getBranch({ owner, repo, branch: from });
        targetSha = branchRes.data.commit.sha;
      }
    }
    if (!targetSha) {
      const repoRes = await octokit.repos.get({ owner, repo });
      const defaultBranch = repoRes.data.default_branch;
      const branchRes = await octokit.repos.getBranch({ owner, repo, branch: defaultBranch });
      targetSha = branchRes.data.commit.sha;
    }
    const { data } = await octokit.git.createRef({
      owner, repo, ref: `refs/heads/${name}`, sha: targetSha,
    });
    return { ref: data.ref, sha: data.object.sha };
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function deleteBranch(userId: string, owner: string, repo: string, name: string) {
  const octokit = await getGithubClient(userId);
  try {
    await octokit.git.deleteRef({ owner, repo, ref: `heads/${name}` });
  } catch (err) {
    throw mapGithubError(err);
  }
}
