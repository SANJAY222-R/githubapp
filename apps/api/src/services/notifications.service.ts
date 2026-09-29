import { getGithubClient } from "../github/client.js";
import { mapGithubError } from "../github/errors.js";
import { retryIdempotent } from "../github/retry.js";

export async function listNotifications(userId: string, page = 1) {
  const octokit = await getGithubClient(userId);
  try {
    const { data } = await retryIdempotent(() =>
      octokit.activity.listNotificationsForAuthenticatedUser({ per_page: 30, page })
    );
    return data.map((n) => ({
      id: n.id,
      reason: n.reason,
      unread: n.unread,
      updatedAt: n.updated_at,
      lastReadAt: n.last_read_at ?? null,
      subject: {
        title: n.subject.title,
        type: n.subject.type,
        url: n.subject.url ?? null,
      },
      repository: {
        fullName: n.repository.full_name,
        htmlUrl: n.repository.html_url,
      },
    }));
  } catch (err) {
    throw mapGithubError(err);
  }
}
