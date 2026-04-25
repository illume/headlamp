#!/usr/bin/env -S node --experimental-strip-types
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
  ActionContext,
  CommentLike,
  Core,
  GitHubClient,
  PullRequestCommit,
  PullRequestData,
} from "./types.ts";

const childProcess: typeof import("node:child_process") = require("node:child_process");
const processModule: typeof import("node:process") = require("node:process");

const USAGE = [
  "Usage:",
  "  npx --no-install headlamp-pr-review-helper OWNER/REPO/NUMBER [--dry-run]",
  "  npx --no-install headlamp-pr-review-helper https://github.com/OWNER/REPO/pull/NUMBER [--dry-run]",
  "  npx --no-install headlamp-pr-review-helper --repo OWNER/REPO --pull NUMBER [--dry-run]",
].join("\n");

const { commentsFromReviews } = require("./github-helpers.ts");
const {
  hasCommitsAfterLastCopilotCommit,
  requestCopilotReview,
} = require("./request-copilot-review.ts");
const {
  requestChangesForLatestCopilotComments,
} = require("./request-changes-for-copilot-comments.ts");
const {
  commentOnMergeMainCommit,
} = require("./comment-on-merge-main-commit.ts");
const {
  commentOnCommitGuidelineProblems,
} = require("./comment-on-commit-guideline-problems.ts");
const {
  handleWorkflowRun,
} = require("./comment-on-failed-frontend-snapshots.ts");

/**
 * Fetches all PR data needed by the review helper in parallel.
 *
 * @param github - Authenticated GitHub client.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param pullNumber - Pull request number.
 * @returns Pull request metadata, commits, comments, review comments, reviews, and merged comment events.
 */
