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

const assert: typeof import("node:assert/strict") = require("node:assert/strict");
const { test } = require("node:test") as typeof import("node:test");

const {
  hasCommitsAfterLastCopilotCommit,
  requestCopilotReview,
} = require("./request-copilot-review.ts");
const {
  COMMIT_GUIDELINES_MESSAGE,
  commentOnCommitGuidelineProblems,
  hasCommitGuidelineProblems,
} = require("./comment-on-commit-guideline-problems.ts");
const {
  MERGE_MAIN_MESSAGE,
  commentOnMergeMainCommit,
  isMergeMainCommit,
} = require("./comment-on-merge-main-commit.ts");
const {
  SNAPSHOT_MESSAGE,
  bufferFromResponseData,
  downloadJobLogs,
  handleWorkflowRun,
  hasFailedSnapshots,
  unzipLogArchive,
} = require("./comment-on-failed-frontend-snapshots.ts");
const {
  MARKERS,
  commentOnce,
  requestChangesOnce,
} = require("./github-helpers.ts");
const {
  dryRunGitHubClient,
  localPullRequestContext,
  parseCliArgs,
  parsePullRequestTarget,
} = require("./pr-review-helper.ts");

import type { CommentLike, GitHubClient, PullRequestData } from "./types.ts";

type TestCommit = {
  author: { login: string };
  committer: { login: string };
  commit: {
    message: string;
    author: { name: string; email: string };
    committer: { name: string; email: string };
  };
};

/**
 * Builds a minimal pull request commit fixture.
 *
 * @param message - Commit message to include in the fixture.
 * @param authorLogin - GitHub login for the commit author and committer.
 * @returns A commit fixture shaped like the GitHub API response.
 */
function commit(message: string, authorLogin = "contributor"): TestCommit {
  return {
    author: { login: authorLogin },
    committer: { login: authorLogin },
    commit: {
      message,
      author: { name: authorLogin, email: `${authorLogin}@example.com` },
      committer: { name: authorLogin, email: `${authorLogin}@example.com` },
    },
  };
}

/** Builds a minimal GitHub client mock for helper tests. */
function githubMock(
  options: {
    issueComments?: CommentLike[];
    reviews?: CommentLike[];
    jobs?: unknown[];
    logData?: unknown;
    onCreateComment?: (parameters: Record<string, unknown>) => void;
    onCreateReview?: (parameters: Record<string, unknown>) => void;
    onRequestReviewers?: (parameters: Record<string, unknown>) => void;
  } = {},
): GitHubClient {
  const routes = {
    listComments: Symbol("listComments"),
    listJobsForWorkflowRun: Symbol("listJobsForWorkflowRun"),
  };

  return {
    paginate: async (route) => {
      if (route === routes.listComments) {
        return options.issueComments || [];
      }
      if (route === routes.listJobsForWorkflowRun) {
        return options.jobs || [];
      }
      return [];
    },
    request: async () => ({ data: options.logData || "" }),
    rest: {
      pulls: {
        get: async () => ({ data: {} }),
        listCommits: Symbol("listCommits"),
        listReviewComments: Symbol("listReviewComments"),
        listReviews: Symbol("listReviews"),
        requestReviewers: async (parameters) => {
          options.onRequestReviewers?.(parameters);
          return {};
        },
        createReview: async (parameters) => {
          options.onCreateReview?.(parameters);
          return {};
        },
      },
      issues: {
        listComments: routes.listComments,
        createComment: async (parameters) => {
          options.onCreateComment?.(parameters);
          return {};
        },
      },
      actions: {
        listJobsForWorkflowRun: routes.listJobsForWorkflowRun,
      },
    },
  };
}

const core = {
  info() {},
  warning() {},
};
test("detects commits after the last Copilot commit", () => {
  assert.equal(
    hasCommitsAfterLastCopilotCommit([
      commit("frontend: Add feature", "contributor"),
      commit("frontend: Apply feedback", "copilot"),
      commit("frontend: Update after review", "contributor"),
    ]),
    true,
  );
  assert.equal(
    hasCommitsAfterLastCopilotCommit([
      commit("frontend: Add feature", "contributor"),
      commit("frontend: Apply feedback", "copilot"),
    ]),
    false,
  );
});

test("detects merge-main commits", () => {
  assert.equal(
    isMergeMainCommit(commit("Merge branch 'main' into feature")),
    true,
  );
  assert.equal(isMergeMainCommit(commit("frontend: Merge table cells")), false);
});

