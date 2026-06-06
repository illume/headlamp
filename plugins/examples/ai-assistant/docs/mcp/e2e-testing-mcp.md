# E2E Testing MCP

E2E tests verify `MCPClientCore` against real MCP server processes over stdio.

## Fake MCP server

Source: `packages/ai-common/src/mcp/test-fixtures/fake-mcp-server.mjs`

Built with `@modelcontextprotocol/sdk`. Exposes two tools over stdio:

| Tool | Behaviour |
|------|-----------|
| `greet(name)` | Returns `"Hello, <name>!"` |
| `add(a, b)` | Returns `{ sum: a + b }` |

Flags: `--slow` (2 s delay on `add`), `--fail` (`add` always throws).

## Test files

| File | Scope |
|------|-------|
| `mcp.e2e.test.ts` | `MCPClientCore` lifecycle, tool execution, config updates, tool state (14 tests) |
| `cli-mcp.e2e.test.ts` | CLI with MCP servers: process cleanup, multi-server (4 tests) |

Excluded from normal unit-test runs; requires the e2e Vitest config.

## Running

```bash
cd plugins/examples/ai-assistant/packages/ai-common
npx vitest run --config vitest.e2e.config.ts                          # all e2e
npx vitest run --config vitest.e2e.config.ts src/mcp/mcp.e2e.test.ts  # MCP only
```

## Test patterns

- **In-memory `MCPSettingsProvider`** — stores settings in a local variable (no filesystem/Electron).
- **Confirmation handlers** — `autoApproveHandler()` and `autoDenyHandler()` control config-change prompts.
- **Temp directories** — each test creates a `mkdtempSync` dir for `MCPToolStateStore` and cleans up in `afterEach`.
- **Always call `core.cleanup()`** — terminates MCP child processes.
- **30 s timeouts** — server startup can take a few seconds.
