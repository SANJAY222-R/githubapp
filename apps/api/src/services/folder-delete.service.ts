import { getGithubClient } from "../github/client.js";
import { mapGithubError } from "../github/errors.js";

export async function deleteFolder(
  userId: string,
  owner: string,
  repo: string,
  payload: { path: string; message: string; branch?: string }
) {
  const octokit = await getGithubClient(userId);
  try {
    const branch = payload.branch ?? (await octokit.repos.get({ owner, repo })).data.default_branch;

    // Get current branch ref
    const refData = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const currentSha = refData.data.object.sha;

    // Get recursive tree
    const treeData = await octokit.git.getTree({ owner, repo, tree_sha: currentSha, recursive: "1" });

    const folderPrefix = payload.path.endsWith("/") ? payload.path : `${payload.path}/`;
    const toDelete = treeData.data.tree.filter(
      (item) => item.path?.startsWith(folderPrefix) && item.type === "blob"
    );

    if (toDelete.length === 0) throw new Error("Folder not found or already empty");

    // Create new tree with nulled-out blobs
    const newTreeData = await octokit.git.createTree({
      owner, repo,
      base_tree: currentSha,
      tree: toDelete.map((item) => ({
        path: item.path!,
        mode: "100644" as const,
        type: "blob" as const,
        sha: null,
      })),
    });

    // Create commit
    const commitData = await octokit.git.createCommit({
      owner, repo,
      message: payload.message,
      tree: newTreeData.data.sha,
      parents: [currentSha],
    });

    // Update ref
    await octokit.git.updateRef({
      owner, repo,
      ref: `heads/${branch}`,
      sha: commitData.data.sha,
    });

    return { commit: commitData.data.sha, filesRemoved: toDelete.length };
  } catch (err) {
    throw mapGithubError(err);
  }
}
