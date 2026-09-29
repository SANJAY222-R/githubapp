import { getGithubClient } from "../github/client.js";
import { mapGithubError } from "../github/errors.js";
import { retryIdempotent } from "../github/retry.js";

export async function listRepos(userId: string, page = 1) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.repos.listForAuthenticatedUser({
        per_page: 30,
        page,
        sort: "updated",
      })
    );
    return data.map(mapRepo);
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function getRepo(userId: string, owner: string, repo: string) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.repos.get({ owner, repo })
    );
    return mapRepo(data);
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function createRepo(
  userId: string,
  payload: { name: string; description?: string; private?: boolean; autoInit?: boolean }
) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: payload.name,
      description: payload.description,
      private: payload.private,
      auto_init: payload.autoInit,
    });
    return mapRepo(data);
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function deleteRepo(userId: string, owner: string, repo: string) {
  const octokit = await getGithubClient(userId);
  try {
    await octokit.repos.delete({ owner, repo });
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function patchRepo(
  userId: string,
  owner: string,
  repo: string,
  patch: { archived?: boolean; private?: boolean; description?: string; name?: string }
) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await octokit.repos.update({ owner, repo, ...patch });
    return mapRepo(data);
  } catch (err) {
    throw mapGithubError(err);
  }
}

function mapRepo(data: Record<string, unknown>) {
  return {
    id: data["id"] as number,
    name: data["name"] as string,
    fullName: data["full_name"] as string,
    description: data["description"] as string | null,
    private: data["private"] as boolean,
    fork: data["fork"] as boolean,
    archived: data["archived"] as boolean,
    stargazersCount: data["stargazers_count"] as number,
    forksCount: data["forks_count"] as number,
    language: data["language"] as string | null,
    defaultBranch: data["default_branch"] as string,
    updatedAt: data["updated_at"] as string,
    htmlUrl: data["html_url"] as string,
    cloneUrl: data["clone_url"] as string,
    ownerLogin: (data["owner"] as { login: string }).login,
    ownerAvatarUrl: (data["owner"] as { avatar_url: string }).avatar_url,
  };
}
