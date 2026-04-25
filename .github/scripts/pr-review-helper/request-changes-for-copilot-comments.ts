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

import type { CommentLike, GitHubClient, PullRequestData } from './types.ts';

const { MARKERS, requestChangesOnce } = require('./github-helpers.ts');
const { isCopilotUser } = require('./request-copilot-review.ts');

const COPILOT_COMMENTS_MESSAGE =
  'Thanks for this! Can you please address the open review comments?';

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
 * Requests changes when Copilot review comments are still the latest PR discussion.
 *
 * @param github - Authenticated GitHub client from actions/github-script.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param pullNumber - Pull request number.
 * @param data - Pull request data collected by the orchestrator.
 */
async function requestChangesForLatestCopilotComments(
  github: GitHubClient,
  owner: string,
  repo: string,
  pullNumber: number,
  data: PullRequestData
): Promise<void> {
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
}

module.exports = {
  COPILOT_COMMENTS_MESSAGE,
  hasCommentsAfter,
  latestCopilotReviewCommentAt,
  requestChangesForLatestCopilotComments,
};
