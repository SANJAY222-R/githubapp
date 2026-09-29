import { describe, it, expect } from "vitest";
import {
  validateFilePath,
  validateGitRef,
  assertOwnerRepo,
  isValidOwner,
  isValidRepo,
  validatePagination,
  sanitizeText,
} from "../../security/validators.js";
import { ValidationError } from "../../errors.js";

describe("Security Validators", () => {
  describe("validateFilePath (Path Traversal & Injection Defense)", () => {
    it("accepts valid relative file paths", () => {
      expect(validateFilePath("README.md")).toBe("README.md");
      expect(validateFilePath("src/index.ts")).toBe("src/index.ts");
      expect(validateFilePath("deep/nested/dir/structure/file.txt")).toBe("deep/nested/dir/structure/file.txt");
    });

    it("allows empty path when allowEmpty is true", () => {
      expect(validateFilePath("", { allowEmpty: true })).toBe("");
    });

    it("rejects empty path when allowEmpty is false", () => {
      expect(() => validateFilePath("")).toThrow(ValidationError);
    });

    it("rejects path traversal with parent directories ('..')", () => {
      expect(() => validateFilePath("../secret.txt")).toThrow(ValidationError);
      expect(() => validateFilePath("src/../../etc/passwd")).toThrow(ValidationError);
      expect(() => validateFilePath("dir/..")).toThrow(ValidationError);
      expect(() => validateFilePath("..")).toThrow(ValidationError);
    });

    it("rejects single dot traversal segments ('.')", () => {
      expect(() => validateFilePath("src/./index.ts")).toThrow(ValidationError);
      expect(() => validateFilePath(".")).toThrow(ValidationError);
    });

    it("rejects null bytes and encoded null bytes", () => {
      expect(() => validateFilePath("file.txt\0.js")).toThrow(ValidationError);
      expect(() => validateFilePath("secret%00.txt")).toThrow(ValidationError);
    });

    it("rejects backslashes", () => {
      expect(() => validateFilePath("src\\index.ts")).toThrow(ValidationError);
      expect(() => validateFilePath("..\\..\\windows\\system32")).toThrow(ValidationError);
    });

    it("rejects double slashes / empty segments", () => {
      expect(() => validateFilePath("src//index.ts")).toThrow(ValidationError);
    });

    it("rejects paths exceeding maximum length", () => {
      const longPath = "a/".repeat(501) + "file.txt";
      expect(() => validateFilePath(longPath, { maxLength: 1000 })).toThrow(ValidationError);
    });

    it("rejects paths exceeding maximum depth", () => {
      const deepPath = "dir/".repeat(35) + "file.txt";
      expect(() => validateFilePath(deepPath, { maxDepth: 30 })).toThrow(ValidationError);
    });
  });

  describe("validateGitRef (Ref Injection Defense)", () => {
    it("accepts valid git branch and tag refs", () => {
      expect(validateGitRef("main")).toBe("main");
      expect(validateGitRef("feature/user-auth")).toBe("feature/user-auth");
      expect(validateGitRef("v1.0.0-beta.1")).toBe("v1.0.0-beta.1");
      expect(validateGitRef("heads/main")).toBe("heads/main");
    });

    it("rejects empty refs", () => {
      expect(() => validateGitRef("")).toThrow(ValidationError);
    });

    it("rejects refs starting/ending with slashes or double slashes", () => {
      expect(() => validateGitRef("/main")).toThrow(ValidationError);
      expect(() => validateGitRef("main/")).toThrow(ValidationError);
      expect(() => validateGitRef("feature//branch")).toThrow(ValidationError);
    });

    it("rejects refs containing '..'", () => {
      expect(() => validateGitRef("feature/..")).toThrow(ValidationError);
      expect(() => validateGitRef("refs/../heads")).toThrow(ValidationError);
    });

    it("rejects refs containing '@{'", () => {
      expect(() => validateGitRef("master@{1}")).toThrow(ValidationError);
    });

    it("rejects refs ending with '.lock' or '.'", () => {
      expect(() => validateGitRef("main.lock")).toThrow(ValidationError);
      expect(() => validateGitRef("branch.")).toThrow(ValidationError);
    });

    it("rejects ref that is single '@'", () => {
      expect(() => validateGitRef("@")).toThrow(ValidationError);
    });

    it("rejects refs containing control or shell special characters", () => {
      expect(() => validateGitRef("branch with space")).toThrow(ValidationError);
      expect(() => validateGitRef("branch~1")).toThrow(ValidationError);
      expect(() => validateGitRef("branch^2")).toThrow(ValidationError);
      expect(() => validateGitRef("branch:colon")).toThrow(ValidationError);
      expect(() => validateGitRef("branch?")).toThrow(ValidationError);
      expect(() => validateGitRef("branch*")).toThrow(ValidationError);
      expect(() => validateGitRef("branch[0]")).toThrow(ValidationError);
      expect(() => validateGitRef("branch\\escaped")).toThrow(ValidationError);
    });
  });

  describe("assertOwnerRepo", () => {
    it("accepts valid owner and repo names", () => {
      expect(isValidOwner("octocat")).toBe(true);
      expect(isValidRepo("hello-world_123.test")).toBe(true);
      expect(() => assertOwnerRepo("octocat", "hello-world")).not.toThrow();
    });

    it("rejects '.' and '..' as owner or repo", () => {
      expect(isValidOwner(".")).toBe(false);
      expect(isValidOwner("..")).toBe(false);
      expect(isValidRepo(".")).toBe(false);
      expect(isValidRepo("..")).toBe(false);
      expect(() => assertOwnerRepo("..", "repo")).toThrow(ValidationError);
      expect(() => assertOwnerRepo("owner", "..")).toThrow(ValidationError);
    });

    it("rejects special characters, spaces, slashes in owner/repo", () => {
      expect(isValidOwner("owner/sub")).toBe(false);
      expect(isValidRepo("repo name")).toBe(false);
      expect(isValidRepo("repo;rm")).toBe(false);
      expect(isValidRepo("repo<script>")).toBe(false);
      expect(() => assertOwnerRepo("bad owner!", "repo")).toThrow(ValidationError);
    });
  });

  describe("validatePagination", () => {
    it("returns parsed pagination numbers within limits", () => {
      expect(validatePagination("1", "30")).toEqual({ page: 1, perPage: 30 });
      expect(validatePagination(2, 50)).toEqual({ page: 2, perPage: 50 });
      expect(validatePagination()).toEqual({ page: 1, perPage: 30 });
    });

    it("rejects invalid page numbers", () => {
      expect(() => validatePagination("0", "30")).toThrow(ValidationError);
      expect(() => validatePagination("-5", "30")).toThrow(ValidationError);
      expect(() => validatePagination("abc", "30")).toThrow(ValidationError);
    });

    it("rejects per_page exceeding maximum limit (100)", () => {
      expect(() => validatePagination("1", "101")).toThrow(ValidationError);
      expect(() => validatePagination("1", "0")).toThrow(ValidationError);
    });
  });

  describe("sanitizeText", () => {
    it("strips null bytes", () => {
      expect(sanitizeText("hello\0world")).toBe("helloworld");
    });

    it("rejects text exceeding maximum length", () => {
      expect(() => sanitizeText("a".repeat(100), 50)).toThrow(ValidationError);
    });
  });
});