async function listPullRequestData(
  github: GitHubClient,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<PullRequestData> {
  const [pull, commits, issueComments, reviewComments, reviews] =
    await Promise.all([
      github.rest.pulls.get({ owner, repo, pull_number: pullNumber }),
      github.paginate(github.rest.pulls.listCommits, {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      }),
      github.paginate(github.rest.issues.listComments, {
        owner,
        repo,
        issue_number: pullNumber,
        per_page: 100,
      }),
      github.paginate(github.rest.pulls.listReviewComments, {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      }),
      github.paginate(github.rest.pulls.listReviews, {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      }),
    ]);

  const typedCommits = commits as PullRequestCommit[];
  const typedIssueComments = issueComments as CommentLike[];
  const typedReviewComments = reviewComments as CommentLike[];
  const typedReviews = reviews as CommentLike[];

  return {
    pull: pull.data,
    commits: typedCommits,
    issueComments: typedIssueComments,
    reviewComments: typedReviewComments,
    reviews: typedReviews,
    commentEvents: [
      ...typedIssueComments,
      ...typedReviewComments,
      ...commentsFromReviews(typedReviews),
    ],
  };
}

/**
 * Runs all pull-request checks and posts the needed review assistance.
 *
 * @param github - Authenticated GitHub client.
 * @param context - GitHub Actions or local event context.
 * @param core - Logger compatible with GitHub Actions core.
 * @param pullNumber - Pull request number.
 */
async function handlePullRequest(
  github: GitHubClient,
  context: ActionContext,
  core: Core,
  pullNumber: number,
): Promise<void> {
  const { owner, repo } = context.repo;
  const data = await listPullRequestData(github, owner, repo, pullNumber);

  if (hasCommitsAfterLastCopilotCommit(data.commits)) {
    await requestCopilotReview(
      github,
      owner,
      repo,
      pullNumber,
      data.pull,
      core,
    );
  }

  if (await commentOnMergeMainCommit(github, owner, repo, pullNumber, data)) {
    return;
  }

  await requestChangesForLatestCopilotComments(
    github,
    owner,
    repo,
    pullNumber,
    data,
  );
  await commentOnCommitGuidelineProblems(github, owner, repo, pullNumber, data);
}

/**
 * Gets the pull request number from supported GitHub event payloads.
 *
 * @param _github - Authenticated GitHub client.
 * @param context - GitHub Actions or local event context.
 * @returns Pull request number, or null when the event is not associated with a PR.
 */
async function pullNumberForEvent(
  _github: GitHubClient,
  context: ActionContext,
): Promise<number | null> {
  if (context.payload.pull_request) {
    return context.payload.pull_request.number;
  }

  if (context.payload.issue?.pull_request) {
    return context.payload.issue.number;
  }

  if (context.payload.review?.pull_request_url) {
    return Number(context.payload.review.pull_request_url.split("/").pop());
  }

  return null;
}

/**
 * Wraps mutating GitHub API calls so dry-run mode reports actions without creating them.
 *
 * @param github - Authenticated GitHub client.
 * @param core - Logger compatible with GitHub Actions core.
 * @returns A GitHub client that performs reads normally and logs writes.
 */
function dryRunGitHubClient(github: GitHubClient, core: Core): GitHubClient {
  return {
    ...github,
    rest: {
      ...github.rest,
      pulls: {
        ...github.rest.pulls,
        requestReviewers: async (parameters) => {
          core.info(
            `[dry-run] Would request reviewers: ${JSON.stringify(parameters)}`,
          );
          return {};
        },
        createReview: async (parameters) => {
          core.info(
            `[dry-run] Would create pull request review: ${JSON.stringify(parameters)}`,
          );
          return {};
        },
      },
      issues: {
        ...github.rest.issues,
        createComment: async (parameters) => {
          core.info(
            `[dry-run] Would create issue comment: ${JSON.stringify(parameters)}`,
          );
          return {};
        },
      },
    },
  };
}

/**
 * Entry point used by the PR Review Helper workflow and local CLI.
 *
 * @param options - Runtime objects and options.
 */
async function run(options: {
  github: GitHubClient;
  context: ActionContext;
  core: Core;
  dryRun?: boolean;
}): Promise<void> {
  const { context, core } = options;
  const github = options.dryRun
    ? dryRunGitHubClient(options.github, core)
    : options.github;

  if (options.dryRun) {
    core.info(
      "Running PR review helper in dry-run mode. No comments, reviews, or review requests will be created.",
    );
  }

  if (context.eventName === "workflow_run") {
    await handleWorkflowRun(github, context, core);
    return;
  }

  const pullNumber = await pullNumberForEvent(github, context);
  if (!pullNumber) {
    core.info("No pull request found for this event.");
    return;
  }

  await handlePullRequest(github, context, core, pullNumber);
}

/**
 * Reads a GitHub token for local runs from the GitHub CLI.
 *
 * @returns A GitHub token from `gh auth token`.
 */
function tokenFromGh(): string {
  return childProcess
    .execFileSync("gh", ["auth", "token"], { encoding: "utf8" })
    .trim();
}

/**
 * Builds a lightweight local context for a single pull request.
 *
 * @param repoName - Repository name in owner/repo form.
 * @param pullNumber - Pull request number.
 * @returns Local action context.
 */
function localPullRequestContext(
  repoName: string,
  pullNumber: number,
): ActionContext {
  const [owner, repo] = repoName.split("/");
  if (!owner || !repo) {
    throw new Error("Expected --repo in owner/repo form.");
  }

  return {
    eventName: "pull_request_target",
    repo: { owner, repo },
    payload: { pull_request: { number: pullNumber } },
  };
}

/**
 * Parses a pull request target from owner/repo/number or a GitHub pull request URL.
 *
 * @param target - Pull request target, such as `illume/headlamp/110` or a full PR URL.
 * @returns Repository name and pull request number.
 */
function parsePullRequestTarget(target: string): {
  repoName: string;
  pullNumber: number;
} {
  const urlMatch = target.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:[/?#].*)?$/,
  );
  if (urlMatch) {
    return {
      repoName: `${urlMatch[1]}/${urlMatch[2]}`,
      pullNumber: Number(urlMatch[3]),
    };
  }

  const shortMatch = target.match(/^([^/]+)\/([^/]+)\/(\d+)$/);
  if (shortMatch) {
    return {
      repoName: `${shortMatch[1]}/${shortMatch[2]}`,
      pullNumber: Number(shortMatch[3]),
    };
  }

  throw new Error(
    "Expected pull request target as OWNER/REPO/NUMBER or https://github.com/OWNER/REPO/pull/NUMBER.",
  );
}

/**
 * Parses CLI arguments for local runs.
 *
 * @param args - Command-line arguments after the script name.
 * @returns Parsed repository, pull request number, and dry-run flag.
 */
function parseCliArgs(args: string[]): {
  repoName?: string;
  pullNumber?: number;
  dryRun: boolean;
  help: boolean;
} {
  const parsed: {
    repoName?: string;
    pullNumber?: number;
    dryRun: boolean;
    help: boolean;
  } = {
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--repo") {
      parsed.repoName = args[++index];
    } else if (arg === "--pull") {
      parsed.pullNumber = Number(args[++index]);
    } else if (arg === "--pr") {
      const target = parsePullRequestTarget(args[++index]);
      parsed.repoName = target.repoName;
      parsed.pullNumber = target.pullNumber;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      return parsed;
    } else if (!arg.startsWith("-") && !parsed.repoName && !parsed.pullNumber) {
      const target = parsePullRequestTarget(arg);
      parsed.repoName = target.repoName;
      parsed.pullNumber = target.pullNumber;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

/**
 * Runs the helper from a GitHub Actions job or as a local CLI.
 *
 * @param args - Command-line arguments after the script name.
 */
async function main(args: string[]): Promise<void> {
  const actionsGithubPackage = "@actions/github";
  const actionsCorePackage = "@actions/core";
  const actionsGithub = await import(actionsGithubPackage);
  const actionsCore = await import(actionsCorePackage);
  const core: Core = actionsCore;
  const parsed = parseCliArgs(args);

  if (parsed.help) {
    console.log(USAGE);
    return;
  }

  if (parsed.repoName || parsed.pullNumber || parsed.dryRun) {
    if (!parsed.repoName || !parsed.pullNumber) {
      throw new Error(USAGE);
    }

    const github = actionsGithub.getOctokit(tokenFromGh()) as GitHubClient;
    await run({
      github,
      context: localPullRequestContext(parsed.repoName, parsed.pullNumber),
      core,
      dryRun: parsed.dryRun,
    });
    return;
  }

  const token = processModule.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN must be set when running in GitHub Actions.");
  }

  await run({
    github: actionsGithub.getOctokit(token) as GitHubClient,
    context: actionsGithub.context as ActionContext,
    core,
  });
}

if (require.main === module) {
  main(processModule.argv.slice(2)).catch((error) => {
    console.error(error);
    processModule.exitCode = 1;
  });
}

module.exports = {
  dryRunGitHubClient,
  handlePullRequest,
  listPullRequestData,
  localPullRequestContext,
  parseCliArgs,
  parsePullRequestTarget,
  pullNumberForEvent,
  run,
  tokenFromGh,
  USAGE,
};
