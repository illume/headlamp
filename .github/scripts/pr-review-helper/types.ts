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

export type GitHubUser = string | { login?: string | null } | null | undefined;

export type CommitIdentity = {
  name?: string | null;
  email?: string | null;
};

export type PullRequestCommit = {
  author?: GitHubUser;
  committer?: GitHubUser;
  commit?: {
    message?: string | null;
    author?: CommitIdentity | null;
    committer?: CommitIdentity | null;
  } | null;
};

export type CommentLike = {
  body?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
  user?: GitHubUser;
};

export type PullRequest = {
  requested_reviewers?: GitHubUser[] | null;
};

export type WorkflowRunJob = {
  id: number;
  conclusion?: string | null;
  name?: string | null;
};

export type WorkflowRunPullRequest = {
  number: number;
};

export type WorkflowRunPayload = {
  id: number;
  conclusion?: string | null;
  pull_requests?: WorkflowRunPullRequest[];
};

export type ActionContext = {
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

export type Core = {
  info(message: string): void;
  warning(message: string): void;
};

export type GitHubClient = {
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

export type PullRequestData = {
  pull: PullRequest;
  commits: PullRequestCommit[];
  issueComments: CommentLike[];
  reviewComments: CommentLike[];
  reviews: CommentLike[];
  commentEvents: CommentLike[];
};