test("detects commit guideline problems", () => {
  assert.equal(
    hasCommitGuidelineProblems([commit("frontend: Add PR helper")]),
    false,
  );
  assert.equal(
    hasCommitGuidelineProblems([commit("updates the manifest")]),
    true,
  );
  assert.equal(
    hasCommitGuidelineProblems([
      commit("frontend: Add PR helper\n\nFixes #123"),
    ]),
    true,
  );
});

test("includes commit guideline details in the guidance message", () => {
  assert.match(COMMIT_GUIDELINES_MESSAGE, /Linux kernel style/);
  assert.match(
    COMMIT_GUIDELINES_MESSAGE,
    /Use the title format `<area>: <description of changes>`/,
  );
  assert.match(COMMIT_GUIDELINES_MESSAGE, /Do not include `Fixes #NN`/);
});

test("adds collapsible details to guidance comments", () => {
  assert.match(
    MERGE_MAIN_MESSAGE,
    /<details>[\s\S]*<summary>Why this matters<\/summary>/,
  );
  assert.match(
    COMMIT_GUIDELINES_MESSAGE,
    /<details>[\s\S]*<summary>Commit guidelines<\/summary>/,
  );
});

test("detects failed snapshot logs", () => {
  assert.equal(hasFailedSnapshots("Snapshots:   2 failed, 10 passed"), true);
  assert.equal(
    hasFailedSnapshots("Snapshot Summary\n › 1 snapshot obsolete"),
    true,
  );
  assert.equal(hasFailedSnapshots("Tests:       12 passed"), false);
});

test("extracts GitHub job log zip archives before scanning", () => {
  const zipBytes = Buffer.from(
    "UEsDBBQAAAAIAFEsmVzc7efNIgAAACAAAAAKAAAAMF90ZXN0LnR4dAvOSywozsgvKbZSUFAwVEhLzMxJTdFRMFIoSCwuTk3hAgBQSwECFAMUAAAACABRLJlc3O3nzSIAAAAgAAAACgAAAAAAAAAAAAAAgAEAAAAAMF90ZXN0LnR4dFBLBQYAAAAAAQABADgAAABKAAAAAAA=",
    "base64",
  );

  assert.equal(
    hasFailedSnapshots(unzipLogArchive(bufferFromResponseData(zipBytes))),
    true,
  );
});

test("skips duplicate issue comments when an idempotency marker exists", async () => {
  let created = 0;
  const github = githubMock({ onCreateComment: () => created++ });

  assert.equal(
    await commentOnce(
      github,
      "illume",
      "headlamp",
      110,
      [{ body: MARKERS.commitGuidelines }],
      MARKERS.commitGuidelines,
      "message",
    ),
    false,
  );
  assert.equal(created, 0);
});

test("skips duplicate request-changes reviews when an idempotency marker exists", async () => {
  let created = 0;
  const github = githubMock({ onCreateReview: () => created++ });

  assert.equal(
    await requestChangesOnce(
      github,
      "illume",
      "headlamp",
      110,
      [{ body: MARKERS.copilotComments }],
      MARKERS.copilotComments,
      "message",
    ),
    false,
  );
  assert.equal(created, 0);
});

test("skips duplicate Copilot review requests when Copilot is already requested", async () => {
  let requested = 0;
  const github = githubMock({ onRequestReviewers: () => requested++ });

  assert.equal(
    await requestCopilotReview(
      github,
      "illume",
      "headlamp",
      110,
      { requested_reviewers: [{ login: "copilot-pull-request-reviewer" }] },
      core,
    ),
    false,
  );
  assert.equal(requested, 0);
});

test("keeps commit-guideline and merge-main helper comments idempotent", async () => {
  let created = 0;
  const github = githubMock({ onCreateComment: () => created++ });
  const commitGuidelineData: PullRequestData = {
    pull: {},
    commits: [commit("updates the manifest")],
    issueComments: [{ body: MARKERS.commitGuidelines }],
    reviewComments: [],
    reviews: [],
    commentEvents: [{ body: MARKERS.commitGuidelines }],
  };
  const mergeMainData: PullRequestData = {
    pull: {},
    commits: [commit("Merge branch 'main' into feature")],
    issueComments: [{ body: MARKERS.mergeMain }],
    reviewComments: [],
    reviews: [],
    commentEvents: [{ body: MARKERS.mergeMain }],
  };

  await commentOnCommitGuidelineProblems(
    github,
    "illume",
    "headlamp",
    110,
    commitGuidelineData,
  );
  assert.equal(
    await commentOnMergeMainCommit(
      github,
      "illume",
      "headlamp",
      110,
      mergeMainData,
    ),
    false,
  );
  assert.equal(created, 0);
});

