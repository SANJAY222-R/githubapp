export type GithubUser = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
};

export type GithubBranch = {
  name: string;
  sha: string;
  protected: boolean;
};

export type GithubCommit = {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  committerName: string;
  committerDate: string;
  htmlUrl: string;
  parents: string[];
};

export type GithubDiff = {
  sha: string;
  files: GithubDiffFile[];
  stats: { additions: number; deletions: number; total: number };
};

export type GithubDiffFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | undefined;
};
