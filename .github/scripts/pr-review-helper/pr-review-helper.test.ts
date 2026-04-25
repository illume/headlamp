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

const assert: typeof import('node:assert/strict') = require('node:assert/strict');
const test: typeof import('node:test') = require('node:test');

const {
  MERGE_MAIN_MESSAGE,
  COMMIT_GUIDELINES_MESSAGE,
  bufferFromResponseData,
  hasCommitGuidelineProblems,
  hasCommitsAfterLastCopilotCommit,
  hasFailedSnapshots,
  isMergeMainCommit,
  unzipLogArchive,
} = require('./pr-review-helper.ts');

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
function commit(message: string, authorLogin = 'contributor'): TestCommit {
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

test('detects commits after the last Copilot commit', () => {
  assert.equal(
    hasCommitsAfterLastCopilotCommit([
      commit('frontend: Add feature', 'contributor'),
      commit('frontend: Apply feedback', 'copilot'),
      commit('frontend: Update after review', 'contributor'),
    ]),
    true
  );
  assert.equal(
    hasCommitsAfterLastCopilotCommit([
      commit('frontend: Add feature', 'contributor'),
      commit('frontend: Apply feedback', 'copilot'),
    ]),
    false
  );
});

test('detects merge-main commits', () => {
  assert.equal(isMergeMainCommit(commit("Merge branch 'main' into feature")), true);
  assert.equal(isMergeMainCommit(commit('frontend: Merge table cells')), false);
});

test('detects commit guideline problems', () => {
  assert.equal(hasCommitGuidelineProblems([commit('frontend: Add PR helper')]), false);
  assert.equal(hasCommitGuidelineProblems([commit('updates the manifest')]), true);
  assert.equal(hasCommitGuidelineProblems([commit('frontend: Add PR helper\n\nFixes #123')]), true);
});

test('links the commit guidelines message to website and GitHub docs', () => {
  assert.match(COMMIT_GUIDELINES_MESSAGE, /https:\/\/headlamp\.dev\/docs\/latest\/development\/contributing\/#commit-guidelines/);
  assert.match(COMMIT_GUIDELINES_MESSAGE, /https:\/\/github\.com\/headlamp-k8s\/headlamp\/blob\/main\/docs\/contributing\.md#commit-guidelines/);
});

test('adds collapsible details to guidance comments', () => {
  assert.match(MERGE_MAIN_MESSAGE, /<details>[\s\S]*<summary>Why this matters<\/summary>/);
  assert.match(COMMIT_GUIDELINES_MESSAGE, /<details>[\s\S]*<summary>Commit guidelines<\/summary>/);
});

test('detects failed snapshot logs', () => {
  assert.equal(hasFailedSnapshots('Snapshots:   2 failed, 10 passed'), true);
  assert.equal(hasFailedSnapshots('Snapshot Summary\n › 1 snapshot obsolete'), true);
  assert.equal(hasFailedSnapshots('Tests:       12 passed'), false);
});

test('extracts GitHub job log zip archives before scanning', () => {
  const zipBytes = Buffer.from(
    'UEsDBBQAAAAIAFEsmVzc7efNIgAAACAAAAAKAAAAMF90ZXN0LnR4dAvOSywozsgvKbZSUFAwVEhLzMxJTdFRMFIoSCwuTk3hAgBQSwECFAMUAAAACABRLJlc3O3nzSIAAAAgAAAACgAAAAAAAAAAAAAAgAEAAAAAMF90ZXN0LnR4dFBLBQYAAAAAAQABADgAAABKAAAAAAA=',
    'base64'
  );

  assert.equal(hasFailedSnapshots(unzipLogArchive(bufferFromResponseData(zipBytes))), true);
});
