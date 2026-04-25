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

const fs: typeof import('node:fs') = require('node:fs');
const os: typeof import('node:os') = require('node:os');
const path: typeof import('node:path') = require('node:path');
const childProcess: typeof import('node:child_process') = require('node:child_process');

const COPILOT_REVIEWER = 'copilot-pull-request-reviewer';
const MERGE_MAIN_MESSAGE = `can you please rebase against main to remove the merge main commit?

<details>
<summary>Why this matters</summary>

Merge commits from \`main\` make the PR history harder to review. Please rebase your branch on top of the latest \`main\` instead, then update the PR with the rebased commits.

</details>`;
const COPILOT_COMMENTS_MESSAGE =
  'Thanks for this! Can you please address the open review comments?';
const SNAPSHOT_MESSAGE =
  'You might need to update the frontend test snapshots. Use `cd frontend && npm run test -- -u`';
const COMMIT_GUIDELINES_MESSAGE = `Can you please have a look at the git commits to see if they meet the contribution guidelines? We use a Linux kernel style of git commits detailed in the [contributing guide](https://headlamp.dev/docs/latest/development/contributing/#commit-guidelines) ([GitHub source](https://github.com/headlamp-k8s/headlamp/blob/main/docs/contributing.md#commit-guidelines)). Please see previous git commits with git log for examples.

<details>
<summary>Commit guidelines</summary>

- Use atomic commits focused on a single change.
- Use the title format \`<area>: <description of changes>\`.
- Keep the title and body lines under 72 characters.
- Explain the intention and why the change is needed.
- Make commit titles meaningful and describe what changed.
- Do not add code that a later commit rewrites; squash or reorder commits instead.
- Do not include \`Fixes #NN\` in commit messages.

Good examples:

- \`frontend: HomeButton: Fix so it navigates to home\`
- \`backend: config: Add enable-dynamic-clusters flag\`

</details>`;

const MARKERS = {
  mergeMain: '<!-- headlamp-pr-helper:merge-main -->',
  copilotComments: '<!-- headlamp-pr-helper:copilot-comments -->',
  snapshots: '<!-- headlamp-pr-helper:snapshots -->',
  commitGuidelines: '<!-- headlamp-pr-helper:commit-guidelines -->',
};

type GitHubUser = string | { login?: string | null } | null | undefined;

type CommitIdentity = {
  name?: string | null;
  email?: string | null;
};

type PullRequestCommit = {
  author?: GitHubUser;
  committer?: GitHubUser;
  commit?: {
    message?: string | null;
    author?: CommitIdentity | null;
    committer?: CommitIdentity | null;
  } | null;
};

type CommentLike = {
  body?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
  user?: GitHubUser;
};

type PullRequest = {
  requested_reviewers?: GitHubUser[] | null;
};

type WorkflowRunJob = {
  id: number;
  conclusion?: string | null;
  name?: string | null;
};

type WorkflowRunPullRequest = {
  number: number;
};

type WorkflowRunPayload = {
  id: number;
  conclusion?: string | null;
  pull_requests?: WorkflowRunPullRequest[];
};

type ActionContext = {
  eventName: string;
  repo: {
    owner: string;
    repo: string;
  };
  payload: {
    workflow_run?: WorkflowRunPayload;
    pull_request?: { number: number };
    issue?: { number: number; pull_request?: unknown };
    review?: { pull_request_url?: string };
  };
};

type Core = {
  info(message: string): void;
  warning(message: string): void;
};

type GitHubClient = {
  paginate(route: unknown, parameters: Record<string, unknown>): Promise<unknown[]>;
  request(route: string, parameters: Record<string, unknown>): Promise<{ data: unknown }>;
  rest: {
    pulls: {
      get(parameters: Record<string, unknown>): Promise<{ data: PullRequest }>;
      listCommits: unknown;
      listReviewComments: unknown;
      listReviews: unknown;
      requestReviewers(parameters: Record<string, unknown>): Promise<unknown>;
      createReview(parameters: Record<string, unknown>): Promise<unknown>;
    };
    issues: {
      listComments: unknown;
      createComment(parameters: Record<string, unknown>): Promise<unknown>;
    };
    actions: {
      listJobsForWorkflowRun: unknown;
    };
  };
};

