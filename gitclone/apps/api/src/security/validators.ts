import { ValidationError } from "../errors.js";

const OWNER_REPO_REGEX = /^[A-Za-z0-9_.-]{1,100}$/;
const GIT_REF_DISALLOWED_CHARS = /[\x00-\x20\x7F~^:?*\[\\@]/;

export function isValidOwner(owner: string): boolean {
  if (!owner || typeof owner !== "string") return false;
  if (owner === "." || owner === "..") return false;
  return OWNER_REPO_REGEX.test(owner);
}

export function isValidRepo(repo: string): boolean {
  if (!repo || typeof repo !== "string") return false;
  if (repo === "." || repo === "..") return false;
  return OWNER_REPO_REGEX.test(repo);
}

export function assertOwnerRepo(owner: string, repo: string): void {
  if (!isValidOwner(owner)) {
    throw new ValidationError(`Invalid repository owner: "${owner}"`, "invalid_owner");
  }
  if (!isValidRepo(repo)) {
    throw new ValidationError(`Invalid repository name: "${repo}"`, "invalid_repo");
  }
}

export function validateFilePath(
  path: string,
  options: { allowEmpty?: boolean; maxLength?: number; maxDepth?: number } = {}
): string {
  const { allowEmpty = false, maxLength = 1000, maxDepth = 30 } = options;

  if (typeof path !== "string") {
    throw new ValidationError("File path must be a string", "invalid_path");
  }

  if (path === "") {
    if (allowEmpty) return "";
    throw new ValidationError("File path cannot be empty", "invalid_path");
  }

  if (path.length > maxLength) {
    throw new ValidationError(`File path exceeds maximum length of ${maxLength}`, "path_too_long");
  }

  if (path.includes("\0") || path.includes("%00")) {
    throw new ValidationError("File path contains null bytes", "path_null_byte");
  }

  if (path.includes("\\")) {
    throw new ValidationError("File path cannot contain backslashes", "path_backslash");
  }

  // Normalize: remove leading slashes
  const normalized = path.replace(/^\/+/, "");

  if (normalized === "" && !allowEmpty) {
    throw new ValidationError("File path cannot be root", "invalid_path");
  }

  const segments = normalized.split("/");
  if (segments.length > maxDepth) {
    throw new ValidationError(`File path depth exceeds maximum depth of ${maxDepth}`, "path_too_deep");
  }

  for (const seg of segments) {
    if (seg === ".." || seg === ".") {
      throw new ValidationError("File path cannot contain traversal segments ('.' or '..')", "path_traversal");
    }
    if (seg.length === 0) {
      throw new ValidationError("File path cannot contain empty segments ('//')", "invalid_path");
    }
    // Check for control characters
    if (/[\x00-\x1F\x7F]/.test(seg)) {
      throw new ValidationError("File path contains illegal control characters", "invalid_path");
    }
  }

  return normalized;
}

export function validateGitRef(ref: string): string {
  if (typeof ref !== "string" || !ref) {
    throw new ValidationError("Git ref cannot be empty", "invalid_git_ref");
  }

  if (ref.length > 255) {
    throw new ValidationError("Git ref exceeds maximum length of 255 characters", "git_ref_too_long");
  }

  if (ref.startsWith("/") || ref.endsWith("/") || ref.includes("//")) {
    throw new ValidationError("Git ref cannot start/end with slash or contain consecutive slashes", "invalid_git_ref");
  }

  if (ref.includes("..")) {
    throw new ValidationError("Git ref cannot contain '..'", "invalid_git_ref");
  }

  if (ref.includes("@{")) {
    throw new ValidationError("Git ref cannot contain '@{' sequence", "invalid_git_ref");
  }

  if (ref.endsWith(".lock")) {
    throw new ValidationError("Git ref cannot end with '.lock'", "invalid_git_ref");
  }

  if (ref.endsWith(".")) {
    throw new ValidationError("Git ref cannot end with '.'", "invalid_git_ref");
  }

  if (ref === "@") {
    throw new ValidationError("Git ref cannot be single '@'", "invalid_git_ref");
  }

  // Check for control characters, space, tilde, caret, colon, question, asterisk, bracket, backslash
  if (/[\x00-\x20\x7F~^:?*\[\\]/.test(ref)) {
    throw new ValidationError("Git ref contains invalid characters", "invalid_git_ref");
  }

  return ref;
}

export function validatePagination(
  page?: string | number | null,
  perPage?: string | number | null,
  maxPerPage = 100
): { page: number; perPage: number } {
  const parsedPage = page ? parseInt(String(page), 10) : 1;
  const parsedPerPage = perPage ? parseInt(String(perPage), 10) : 30;

  if (isNaN(parsedPage) || parsedPage < 1) {
    throw new ValidationError("Page must be a positive integer >= 1", "invalid_pagination");
  }

  if (isNaN(parsedPerPage) || parsedPerPage < 1 || parsedPerPage > maxPerPage) {
    throw new ValidationError(`per_page must be between 1 and ${maxPerPage}`, "invalid_pagination");
  }

  return { page: parsedPage, perPage: parsedPerPage };
}

export function sanitizeText(text: string, maxLength = 65536): string {
  if (typeof text !== "string") {
    throw new ValidationError("Expected string input", "invalid_text");
  }
  const stripped = text.replace(/\0/g, "");
  if (stripped.length > maxLength) {
    throw new ValidationError(`Text exceeds maximum allowed length of ${maxLength} characters`, "text_too_long");
  }
  return stripped;
}
