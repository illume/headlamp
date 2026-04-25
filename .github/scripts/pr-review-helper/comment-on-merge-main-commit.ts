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

import type { GitHubClient, PullRequestCommit, PullRequestData } from './types.ts';

const { MARKERS, commentOnce } = require('./github-helpers.ts');

const MERGE_MAIN_MESSAGE = [
  'can you please rebase against main to remove the merge main commit?',
  '',
  '<details>',
  '<summary>Why this matters</summary>',
  '',
  'Merge commits from `main` make the PR history harder to review. Please rebase your branch on top of the latest `main` instead, then update the PR with the rebased commits.',
  '',
  '</details>',
].join('\n');

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
 * Comments once when an otherwise undiscussed PR contains a merge-main commit.
 *
 * @param github - Authenticated GitHub client from actions/github-script.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param pullNumber - Pull request number.
 * @param data - Pull request data collected by the orchestrator.
 * @returns True when this check posted a comment and no later checks should run.
 */
async function commentOnMergeMainCommit(
  github: GitHubClient,
  owner: string,
  repo: string,
  pullNumber: number,
  data: PullRequestData
): Promise<boolean> {
  if (data.commentEvents.length !== 0 || !data.commits.some(isMergeMainCommit)) {
    return false;
  }

  await commentOnce(
    github,
    owner,
    repo,
    pullNumber,
    data.issueComments,
    MARKERS.mergeMain,
    MERGE_MAIN_MESSAGE
  );
  return true;
}

module.exports = {
  MERGE_MAIN_MESSAGE,
  commentOnMergeMainCommit,
  isMergeMainCommit,
};
