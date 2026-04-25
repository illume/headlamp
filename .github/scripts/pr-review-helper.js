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

const COPILOT_REVIEWER = 'copilot-pull-request-reviewer';
const MERGE_MAIN_MESSAGE = 'can you please rebase against main to remove the merge main commit?';
const COPILOT_COMMENTS_MESSAGE =
  'Thanks for this! Can you please address the open review comments?';
const SNAPSHOT_MESSAGE =
  'You might need to update the frontend test snapshots. Use `npm run test -- -u`';
const COMMIT_GUIDELINES_MESSAGE =
  'Can you please have a look at the git commits to see if they meet the contribution guidelines? ' +
  'We use a linux kernel style of git commits detailed in the contributing guide. ' +
  'Please see previous git commits with git log for examples.';

const MARKERS = {
  mergeMain: '<!-- headlamp-pr-helper:merge-main -->',
  copilotComments: '<!-- headlamp-pr-helper:copilot-comments -->',
  snapshots: '<!-- headlamp-pr-helper:snapshots -->',
  commitGuidelines: '<!-- headlamp-pr-helper:commit-guidelines -->',
};

function isCopilotUser(user) {
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

function isCopilotCommit(commit) {
  return (
    isCopilotUser(commit.author) ||
    isCopilotUser(commit.committer) ||
    /copilot/i.test(commit.commit?.author?.name || '') ||
    /copilot/i.test(commit.commit?.committer?.name || '') ||
    /copilot/i.test(commit.commit?.author?.email || '') ||
    /copilot/i.test(commit.commit?.committer?.email || '')
  );
}

function hasCommitsAfterLastCopilotCommit(commits) {
  const lastCopilotCommitIndex = commits.map(isCopilotCommit).lastIndexOf(true);
  return lastCopilotCommitIndex >= 0 && lastCopilotCommitIndex < commits.length - 1;
}

function isMergeMainCommit(commit) {
  const title = (commit.commit?.message || '').split('\n')[0].toLowerCase();
  return /^merge\b/.test(title) && /\b(main|master)\b/.test(title);
}

function commitMatchesGuidelines(commit) {
  const message = commit.commit?.message || '';
  const title = message.split('\n')[0];

  if (!title || title.length > 72 || /\bfixes\s+#\d+/i.test(message)) {
    return false;
  }

  return /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9-]+)?: .+/.test(title);
}

function hasCommitGuidelineProblems(commits) {
  return commits.some(commit => !isMergeMainCommit(commit) && !commitMatchesGuidelines(commit));
}

function hasFailedSnapshots(log) {
  return (
    /Snapshots?:\s+(?:\d+\s+)?failed/i.test(log) ||
    /snapshot.*(?:failed|obsolete|mismatch)/i.test(log)
  );
}

function latestCopilotReviewCommentAt(reviewComments) {
  const copilotComments = reviewComments
    .filter(comment => isCopilotUser(comment.user))
    .map(comment => new Date(comment.created_at).getTime())
    .filter(timestamp => !Number.isNaN(timestamp));

  return copilotComments.length ? Math.max(...copilotComments) : null;
}

function hasCommentsAfter(timestamp, events) {
  return events.some(event => {
    const eventTimestamp = new Date(event.created_at).getTime();
    return !Number.isNaN(eventTimestamp) && eventTimestamp > timestamp;
  });
}

function hasMarker(comments, marker) {
  return comments.some(comment => (comment.body || '').includes(marker));
}

function withMarker(marker, message) {
  return `${marker}\n${message}`;
}

function commentsFromReviews(reviews) {
  return reviews
    .filter(review => review.body)
    .map(review => ({ ...review, body: review.body, created_at: review.submitted_at || review.created_at }));
}

async function listPullRequestData(github, owner, repo, pullNumber) {
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

  return {
    pull: pull.data,
    commits,
    issueComments,
    reviewComments,
    reviews,
    commentEvents: [...issueComments, ...reviewComments, ...commentsFromReviews(reviews)],
  };
}

async function commentOnce(github, owner, repo, pullNumber, comments, marker, message) {
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

async function requestCopilotReview(github, owner, repo, pullNumber, pull, core) {
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
  } catch (error) {
    core.warning(`Could not request Copilot review: ${error.message}`);
    return false;
  }
}

async function requestChangesOnce(github, owner, repo, pullNumber, reviews, marker, message) {
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

async function handlePullRequest(github, context, core, pullNumber) {
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

async function downloadJobLogs(github, owner, repo, jobId) {
  const response = await github.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs', {
    owner,
    repo,
    job_id: jobId,
  });

  if (typeof response.data === 'string') {
    return response.data;
  }

  if (Buffer.isBuffer(response.data)) {
    return response.data.toString('utf8');
  }

  if (response.data instanceof ArrayBuffer) {
    return Buffer.from(response.data).toString('utf8');
  }

  if (ArrayBuffer.isView(response.data)) {
    return Buffer.from(response.data.buffer).toString('utf8');
  }

  return String(response.data || '');
}

async function handleWorkflowRun(github, context, core) {
  const run = context.payload.workflow_run;
  if (run?.conclusion !== 'failure' || !run.pull_requests?.length) {
    return;
  }

  const { owner, repo } = context.repo;
  const pullNumber = run.pull_requests[0].number;
  const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRun, {
    owner,
    repo,
    run_id: run.id,
    per_page: 100,
  });
  const failedFrontendTestJobs = jobs.filter(
    job => job.conclusion === 'failure' && /(^|\b)test(\b|$)/i.test(job.name || '')
  );

  for (const job of failedFrontendTestJobs) {
    const log = await downloadJobLogs(github, owner, repo, job.id);
    if (hasFailedSnapshots(log)) {
      const issueComments = await github.paginate(github.rest.issues.listComments, {
        owner,
        repo,
        issue_number: pullNumber,
        per_page: 100,
      });
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

async function pullNumberForEvent(github, context) {
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

async function run({ github, context, core }) {
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
  hasCommitGuidelineProblems,
  hasCommitsAfterLastCopilotCommit,
  hasFailedSnapshots,
  isCopilotCommit,
  isMergeMainCommit,
  run,
};