type PullRequestData = {
  pull: PullRequest;
  commits: PullRequestCommit[];
  issueComments: CommentLike[];
  reviewComments: CommentLike[];
  reviews: CommentLike[];
  commentEvents: CommentLike[];
};

/**
 * Checks whether a GitHub user-like value is one of the Copilot identities used for review automation.
 *
 * @param user - A login string or GitHub API user object.
 * @returns True when the login belongs to Copilot.
 */
function isCopilotUser(user: GitHubUser): boolean {
  const login = typeof user === 'string' ? user : user?.login;
  if (!login) {
    return false;
  }

  return [
    'copilot',
    'copilot[bot]',
    'github-copilot[bot]',
    'copilot-pull-request-reviewer',
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
    /copilot/i.test(commit.commit?.author?.name || '') ||
    /copilot/i.test(commit.commit?.committer?.name || '') ||
    /copilot/i.test(commit.commit?.author?.email || '') ||
    /copilot/i.test(commit.commit?.committer?.email || '')
  );
}

/**
 * Checks whether contributors added commits after the latest Copilot commit in the PR.
 *
 * @param commits - PR commits in chronological order from GitHub.
 * @returns True when at least one commit appears after the last Copilot commit.
 */
function hasCommitsAfterLastCopilotCommit(commits: PullRequestCommit[]): boolean {
  const lastCopilotCommitIndex = commits.map(isCopilotCommit).lastIndexOf(true);
  return lastCopilotCommitIndex >= 0 && lastCopilotCommitIndex < commits.length - 1;
}

/**
 * Checks whether a commit title appears to merge the main branch into the PR branch.
 *
 * @param commit - Commit data from the GitHub pull request commits API.
 * @returns True when the title starts with merge and mentions main or master.
 */
function isMergeMainCommit(commit: PullRequestCommit): boolean {
  const title = (commit.commit?.message || '').split('\n')[0].toLowerCase();
  return /^merge\b/.test(title) && /\b(main|master)\b/.test(title);
}

/**
 * Checks whether a commit message follows the repository commit-message guidelines.
 *
 * @param commit - Commit data from the GitHub pull request commits API.
 * @returns True when the title has an area prefix, is short enough, and avoids issue-closing text.
 */
function commitMatchesGuidelines(commit: PullRequestCommit): boolean {
  const message = commit.commit?.message || '';
  const title = message.split('\n')[0];

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
  return commits.some(commit => !isMergeMainCommit(commit) && !commitMatchesGuidelines(commit));
}

/**
 * Checks whether a test log indicates failed, obsolete, or mismatched snapshots.
 *
 * @param log - Plain-text job log contents.
 * @returns True when the log contains snapshot failure text.
 */
function hasFailedSnapshots(log: string): boolean {
  return (
    /Snapshots?:\s+(?:\d+\s+)?failed/i.test(log) ||
    /snapshot.*(?:failed|obsolete|mismatch)/i.test(log)
  );
}

/**
 * Finds the newest Copilot review comment timestamp.
 *
 * @param reviewComments - Pull request review comments from GitHub.
 * @returns The latest Copilot review comment timestamp in milliseconds, or null if none exist.
 */
function latestCopilotReviewCommentAt(reviewComments: CommentLike[]): number | null {
  const copilotComments = reviewComments
    .filter(comment => isCopilotUser(comment.user))
    .map(comment => new Date(comment.created_at || '').getTime())
    .filter(timestamp => !Number.isNaN(timestamp));

  return copilotComments.length ? Math.max(...copilotComments) : null;
}

