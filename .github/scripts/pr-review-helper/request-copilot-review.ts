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
  Core,
  GitHubClient,
  GitHubUser,
  PullRequest,
  PullRequestCommit,
} from "./types.ts";

const COPILOT_REVIEWER = "copilot-pull-request-reviewer";

/**
 * Checks whether a GitHub user-like value is one of the Copilot identities used for review automation.
 *
 * @param user - A login string or GitHub API user object.
 * @returns True when the login belongs to Copilot.
 */
function isCopilotUser(user: GitHubUser): boolean {
  const login = typeof user === "string" ? user : user?.login;
  if (!login) {
    return false;
  }

  return [
    "copilot",
    "copilot[bot]",
    "github-copilot[bot]",
    "copilot-pull-request-reviewer",
  ].includes(login.toLowerCase());
}

/**
 * Checks whether a PR commit was authored or committed by Copilot.
 *
 * @param commit - Commit data from the GitHub pull request commits API.
 * @returns True when the author, committer, name, or email looks like Copilot.
 */
function isCopilotCommit(commit: PullRequestCommit): boolean {
  return (
    isCopilotUser(commit.author) ||
    isCopilotUser(commit.committer) ||
    /copilot/i.test(commit.commit?.author?.name || "") ||
    /copilot/i.test(commit.commit?.committer?.name || "") ||
    /copilot/i.test(commit.commit?.author?.email || "") ||
    /copilot/i.test(commit.commit?.committer?.email || "")
  );
}

/**
 * Checks whether contributors added commits after the latest Copilot commit in the PR.
 *
 * @param commits - PR commits in chronological order from GitHub.
 * @returns True when at least one commit appears after the last Copilot commit.
 */
function hasCommitsAfterLastCopilotCommit(
  commits: PullRequestCommit[],
): boolean {
  const lastCopilotCommitIndex = commits.map(isCopilotCommit).lastIndexOf(true);
  return (
    lastCopilotCommitIndex >= 0 && lastCopilotCommitIndex < commits.length - 1
  );
}

/**
 * Requests Copilot review unless Copilot is already requested.
 *
 * @param github - Authenticated GitHub client.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param pullNumber - Pull request number.
 * @param pull - Pull request metadata from GitHub.
 * @param core - GitHub Actions core logger.
 * @returns True when a review request was created.
 */
async function requestCopilotReview(
  github: GitHubClient,
  owner: string,
  repo: string,
  pullNumber: number,
  pull: PullRequest,
  core: Core,
): Promise<boolean> {
  const requestedReviewers = pull.requested_reviewers || [];
  if (requestedReviewers.some((reviewer) => isCopilotUser(reviewer))) {
    return false;
  }

  try {
    await github.rest.pulls.requestReviewers({
      owner,
      repo,
      pull_number: pullNumber,
      reviewers: [COPILOT_REVIEWER],
    });
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    core.warning(`Could not request Copilot review: ${message}`);
    return false;
  }
}

module.exports = {
  COPILOT_REVIEWER,
  hasCommitsAfterLastCopilotCommit,
  isCopilotCommit,
  isCopilotUser,
  requestCopilotReview,
};
