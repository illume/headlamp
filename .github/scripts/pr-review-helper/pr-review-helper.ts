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

import type { ActionContext, CommentLike, Core, GitHubClient, PullRequestCommit, PullRequestData } from './types.ts';

const { commentsFromReviews } = require('./comments.ts');
const { hasCommitsAfterLastCopilotCommit, requestCopilotReview } = require('./copilot-review.ts');
const { requestChangesForLatestCopilotComments } = require('./copilot-comments.ts');
const { commentOnMergeMainCommit } = require('./merge-main.ts');
const { commentOnCommitGuidelineProblems } = require('./commit-guidelines.ts');
const { handleWorkflowRun } = require('./snapshots.ts');

/**
 * Fetches all PR data needed by the review helper in parallel.
 *
 * @param github - Authenticated GitHub client from actions/github-script.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param pullNumber - Pull request number.
 * @returns Pull request metadata, commits, comments, review comments, reviews, and merged comment events.
 */
async function listPullRequestData(
  github: GitHubClient,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequestData> {
  const [pull, commits, issueComments, reviewComments, reviews] = await Promise.all([
    github.rest.pulls.get({ owner, repo, pull_number: pullNumber }),
    github.paginate(github.rest.pulls.listCommits, { owner, repo, pull_number: pullNumber, per_page: 100 }),
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
 * @param github - Authenticated GitHub client from actions/github-script.
 * @param context - GitHub Actions event context.
 * @param core - GitHub Actions core logger.
 * @param pullNumber - Pull request number.
 */
async function handlePullRequest(
  github: GitHubClient,
  context: ActionContext,
  core: Core,
  pullNumber: number
): Promise<void> {
  const { owner, repo } = context.repo;
  const data = await listPullRequestData(github, owner, repo, pullNumber);

  if (hasCommitsAfterLastCopilotCommit(data.commits)) {
    await requestCopilotReview(github, owner, repo, pullNumber, data.pull, core);
  }

  if (await commentOnMergeMainCommit(github, owner, repo, pullNumber, data)) {
    return;
  }

  await requestChangesForLatestCopilotComments(github, owner, repo, pullNumber, data);
  await commentOnCommitGuidelineProblems(github, owner, repo, pullNumber, data);
}

/**
 * Gets the pull request number from supported GitHub event payloads.
 *
 * @param _github - Authenticated GitHub client from actions/github-script.
 * @param context - GitHub Actions event context.
 * @returns Pull request number, or null when the event is not associated with a PR.
 */
async function pullNumberForEvent(
  _github: GitHubClient,
  context: ActionContext
): Promise<number | null> {
  if (context.payload.pull_request) {
    return context.payload.pull_request.number;
  }

  if (context.payload.issue?.pull_request) {
    return context.payload.issue.number;
  }

  if (context.payload.review?.pull_request_url) {
    return Number(context.payload.review.pull_request_url.split('/').pop());
  }

  return null;
}

/**
 * Entry point used by the PR Review Helper workflow.
 *
 * @param options - GitHub Script runtime objects.
 */
async function run(options: {
  github: GitHubClient;
  context: ActionContext;
  core: Core;
}): Promise<void> {
  const { github, context, core } = options;

  if (context.eventName === 'workflow_run') {
    await handleWorkflowRun(github, context, core);
    return;
  }

  const pullNumber = await pullNumberForEvent(github, context);
  if (!pullNumber) {
    core.info('No pull request found for this event.');
    return;
  }

  await handlePullRequest(github, context, core, pullNumber);
}

module.exports = {
  handlePullRequest,
  listPullRequestData,
  pullNumberForEvent,
  run,
};
