import { describe, it, expect } from "vitest";
import {
  mapGithubError,
  AuthExpiredError,
  MissingPermissionError,
  NotFoundError,
  ConflictError,
  RateLimitedError,
  GithubError,
} from "../../github/errors.js";

describe("mapGithubError", () => {
  it("maps 401 to AuthExpiredError", () => {
    const err = { status: 401, message: "Bad credentials" };
    const mapped = mapGithubError(err);
    expect(mapped).toBeInstanceOf(AuthExpiredError);
    expect(mapped.status).toBe(401);
  });

  it("maps 403 to MissingPermissionError", () => {
    const err = { status: 403, message: "Resource not accessible by integration" };
    const mapped = mapGithubError(err);
    expect(mapped).toBeInstanceOf(MissingPermissionError);
    expect(mapped.status).toBe(403);
  });

  it("maps 404 to NotFoundError", () => {
    const err = { status: 404, message: "Not Found" };
    const mapped = mapGithubError(err);
    expect(mapped).toBeInstanceOf(NotFoundError);
    expect(mapped.status).toBe(404);
  });

  it("maps 409 to ConflictError", () => {
    const err = { status: 409, message: "Merge conflict" };
    const mapped = mapGithubError(err);
    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped.status).toBe(409);
  });

  it("maps 422 to unprocessable GithubError", () => {
    const err = { status: 422, message: "Validation Failed" };
    const mapped = mapGithubError(err);
    expect(mapped).toBeInstanceOf(GithubError);
    expect(mapped.status).toBe(422);
    expect(mapped.code).toBe("unprocessable");
  });

  it("maps 5xx to server unavailable GithubError", () => {
    const err = { status: 503, message: "Service Unavailable" };
    const mapped = mapGithubError(err);
    expect(mapped).toBeInstanceOf(GithubError);
    expect(mapped.status).toBe(503);
  });
});
