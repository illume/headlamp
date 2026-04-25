# PR Review Helper

The PR Review Helper is a GitHub Actions and local CLI helper for lightweight pull request follow-up. It looks at PR commits, comments, reviews, and selected frontend workflow failures, then posts at most one marker-based comment or review for each condition.

`pr-review-helper.ts` is the workflow entry point and orchestration layer. `github-helpers.ts` contains shared GitHub comment/review helpers and idempotency markers.

## Request Copilot review after contributor commits

File: `request-copilot-review.ts`

When the PR has a Copilot-authored commit and one or more newer commits after it, the helper requests `copilot-pull-request-reviewer` again. This catches the case where Copilot already pushed or suggested changes, then the contributor added more commits that should be reviewed.

The check is idempotent because it first checks the current requested reviewers and does not request Copilot again when Copilot is already requested.

## Request changes for latest Copilot review comments

File: `request-changes-for-copilot-comments.ts`

When Copilot review comments exist and no issue comment, review body, or review comment was created after the newest Copilot review comment, the helper requests changes with this message:

> Thanks for this! Can you please address the open review comments?

This treats the latest Copilot review comments as still awaiting a response. The helper uses timestamps; it does not inspect GitHub's resolved-thread state.

The check is idempotent because the review body includes a hidden marker and the helper skips creating another request-changes review when that marker already exists.

## Ask contributors to rebase merge-main commits

File: `comment-on-merge-main-commit.ts`

When a PR has no comment or review discussion yet and contains a commit whose title starts with `merge` and mentions `main` or `master`, the helper posts a one-time comment asking the contributor to rebase against main. The comment includes a collapsible details section explaining that merge commits from `main` make PR history harder to review.

The check is idempotent because the comment includes a hidden marker. A second run sees the marker in the PR discussion and does not create another comment.

## Suggest frontend snapshot updates

File: `comment-on-failed-frontend-snapshots.ts`

When the `Build Frontend` workflow fails for a PR, the helper checks failed test job logs. GitHub returns these logs as a zip archive, so the helper extracts the archive and searches the plain-text logs for failed, obsolete, or mismatched snapshot text. If found, it posts a one-time comment with the frontend snapshot update command.

The check is idempotent because the comment includes a hidden marker and the helper checks existing PR comments before posting the snapshot guidance.

## Nudge on commit guideline problems

File: `comment-on-commit-guideline-problems.ts`

When a non-merge-main commit title does not match the repository commit-message guidelines, is longer than 72 characters, or includes `Fixes #NN`, the helper posts a one-time comment pointing contributors to the commit guidelines on the Headlamp website and in the GitHub docs source. The comment includes a collapsible details section with the key commit-message rules and examples.

The check is idempotent because the comment includes a hidden marker and the helper skips creating another commit-guidelines comment when that marker already exists.

## Run locally

Run the helper locally against a pull request with the GitHub CLI authenticated as the user who should post any comments:

```bash
node .github/scripts/pr-review-helper/pr-review-helper.ts --repo illume/headlamp --pull 110
```

The local command reads the token from `gh auth token`, so any comments, reviews, or review requests are made as that authenticated user.

## Dry run locally

Add `--dry-run` to see which mutating GitHub API calls the helper would make without creating comments, reviews, or review requests:

```bash
node .github/scripts/pr-review-helper/pr-review-helper.ts --repo illume/headlamp --pull 110 --dry-run
```

Dry-run mode still reads PR data from GitHub so it can report the same decisions the real run would make.

## Support pull requests from forks

The workflow uses `pull_request_target` for PR updates and checks out the trusted base branch helper code, not the fork's head commit. That lets the helper request reviews and post comments on forked PRs without running untrusted fork code with write permissions.

## Skip helper-created events

The workflow skips events where `github.actor` is `github-actions[bot]`. The helper creates comments and reviews itself, so this guard prevents the helper from starting follow-up runs for its own output.
