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

import type { CommentLike, GitHubClient } from './types.ts';

/** Hidden markers used to keep helper comments and reviews idempotent. */
const MARKERS = {
  mergeMain: '<!-- headlamp-pr-helper:merge-main -->',
  copilotComments: '<!-- headlamp-pr-helper:copilot-comments -->',
  snapshots: '<!-- headlamp-pr-helper:snapshots -->',
  commitGuidelines: '<!-- headlamp-pr-helper:commit-guidelines -->',
};

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
 * Posts an issue comment if the helper has not already posted the same marker.
 *
 * @param github - Authenticated GitHub client.
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
 * Requests changes on a pull request if the helper has not already posted the same marker.
 *
 * @param github - Authenticated GitHub client.
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

module.exports = {
  MARKERS,
  commentOnce,
  commentsFromReviews,
  hasMarker,
  requestChangesOnce,
  withMarker,
};
