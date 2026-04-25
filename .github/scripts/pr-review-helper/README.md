# PR Review Helper

The PR Review Helper is a GitHub Actions helper for lightweight pull request follow-up. It looks at PR commits, comments, reviews, and selected frontend workflow failures, then posts at most one marker-based comment or review for each condition.

## Request Copilot review after contributor commits

When the PR has a Copilot-authored commit and one or more newer commits after it, the helper requests `copilot-pull-request-reviewer` again. This catches the case where Copilot already pushed or suggested changes, then the contributor added more commits that should be reviewed.

## Request changes for latest Copilot review comments

When Copilot review comments exist and no issue comment, review body, or review comment was created after the newest Copilot review comment, the helper requests changes with this message:

> Thanks for this! Can you please address the open review comments?

This treats the latest Copilot review comments as still awaiting a response. The helper uses timestamps; it does not inspect GitHub's resolved-thread state.

## Ask contributors to rebase merge-main commits

When a PR has no comment or review discussion yet and contains a commit whose title starts with `merge` and mentions `main` or `master`, the helper posts a one-time comment asking the contributor to rebase against main. The comment includes a collapsible details section explaining that merge commits from `main` make PR history harder to review.

## Suggest frontend snapshot updates

When the `Build Frontend` workflow fails for a PR, the helper checks failed test job logs. GitHub returns these logs as a zip archive, so the helper extracts the archive and searches the plain-text logs for failed, obsolete, or mismatched snapshot text. If found, it posts a one-time comment with the frontend snapshot update command.

## Nudge on commit guideline problems

When a non-merge-main commit title does not match the repository commit-message guidelines, is longer than 72 characters, or includes `Fixes #NN`, the helper posts a one-time comment pointing contributors to the commit guidelines on the Headlamp website and in the GitHub docs source. The comment includes a collapsible details section with the key commit-message rules and examples.

## Support pull requests from forks

The workflow uses `pull_request_target` for PR updates and checks out the trusted base branch helper code, not the fork's head commit. That lets the helper request reviews and post comments on forked PRs without running untrusted fork code with write permissions.

## Skip helper-created events

The workflow skips events where `github.actor` is `github-actions[bot]`. The helper creates comments and reviews itself, so this guard prevents the helper from starting follow-up runs for its own output.