test("keeps snapshot helper comments idempotent", async () => {
  let created = 0;
  const zipBytes = Buffer.from(
    "UEsDBBQAAAAIAFEsmVzc7efNIgAAACAAAAAKAAAAMF90ZXN0LnR4dAvOSywozsgvKbZSUFAwVEhLzMxJTdFRMFIoSCwuTk3hAgBQSwECFAMUAAAACABRLJlc3O3nzSIAAAAgAAAACgAAAAAAAAAAAAAAgAEAAAAAMF90ZXN0LnR4dFBLBQYAAAAAAQABADgAAABKAAAAAAA=",
    "base64",
  );
  const github = githubMock({
    issueComments: [{ body: MARKERS.snapshots }],
    jobs: [{ id: 1, name: "test", conclusion: "failure" }],
    logData: zipBytes,
    onCreateComment: () => created++,
  });

  await handleWorkflowRun(
    github,
    {
      eventName: "workflow_run",
      repo: { owner: "illume", repo: "headlamp" },
      payload: {
        workflow_run: {
          id: 1,
          conclusion: "failure",
          pull_requests: [{ number: 110 }],
        },
      },
    },
    core,
  );
  assert.equal(created, 0);
});

test("does not scan raw zip bytes when log extraction fails", async () => {
  let warned = false;
  const github = githubMock({
    logData: Buffer.from("not a zip with snapshot failed text"),
  });
  const log = await downloadJobLogs(github, "illume", "headlamp", 1, {
    info() {},
    warning() {
      warned = true;
    },
  });

  assert.equal(log, "");
  assert.equal(warned, true);
});

test("parses local and dry-run CLI arguments", () => {
  assert.deepEqual(
    parseCliArgs(["--repo", "illume/headlamp", "--pull", "110", "--dry-run"]),
    {
      repoName: "illume/headlamp",
      pullNumber: 110,
      dryRun: true,
      help: false,
    },
  );
  assert.deepEqual(parseCliArgs(["illume/headlamp/110", "--dry-run"]), {
    repoName: "illume/headlamp",
    pullNumber: 110,
    dryRun: true,
    help: false,
  });
  assert.deepEqual(
    parseCliArgs(["--pr", "https://github.com/illume/headlamp/pull/110"]),
    {
      repoName: "illume/headlamp",
      pullNumber: 110,
      dryRun: false,
      help: false,
    },
  );
  assert.deepEqual(
    parseCliArgs(["https://github.com/illume/headlamp/pull/110", "--dry-run"]),
    {
      repoName: "illume/headlamp",
      pullNumber: 110,
      dryRun: true,
      help: false,
    },
  );
  assert.deepEqual(parseCliArgs(["--help"]), {
    dryRun: false,
    help: true,
  });
  assert.deepEqual(parsePullRequestTarget("illume/headlamp/110"), {
    repoName: "illume/headlamp",
    pullNumber: 110,
  });
  assert.deepEqual(
    parsePullRequestTarget("https://github.com/illume/headlamp/pull/110"),
    {
      repoName: "illume/headlamp",
      pullNumber: 110,
    },
  );
  assert.deepEqual(localPullRequestContext("illume/headlamp", 110), {
    eventName: "pull_request_target",
    repo: { owner: "illume", repo: "headlamp" },
    payload: { pull_request: { number: 110 } },
  });
});

test("dry-run mode logs writes without mutating GitHub", async () => {
  let created = 0;
  const messages: string[] = [];
  const dryRunGithub = dryRunGitHubClient(
    githubMock({ onCreateComment: () => created++ }),
    {
      info(message: string) {
        messages.push(message);
      },
      warning() {},
    },
  );

  await dryRunGithub.rest.issues.createComment({
    owner: "illume",
    repo: "headlamp",
    issue_number: 110,
    body: SNAPSHOT_MESSAGE,
  });
  assert.equal(created, 0);
  assert.match(messages[0], /\[dry-run\] Would create issue comment/);
});
