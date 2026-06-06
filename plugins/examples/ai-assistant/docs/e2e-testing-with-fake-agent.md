# E2E Testing with the Fake Agent

The **mock-testing-agent** simulates agent workflows — thinking steps,
tool calls, and final answers — without a real agent backend or cluster.

See also: [Mock Testing Agent README](../packages/ai-common/src/mock-testing-agent/README.md),
[Fake Model](./e2e-testing-with-fake-model.md).

## When to use which

| | mock-testing-model | mock-testing-agent |
|---|---|---|
| **Simulates** | LLM responses | Full agent workflow (thinking + tools + answer) |
| **Use case** | Test prompt/response flows | Test agent UI (progress indicators, tool rendering) |

## Quick start

```typescript
import { createMockTestingAgent } from '@headlamp-k8s/ai-common/mock-testing-agent/MockTestingAgent';

const agent = createMockTestingAgent({ speedMultiplier: 0 }); // instant
const result = await agent.run('why is my pod failing', (steps) => {
  console.log('Progress:', steps.map(s => s.label));
});
// result.answer, result.steps, result.matchedSession
```

## Built-in sessions

| Name | Trigger (substring match) | Steps |
|------|--------------------------|-------|
| `pod-troubleshooting` | "why is my pod failing" | 8 |
| `cluster-exploration` | "what is running in my cluster" | 8 |

## Custom sessions

Pass `extraSessions` at creation time (inline objects or loaded from JSON via `loadSessionsFromFile(path)`).

Each session has: `name`, `question` (substring-matched), `steps[]` (with `phase`, `label`, optional `toolCall`), and `answer`.

## Speed control

| `speedMultiplier` | Effect |
|-------------------|--------|
| `0` | Instant (tests, CI) |
| `1.0` | Real-time (default) |

## Fallback

Unrecognized questions return immediately with a generic fallback (customizable via `fallbackAnswer`) and empty steps.

## API

| Export | Description |
|--------|-------------|
| `createMockTestingAgent(options?)` | Options: `extraSessions`, `fallbackAnswer`, `speedMultiplier` |
| `loadSessionsFromFile(path)` | Load sessions from JSON (Node.js only) |
| `agent.run(question, onProgress?)` | Execute a session, returns `{ answer, steps, matchedSession }` |
| `agent.listSessions()` | List available sessions |
