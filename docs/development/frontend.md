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

We use [RTK Query](https://redux-toolkit.js.org/rtk-query/overview) (from Redux Toolkit) for network requests and caching.

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

### Storybook Snapshot Tests and MSW

Storybook snapshot tests capture the rendered HTML of each story and compare it against
a stored snapshot file. Stories that fetch data via MSW (Mock Service Worker) handlers
need special handling because RTK Query fetches data asynchronously.

**Automatic MSW detection:** The test helper (`storybook-test-helper.ts`) automatically
detects stories with MSW handlers and waits for async data to load before snapshotting.
It does this by:

1. Tracking all MSW requests and waiting for them to complete
2. Auto-deriving a `waitForText` value from MSW handler responses using
   `deriveWaitForTextFromMSW()` — it extracts `items[0].metadata.name` (list pattern)
   or `metadata.name` (detail pattern) from GET handler responses
3. Waiting for that text to appear in the DOM before taking the snapshot

**For most stories with MSW handlers, no extra configuration is needed.**
The auto-derivation handles list views, detail views, and other standard
Kubernetes resource patterns.

**Explicit waitForText:** If auto-derivation doesn't work for your story
(e.g., the component doesn't render the resource name), you can specify
text to wait for explicitly:

```tsx
export const MyStory = Template.bind({});
MyStory.parameters = {
  storyshots: { waitForText: 'expected-text-in-rendered-output' },
  msw: {
    handlers: { /* ... */ },
  },
};
```

**Disabling snapshots:** If a story produces non-deterministic output that
cannot be stabilized, disable its snapshot test:

```tsx
// Disable for entire story file (in default export)
export default {
  parameters: {
    storyshots: { disable: true },
  },
} as Meta;

// Or disable for a specific story
MyStory.parameters = {
  storyshots: { disable: true },
};
```

**Tips for stable snapshots:**
- All API calls in MSW-backed stories must have handlers — unhandled requests fail the test
- MuiTouchRipple elements are automatically stripped from snapshots (non-deterministic)
- Recharts IDs and React `useId` values are normalized automatically
- Snapshots must be regenerated with Node.js 20.x (matching CI)

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

## Property testing (fuzzing)

We are using [fast-check](https://fast-check.dev/) for property testing.
This is especially useful for parsers, validators, race conditions and such.
