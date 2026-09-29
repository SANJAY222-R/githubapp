import { describe, it, expect } from "vitest";
import { FEATURE_PERMISSION_MAP } from "../../github/permissions.js";
import { PERMISSIONS, FEATURE_PERMISSION_MAP as SHARED_MAP } from "@gitclone/shared";

describe("permissions matrix", () => {
  it("maps delete-repo to Administration: read & write", () => {
    expect(FEATURE_PERMISSION_MAP["delete-repo"]).toBe("Administration: read & write");
    expect(PERMISSIONS.deleteRepo).toBe("Administration: read & write");
    expect(SHARED_MAP["delete-repo"]).toContain("deleteRepo");
  });

  it("maps files and repos to required scopes", () => {
    expect(FEATURE_PERMISSION_MAP["read-repos"]).toBe("Contents: read");
    expect(FEATURE_PERMISSION_MAP["edit-files"]).toBe("Contents: read & write");
    expect(FEATURE_PERMISSION_MAP["pull-requests"]).toBe("Pull requests: read & write");
    expect(FEATURE_PERMISSION_MAP["issues"]).toBe("Issues: read & write");
  });
});
