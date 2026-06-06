# E2E Testing MCP

End-to-end tests for the MCP (Model Context Protocol) integration verify that
`MCPClientCore` correctly connects to real MCP server processes, discovers
tools, executes them, and handles errors — all without manual setup.

## Overview

The MCP e2e tests live in `packages/ai-common/src/mcp/` and use a **fake MCP
server** (`test-fixtures/fake-mcp-server.mjs`) built with the official
`@modelcontextprotocol/sdk`. The fake server communicates over stdio (the same
transport used in production) and exposes two tools:

| Tool | Signature | Behaviour |
|------|-----------|-----------|
| `greet` | `greet(name: string)` | Returns `"Hello, <name>!"` |
| `add` | `add(a: number, b: number)` | Returns `{ sum: a + b }` |

The server accepts flags that alter `add`'s behaviour for negative-path testing:

| Flag | Effect |
|------|--------|
| `--slow` | `add` sleeps 2 s before responding (timeout testing) |
| `--fail` | `add` always throws an error |

## Test files

| File | What it tests |
|------|---------------|
| `mcp.e2e.test.ts` | `MCPClientCore` lifecycle, tool execution, config updates, tool state |
| `cli-mcp.e2e.test.ts` | The `headlamp-ai` CLI with MCP servers (process cleanup, multi-server) |

Both files are excluded from the normal unit-test run and only picked up by
the dedicated e2e Vitest config.

## Running the tests

```bash
cd plugins/examples/ai-assistant/packages/ai-common

# Run all e2e tests (MCP + others)
npx vitest run --config vitest.e2e.config.ts

# Run only the MCP e2e suite
npx vitest run --config vitest.e2e.config.ts src/mcp/mcp.e2e.test.ts

# Run only the CLI-with-MCP e2e suite
npx vitest run --config vitest.e2e.config.ts src/mcp/cli-mcp.e2e.test.ts
```

Each test has a 30-second timeout to allow the Node.js child process to start
up and respond.

## Test architecture

### In-memory settings provider

Tests create an `MCPSettingsProvider` that stores settings in a local variable
instead of touching the filesystem or Electron:

```typescript
function makeSettingsProvider(initial?: MCPSettings): MCPSettingsProvider {
  let settings: MCPSettings | null = initial ?? null;
  return {
    loadMCPSettings: vi.fn(() => settings),
    saveMCPSettings: vi.fn((s: MCPSettings) => { settings = s; }),
  };
}
```

### Confirmation handlers

Two helpers control whether config-change prompts are accepted:

- `autoApproveHandler()` — always returns `true` (happy path)
- `autoDenyHandler()` — always returns `false` (rejection path)

### Server settings helper

```typescript
function fakeServerSettings(flags: string[] = []): MCPSettings {
  return {
    enabled: true,
    servers: [{
      name: 'fake',
      command: 'node',
      args: [FAKE_SERVER_PATH, ...flags],
      enabled: true,
    }],
  };
}
```

## What the tests cover

### `mcp.e2e.test.ts`

1. **Lifecycle** — Initialize → discover tools (`greet`, `add`) → cleanup.
2. **Tool execution (greet)** — Executes `fake__greet` and asserts `"Hello, World!"`.
3. **Tool execution (add)** — Executes `fake__add` and asserts the correct sum.
4. **Server-side error** — Starts the server with `--fail`; verifies `executeTool` does not throw.
5. **Disabled tool** — Disables a tool via `setToolEnabled`; verifies execution is refused with an error.
6. **Usage stats** — Executes a tool twice and verifies `getToolStats` reports `usageCount: 2`.
7. **Config update (approve)** — Updates to an empty server list via `autoApproveHandler`; verifies client is removed.
8. **Config update (deny)** — Attempts a config update via `autoDenyHandler`; verifies the original config is unchanged.
9. **Reset client** — Calls `resetClient()` and verifies tools are re-discovered.
10. **Multiple servers** — Connects two independent fake servers and executes tools on each.
11. **Enable/disable toggle** — Disables a tool, verifies rejection, re-enables, verifies success.
12. **No servers** — Initializes with an empty server list; verifies `hasClient: false`.
13. **MCP disabled** — Sets `enabled: false` in settings; verifies no client is created despite servers being configured.
14. **Tool descriptions** — Verifies tool descriptions and schemas are captured from the server.

### `cli-mcp.e2e.test.ts`

1. **Single fake server** — Runs the CLI with one MCP server and verifies clean exit.
2. **MCP disabled** — Runs the CLI with `enabled: false` and verifies no hanging processes.
3. **Multiple servers** — Runs the CLI with two fake servers simultaneously.
4. **No servers** — Runs with an empty server list.

## Writing new MCP e2e tests

1. **Prefer the fake server** — It starts fast, needs no network, and supports
   `--slow` / `--fail` flags for edge-case testing.
2. **Use a temp directory** — Each test creates a `mkdtempSync` directory for
   `MCPToolStateStore` persistence and cleans it up in `afterEach`.
3. **Call `core.cleanup()`** — Always clean up the `MCPClientCore` to terminate
   child processes (the fake server runs as a Node.js subprocess).
4. **Set generous timeouts** — Server startup can take a few seconds; use
   `30_000` ms timeouts.

## Fake MCP server details

The server is at `packages/ai-common/src/mcp/test-fixtures/fake-mcp-server.mjs`
and is implemented with the official `@modelcontextprotocol/sdk`:

```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'fake-test-server', version: '1.0.0' });

server.tool('greet', 'Greet a person by name', { name: z.string() }, async ({ name }) => {
  return { content: [{ type: 'text', text: `Hello, ${name}!` }] };
});

server.tool('add', 'Add two numbers', { a: z.number(), b: z.number() }, async ({ a, b }) => {
  // --fail and --slow flags alter behaviour here
  return { content: [{ type: 'text', text: JSON.stringify({ sum: a + b }) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

You can add new tools to this server or create additional fake servers in the
same `test-fixtures/` directory for more complex test scenarios.
