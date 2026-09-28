import type { RequestError } from "@octokit/request-error";

export class GithubError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "GithubError";
  }
}

export class AuthExpiredError extends GithubError {
  constructor() { super(401, "GitHub authentication expired"); }
}

export class MissingPermissionError extends GithubError {
  constructor(public readonly permission: string) {
    super(403, `Missing permission: ${permission}`);
  }
}

export class NotFoundError extends GithubError {
  constructor(resource: string) { super(404, `Not found: ${resource}`); }
}

export class ConflictError extends GithubError {
  constructor(message: string) { super(409, message); }
}

export class RateLimitedError extends GithubError {
  constructor(public readonly retryAfter: number) {
    super(429, `Rate limited, retry after ${retryAfter}s`);
  }
}

export function mapGithubError(err: unknown): GithubError {
  const e = err as RequestError;
  if (!e.status) throw err;
  switch (e.status) {
    case 401: return new AuthExpiredError();
    case 403: return new MissingPermissionError(e.message);
    case 404: return new NotFoundError(e.message);
    case 409: return new ConflictError(e.message);
    case 422: return new GithubError(422, e.message, "unprocessable");
    default:
      if (e.status >= 500) return new GithubError(e.status, "GitHub API unavailable");
      return new GithubError(e.status, e.message);
  }
}
