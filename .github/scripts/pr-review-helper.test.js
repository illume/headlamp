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

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  hasCommitGuidelineProblems,
  hasCommitsAfterLastCopilotCommit,
  hasFailedSnapshots,
  isMergeMainCommit,
} = require('./pr-review-helper');

function commit(message, authorLogin = 'contributor') {
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

test('detects failed snapshot logs', () => {
  assert.equal(hasFailedSnapshots('Snapshots:   2 failed, 10 passed'), true);
  assert.equal(hasFailedSnapshots('Snapshot Summary\n › 1 snapshot obsolete'), true);
  assert.equal(hasFailedSnapshots('Tests:       12 passed'), false);
});
