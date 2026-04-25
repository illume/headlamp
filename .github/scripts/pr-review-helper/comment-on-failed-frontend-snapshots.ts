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

import type { ActionContext, CommentLike, Core, GitHubClient, WorkflowRunJob } from './types.ts';

const SNAPSHOT_MESSAGE =
  'You might need to update the frontend test snapshots. Use `cd frontend && npm run test -- -u`';

const fs: typeof import('node:fs') = require('node:fs');
const os: typeof import('node:os') = require('node:os');
const path: typeof import('node:path') = require('node:path');
const childProcess: typeof import('node:child_process') = require('node:child_process');

const { MARKERS, commentOnce } = require('./github-helpers.ts');

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
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Downloads and unzips the logs for a workflow job.
 *
 * @param github - Authenticated GitHub client.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param jobId - Workflow job id.
 * @param core - GitHub Actions core logger.
 * @returns Plain-text log contents.
 */
async function downloadJobLogs(
  github: GitHubClient,
  owner: string,
  repo: string,
  jobId: number,
  core: Core
): Promise<string> {
  const response = await github.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs', {
    owner,
    repo,
    job_id: jobId,
  });

  const logBytes = bufferFromResponseData(response.data);
  try {
    return unzipLogArchive(logBytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.warning(`Failed to extract logs for job ${jobId}; skipping snapshot detection: ${message}`);
    return '';
  }
}

/**
 * Handles a failed frontend workflow run and comments when failed snapshots are found.
 *
 * @param github - Authenticated GitHub client.
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
    const log = await downloadJobLogs(github, owner, repo, job.id, core);
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

module.exports = {
  SNAPSHOT_MESSAGE,
  bufferFromResponseData,
  downloadJobLogs,
  handleWorkflowRun,
  hasFailedSnapshots,
  unzipLogArchive,
};
