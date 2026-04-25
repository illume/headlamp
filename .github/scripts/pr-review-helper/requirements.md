# PR Review Helper Requirements

This file records the requirements requested during PR review helper development.

## Workflow and runtime

- Use TypeScript files for the helper and tests, not generated JavaScript files.
- Do not add a compile step for running the helper; recent Node versions should run the TypeScript helper directly.
- Type-check the helper in CI.
- Run the helper tests in CI.
- Run the workflow on a modern Ubuntu LTS runner.
- Avoid re-running the workflow on comments or reviews created by the helper itself.
- Keep `pull_request_target` fork support, but check out trusted base-branch helper code.
- Minimize token exposure during checkout by disabling persisted credentials.
- Run the helper with the Node version installed by `setup-node`, not through `actions/github-script`.

## Helper structure and documentation

- Keep the helper in its own folder with a README.
- Document and type all helper functions with TSDoc.
- Split the review behaviors into focused TypeScript modules.
- Use descriptive helper filenames that explain what each helper does.
- Put each helper's message constants at the top of that helper file.
- In the README, put the relevant filename under each behavior section header instead of only listing filenames at the top.
- Explain each automation behavior clearly and specifically in the README.
- Add a `requirements.md` file recording the requirements requested during helper development.

## Local execution and package usage

- Make the helper runnable locally.
- Use the GitHub CLI token (`gh auth token`) for local runs so comments can be made as the authenticated user.
- Accept a PR target as `OWNER/REPO/NUMBER`.
- Accept a PR target as `--repo OWNER/REPO --pull NUMBER`.
- Accept a full GitHub pull request URL as the PR target.
- Provide a dry-run mode that prints the actions the helper would take without creating comments, reviews, or review requests.
- Make the helper self-contained in its folder.
- Make the helper an npm package that can be run with `npx`.
- Add a `bin` entry in the helper `package.json`.
- Do not mark the helper package as private.
- Keep the helper's package, lockfile, and ESLint config inside the helper folder.

## Formatting and linting

- Use Prettier for formatting.
- Use ESLint for linting.
- Provide `npm run format` in the helper package.
- Provide `npm run lint` in the helper package.
- Do not modify the repository root `package.json` for helper tooling.
- Do not modify the repository root `package-lock.json` for helper tooling.
- Do not add a repository root `eslint.config.mjs`; keep any helper ESLint config in the helper folder.

## Review actions and idempotency

- Request Copilot review when contributor commits land after the latest Copilot commit.
- Request changes when Copilot review comments are still the latest PR discussion.
- Comment on merge-main commits when no other discussion exists.
- Comment on failed frontend snapshot tests.
- Comment on commit-message guideline problems.
- Ensure each helper is idempotent: running the helper twice should not create duplicate comments, reviews, review requests, or different follow-up output for the same condition.
- Use hidden markers or equivalent checks to enforce one-time comments and reviews.

## Snapshot failure handling

- GitHub job logs are ZIP archives; extract them before searching for failed snapshot text.
- Do not scan raw ZIP bytes as text when extraction fails.
- Log a warning and skip snapshot detection when log extraction fails.
- Use the frontend snapshot update command from the frontend directory: `cd frontend && npm run test -- -u`.

## Commit-message guidance

- Capitalize “Linux kernel style”.
- Keep the generated commit-guidelines message actionable.
- Avoid changing `docs/contributing.md` as part of this helper PR.
- Do not rely on unrelated documentation changes to justify helper behavior.

## Files explicitly requested not to change

- Do not change the repository root `package.json`.
- Do not change the repository root `package-lock.json`.
- Do not add or keep a repository root `eslint.config.mjs`.
- Do not change `docs/contributing.md`.
