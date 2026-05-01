---
title: Frontend
sidebar_position: 2
---

The frontend is written in Typescript and React, as well as a few other important modules like:

- Material UI
- React Router
- Redux
- Redux Sagas

## Building and running

The frontend can be quickly built using:

```bash
npm run frontend:build
```

Once built, it can be run in development mode (auto-refresh) using:

```bash
npm run frontend:start
```

This command leverages the `create-react-app`'s start script that launches
a development server for the frontend (by default at `localhost:3000`).

We use [react-query](https://tanstack.com/query/latest/docs/framework/react/overview) 
for network request, if you need the devtools for react-query, you can simply set `REACT_APP_ENABLE_REACT_QUERY_DEVTOOLS=true` in the `.env` file.

## API documentation

API documentation for TypeScript is done with [typedoc](https://typedoc.org/) and [typedoc-plugin-markdown](https://github.com/tgreyuk/typedoc-plugin-markdown), and is configured in tsconfig.json

```bash
npm run docs
```

The API output markdown is generated in docs/development/api and is not
committed to Git, but is shown on the website at
[headlamp/latest/development/api](https://headlamp.dev/docs/latest/development/api/)

## Storybook

Components can be discovered, developed, and tested inside the 'storybook'.

From within the [Headlamp](https://github.com/kubernetes-sigs/headlamp/) repo run:

```bash
npm run frontend:storybook
```

If you are adding new stories, please wrap your story components with the `TestContext` helper
component. This sets up the store, memory router, and other utilities that may be needed for
current or future stories:

```jsx
<TestContext>
  <YourComponentTheStoryIsAbout />
</TestContext>
```

## Accessibility (a11y)

### Developer console warnings and errors

axe-core is used to detect some a11y issues at runtime when running
Headlamp in developer mode. This detects more issues than testing
components via eslint or via unit tests.

Any issues found are reported in the developer console.

To enable the alert message during development, use the following:

```bash
REACT_APP_SKIP_A11Y=false npm run frontend:start
```

This shows an alert when an a11y issue is detected.

## Linting

The frontend has two lint modes that share the same ESLint base config but
differ in which rules are enforced and how strictly warnings are treated.

### `npm run lint` (local development)

Run this while you're working on changes. It is the fast, permissive mode:

```bash
cd frontend && npm run lint        # check
cd frontend && npm run lint -- --fix   # auto-fix what it can
```

From the repository root the equivalent passthroughs are:

```bash
npm run frontend:lint
npm run frontend:lint:fix
```

Local lint uses the ESLint config embedded in `frontend/package.json`
(`eslintConfig`). To keep iteration fast and avoid noise from older transitive
versions of `eslint-plugin-react-hooks` pulled in via
`plugins/headlamp-plugin`, most of the slow `react-hooks/*` rules are turned
**off** here. Only `react-hooks/rules-of-hooks` is left on as `warn` so that
the most fundamental hook misuse (e.g. calling a hook conditionally) still
shows up during everyday development.

### `npm run lint:ci` (CI / pre-commit / strict)

Run this before opening a PR, or rely on it via `husky` pre-commit and CI:

```bash
cd frontend && npm run lint:ci
```

From the repository root:

```bash
npm run frontend:lint:ci
```

`lint:ci` is the strict mode used by:

- the GitHub Actions workflow `.github/workflows/frontend.yml` (via
  `make frontend-lint`)
- the `husky` pre-commit hook through `lint-staged`
- developers verifying their work locally before pushing

It differs from `npm run lint` in two ways:

1. It points ESLint at a dedicated config, `frontend/.eslintrc.ci.cjs`, which
   `extends` the base config from `package.json` and re-enables every
   `react-hooks/*` rule as `warn`.
2. It passes `--max-warnings 0`, which makes any warning a hard failure.

Together those two changes mean that every `react-hooks/*` warning
**must be either fixed or explicitly suppressed** in source.

> **Why a separate `.eslintrc.ci.cjs` file instead of CLI overrides?**
> Earlier attempts used `npm run lint -- --rule 'name: warn'` to flip the
> rules on for CI. That triggers a zsh / macOS shell-quoting bug when the
> arguments are forwarded through `npm run … --`, which silently dropped some
> of the rules. A real config file avoids that whole class of problem.

### How the React Hooks rules are configured

Headlamp uses `eslint-plugin-react-hooks` v7+, which ships several rules
beyond the classic `rules-of-hooks` and `exhaustive-deps`. The full set
that is enforced in CI is:

| Rule                                   | What it catches |
| -------------------------------------- | --------------- |
| `react-hooks/rules-of-hooks`           | Hooks called conditionally, in loops, or outside React functions. |
| `react-hooks/exhaustive-deps`          | Missing or unnecessary dependencies in `useEffect` / `useMemo` / `useCallback`. |
| `react-hooks/component-hook-factories` | Hooks/components created from factory functions in unsafe ways. |
| `react-hooks/globals`                  | Reading mutable globals during render. |
| `react-hooks/immutability`             | Mutating props, state or hook arguments. |
| `react-hooks/purity`                   | Calling impure functions (e.g. `Date.now`, `Math.random`) during render. |
| `react-hooks/refs`                     | Reading or writing refs during render. |
| `react-hooks/set-state-in-effect`      | `setState` calls inside an effect that can cause cascading renders. |
| `react-hooks/set-state-in-render`      | `setState` calls during render. |
| `react-hooks/static-components`        | Components defined inside another component's render. |
| `react-hooks/unsupported-syntax`       | Patterns the React Compiler can't reason about. |
| `react-hooks/use-memo`                 | Misuse of `useMemo` (non-inline functions, non-array deps, …). |

For day-to-day development all of these except `rules-of-hooks` are turned
off in the base config (so `npm run lint` stays fast). They are re-enabled
as `warn` in `frontend/.eslintrc.ci.cjs` and, combined with
`--max-warnings 0`, become blocking in CI.

### Suppressing a violation

The CI run must come back clean (zero warnings). When a rule fires on code
that you do not want to (or cannot safely) refactor right now, suppress it
**inline at the point of the violation** using an ESLint disable comment.
Do **not** widen the suppression by turning the rule off in
`.eslintrc.ci.cjs` or `package.json`.

In regular TypeScript / JavaScript code, including JSX expressions inside
parentheses:

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
React.useEffect(() => {
  doSomething(item);
}, []);
```

Multiple rules on the same line can be combined:

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
React.useEffect(() => setCount(c => c + 1), []);
```

Inside JSX **child** content (between an opening and closing tag, where
`//` would be parsed as text), use the JSX comment form instead:

```tsx
<Wrapper>
  {/* eslint-disable-next-line react-hooks/static-components */}
  <ChildDefinedDuringRender />
</Wrapper>
```

Each suppression should ideally be accompanied by a short comment or
linked issue explaining why the violation is intentional, so future
contributors know whether it can be removed.

### Where each piece lives

- `frontend/package.json` — `lint`, `lint:ci`, `format`, `format-check`
  scripts and the base `eslintConfig`.
- `frontend/.eslintrc.ci.cjs` — strict CI config that re-enables the
  `react-hooks/*` rules.
- `frontend/.eslintignore` — paths excluded from linting (notably the
  gitignored copies of `frontend/src/` that `plugins/headlamp-plugin/`
  scripts create locally).
- Root `package.json` — `frontend:lint`, `frontend:lint:ci`,
  `frontend:lint:fix` passthrough scripts.
- `Makefile` — `frontend-lint` target; this is what CI invokes.
- `.github/workflows/frontend.yml` — runs `make frontend-lint` on every
  push and pull request.

## Property testing (fuzzing)

We are using [fast-check](https://fast-check.dev/) for property testing.
This is especially useful for parsers, validators, race conditions and such.
