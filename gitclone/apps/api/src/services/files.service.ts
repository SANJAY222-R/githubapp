import { getGithubClient } from "../github/client.js";
import { mapGithubError } from "../github/errors.js";
import { retryIdempotent } from "../github/retry.js";

export async function getTree(userId: string, owner: string, repo: string, ref: string) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.git.getTree({ owner, repo, tree_sha: ref, recursive: "1" })
    );
    return data.tree;
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function getFile(userId: string, owner: string, repo: string, path: string, ref?: string) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.repos.getContent({ owner, repo, path, ref })
    );
    if (Array.isArray(data)) {
      return {
        type: "dir" as const,
        name: path.split("/").pop() || "",
        path,
        entries: data.map((item) => ({
          name: item.name,
          path: item.path,
          sha: item.sha,
          size: item.size,
          type: item.type === "dir" ? ("tree" as const) : ("blob" as const),
          downloadUrl: item.download_url,
        })),
      };
    }
    const file = data as {
      name: string; path: string; sha: string; size: number;
      content?: string; encoding?: string; download_url: string | null;
      type: string;
    };
    return {
      type: "file" as const,
      name: file.name, path: file.path, sha: file.sha, size: file.size,
      content: file.content ?? "", encoding: file.encoding ?? "utf-8", downloadUrl: file.download_url,
    };
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function putFile(
  userId: string, owner: string, repo: string,
  payload: { path: string; message: string; content: string; sha?: string; branch?: string }
) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner, repo, path: payload.path, message: payload.message,
      content: Buffer.from(payload.content).toString("base64"),
      sha: payload.sha, branch: payload.branch,
    });
    return { commit: data.commit?.sha, content: data.content };
  } catch (err) {
    throw mapGithubError(err);
  }
}

export async function deleteFile(
  userId: string, owner: string, repo: string,
  payload: { path: string; message: string; sha: string; branch?: string }
) {
  const octokit = await getGithubClient(userId);
  try {
    await octokit.repos.deleteFile({
      owner, repo, path: payload.path, message: payload.message,
      sha: payload.sha, branch: payload.branch,
    });
  } catch (err) {
    throw mapGithubError(err);
  }
}
