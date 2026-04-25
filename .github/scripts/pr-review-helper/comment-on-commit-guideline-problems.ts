/*
 * Copyright 2026 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {
  GitHubClient,
  PullRequestCommit,
  PullRequestData,
} from "./types.ts";

const COMMIT_GUIDELINES_MESSAGE = [
  "Can you please have a look at the git commits to see if they meet the contribution guidelines? We use a Linux kernel style of git commits. Please see previous git commits with git log for examples.",
  "",
  "<details>",
  "<summary>Commit guidelines</summary>",
  "",
  "- Use atomic commits focused on a single change.",
  "- Use the title format `<area>: <description of changes>`.",
  "- Keep the title and body lines under 72 characters.",
  "- Explain the intention and why the change is needed.",
  "- Make commit titles meaningful and describe what changed.",
  "- Do not add code that a later commit rewrites; squash or reorder commits instead.",
  "- Do not include `Fixes #NN` in commit messages.",
  "",
  "Good examples:",
  "",
  "- `frontend: HomeButton: Fix so it navigates to home`",
  "- `backend: config: Add enable-dynamic-clusters flag`",
  "",
  "</details>",
].join("\n");

const { MARKERS, commentOnce } = require("./github-helpers.ts");
const { isMergeMainCommit } = require("./comment-on-merge-main-commit.ts");

/**
 * Checks whether a commit message follows the repository commit-message guidelines.
 *
 * @param commit - Commit data from the GitHub pull request commits API.
 * @returns True when the title has an area prefix, is short enough, and avoids issue-closing text.
 */
function matchesCommitGuidelines(commit: PullRequestCommit): boolean {
  const message = commit.commit?.message || "";
  const title = message.split("\n")[0];

  if (!title || title.length > 72 || /\bfixes\s+#\d+/i.test(message)) {
    return false;
  }

  return /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9-]+)?: .+/.test(title);
}

/**
 * Checks whether any non-merge-main commit has commit-message guideline problems.
 *
 * @param commits - PR commits from GitHub.
 * @returns True when at least one relevant commit does not match the guidelines.
 */
function hasCommitGuidelineProblems(commits: PullRequestCommit[]): boolean {
  return commits.some(
    (commit) => !isMergeMainCommit(commit) && !matchesCommitGuidelines(commit),
  );
}

/**
 * Posts a one-time comment when any PR commit does not match the commit guidelines.
 *
 * @param github - Authenticated GitHub client.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param pullNumber - Pull request number.
 * @param data - Pull request data collected by the orchestrator.
 */
async function commentOnCommitGuidelineProblems(
  github: GitHubClient,
  owner: string,
  repo: string,
  pullNumber: number,
  data: PullRequestData,
): Promise<void> {
  if (!hasCommitGuidelineProblems(data.commits)) {
    return;
  }

  await commentOnce(
    github,
    owner,
    repo,
    pullNumber,
    data.issueComments,
    MARKERS.commitGuidelines,
    COMMIT_GUIDELINES_MESSAGE,
  );
}

module.exports = {
  COMMIT_GUIDELINES_MESSAGE,
  commentOnCommitGuidelineProblems,
  hasCommitGuidelineProblems,
  matchesCommitGuidelines,
};