/**
 * Checks whether any comment-like event happened after a timestamp.
 *
 * @param timestamp - Timestamp in milliseconds.
 * @param events - Issue comments, review comments, and review bodies from GitHub.
 * @returns True when any event has a later created timestamp.
 */
function hasCommentsAfter(timestamp: number, events: CommentLike[]): boolean {
  return events.some(event => {
    const eventTimestamp = new Date(event.created_at || '').getTime();
    return !Number.isNaN(eventTimestamp) && eventTimestamp > timestamp;
  });
}

/**
 * Checks whether an existing comment or review contains an idempotency marker.
 *
 * @param comments - Comments or reviews to inspect.
 * @param marker - Hidden marker string that identifies helper output.
 * @returns True when any body contains the marker.
 */
function hasMarker(comments: CommentLike[], marker: string): boolean {
  return comments.some(comment => (comment.body || '').includes(marker));
}

/**
 * Prefixes a helper message with its hidden idempotency marker.
 *
 * @param marker - Hidden marker string that identifies helper output.
 * @param message - Human-readable comment or review body.
 * @returns The final GitHub comment or review body.
 */
function withMarker(marker: string, message: string): string {
  return `${marker}\n${message}`;
}

/**
 * Converts pull request reviews into comment-like events for latest-activity checks.
 *
 * @param reviews - Pull request reviews from GitHub.
 * @returns Review bodies with a normalized created_at field.
 */
function commentsFromReviews(reviews: CommentLike[]): CommentLike[] {
  return reviews
    .filter(review => review.body)
    .map(review => ({ ...review, body: review.body, created_at: review.submitted_at || review.created_at }));
}

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
 * Posts an issue comment if the helper has not already posted the same marker.
 *
 * @param github - Authenticated GitHub client from actions/github-script.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param pullNumber - Pull request number.
 * @param comments - Existing issue comments on the pull request.
 * @param marker - Hidden marker string that identifies this helper comment.
 * @param message - Human-readable comment body.
 * @returns True when a new comment was posted.
 */
async function commentOnce(
  github: GitHubClient,
  owner: string,
  repo: string,
  pullNumber: number,
  comments: CommentLike[],
  marker: string,
  message: string
): Promise<boolean> {
  if (hasMarker(comments, marker)) {
    return false;
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body: withMarker(marker, message),
  });

  return true;
}

/**
 * Requests Copilot review unless Copilot is already requested.
 *
 * @param github - Authenticated GitHub client from actions/github-script.
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
  core: Core
): Promise<boolean> {
  const requestedReviewers = pull.requested_reviewers || [];
  if (requestedReviewers.some(reviewer => isCopilotUser(reviewer))) {
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

/**
 * Requests changes on a pull request if the helper has not already posted the same marker.
 *
 * @param github - Authenticated GitHub client from actions/github-script.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param pullNumber - Pull request number.
 * @param reviews - Existing reviews on the pull request.
 * @param marker - Hidden marker string that identifies this helper review.
 * @param message - Human-readable review body.
 * @returns True when a request-changes review was created.
 */
async function requestChangesOnce(
  github: GitHubClient,
  owner: string,
  repo: string,
  pullNumber: number,
  reviews: CommentLike[],
  marker: string,
  message: string
): Promise<boolean> {
  if (hasMarker(reviews, marker)) {
    return false;
  }

  await github.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    event: 'REQUEST_CHANGES',
    body: withMarker(marker, message),
  });

  return true;
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

  if (data.commentEvents.length === 0 && data.commits.some(isMergeMainCommit)) {
    await commentOnce(
      github,
      owner,
      repo,
      pullNumber,
      data.issueComments,
      MARKERS.mergeMain,
      MERGE_MAIN_MESSAGE
    );
    return;
  }

  const latestCopilotComment = latestCopilotReviewCommentAt(data.reviewComments);
  if (latestCopilotComment && !hasCommentsAfter(latestCopilotComment, data.commentEvents)) {
    await requestChangesOnce(
      github,
      owner,
      repo,
      pullNumber,
      data.reviews,
      MARKERS.copilotComments,
      COPILOT_COMMENTS_MESSAGE
    );
  }

  if (hasCommitGuidelineProblems(data.commits)) {
    await commentOnce(
      github,
      owner,
      repo,
      pullNumber,
      data.issueComments,
      MARKERS.commitGuidelines,
      COMMIT_GUIDELINES_MESSAGE
    );
  }
}

/**
 * Converts a GitHub job-log response body into bytes.
 *
 * @param data - Response data from the job logs endpoint.
 * @returns Raw response bytes.
 */
function bufferFromResponseData(data: unknown): Buffer {
  if (typeof data === 'string') {
    return Buffer.from(data, 'utf8');
  }

  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  return Buffer.from(String(data || ''), 'utf8');
}

/**
 * Extracts a zip archive returned by GitHub's job-log endpoint into plain text.
 *
 * @param zipBytes - Raw zip archive bytes.
 * @returns Concatenated unzipped log file contents.
 */
function unzipLogArchive(zipBytes: Buffer): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'headlamp-pr-helper-'));
  const zipPath = path.join(tmpDir, 'logs.zip');

  try {
    fs.writeFileSync(zipPath, zipBytes);
    return childProcess.execFileSync('unzip', ['-p', zipPath], {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Downloads and unzips the logs for a workflow job.
 *
 * @param github - Authenticated GitHub client from actions/github-script.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param jobId - Workflow job id.
 * @returns Plain-text log contents.
 */
async function downloadJobLogs(
  github: GitHubClient,
  owner: string,
  repo: string,
  jobId: number
): Promise<string> {
  const response = await github.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs', {
    owner,
    repo,
    job_id: jobId,
  });

  const logBytes = bufferFromResponseData(response.data);
  try {
    return unzipLogArchive(logBytes);
  } catch {
    return logBytes.toString('utf8');
  }
}

/**
 * Handles a failed frontend workflow run and comments when failed snapshots are found.
 *
 * @param github - Authenticated GitHub client from actions/github-script.
 * @param context - GitHub Actions event context.
 * @param core - GitHub Actions core logger.
 */
async function handleWorkflowRun(
  github: GitHubClient,
  context: ActionContext,
  core: Core
): Promise<void> {
  const run = context.payload.workflow_run;
  if (run?.conclusion !== 'failure' || !run.pull_requests?.length) {
    return;
  }

  const { owner, repo } = context.repo;
  const pullNumber = run.pull_requests[0].number;
  const jobs = (await github.paginate(github.rest.actions.listJobsForWorkflowRun, {
    owner,
    repo,
    run_id: run.id,
    per_page: 100,
  })) as WorkflowRunJob[];
  const failedFrontendTestJobs = jobs.filter(
    job => job.conclusion === 'failure' && /(^|\b)test(\b|$)/i.test(job.name || '')
  );

  for (const job of failedFrontendTestJobs) {
    const log = await downloadJobLogs(github, owner, repo, job.id);
    if (hasFailedSnapshots(log)) {
      const issueComments = (await github.paginate(github.rest.issues.listComments, {
        owner,
        repo,
        issue_number: pullNumber,
        per_page: 100,
      })) as CommentLike[];
      await commentOnce(
        github,
        owner,
        repo,
        pullNumber,
        issueComments,
        MARKERS.snapshots,
        SNAPSHOT_MESSAGE
      );
      return;
    }
  }

  core.info('No failed frontend snapshots found in failed test job logs.');
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
  COMMIT_GUIDELINES_MESSAGE,
  COPILOT_COMMENTS_MESSAGE,
  MERGE_MAIN_MESSAGE,
  SNAPSHOT_MESSAGE,
  bufferFromResponseData,
  downloadJobLogs,
  hasCommitGuidelineProblems,
  hasCommitsAfterLastCopilotCommit,
  hasFailedSnapshots,
  isCopilotCommit,
  isMergeMainCommit,
  run,
  unzipLogArchive,
};
