# E2E Testing with the Fake Agent

The **mock-testing-agent** simulates the full agent experience — thinking steps,
tool call cycles, and final answer delivery — without a real agent backend or
Kubernetes cluster. It complements the [mock-testing-model](./e2e-testing-with-fake-model.md)
(which provides canned LLM responses) by simulating the *agent* layer on top.

For full API documentation see the
[Mock Testing Agent README](../packages/ai-common/src/mock-testing-agent/README.md).

## Mock-testing-model vs mock-testing-agent

| | mock-testing-model | mock-testing-agent |
|---|---|---|
| **Simulates** | LLM responses | Full agent workflow |
| **Output** | Single text response | Thinking steps + tool calls + answer |
| **Use case** | Test LLM integration | Test agent UI components |
| **Progress** | None | Streams `AgentThinkingStep` callbacks |

Use the **mock-testing-model** when you need to test prompt/response flows.
Use the **mock-testing-agent** when you need to test the agent UI (thinking
indicators, tool call rendering, multi-step progress).

## Quick start

```typescript
import { createMockTestingAgent } from '@headlamp-k8s/ai-common/mock-testing-agent/MockTestingAgent';

const agent = createMockTestingAgent({ speedMultiplier: 0 }); // instant for tests

const result = await agent.run('why is my pod failing', (steps) => {
  // steps: AgentThinkingStep[] — updated after each step
  console.log('Progress:', steps.map(s => s.label));
});

console.log(result.answer);         // Final markdown answer
console.log(result.steps);          // All completed AgentThinkingStep[]
console.log(result.matchedSession); // "pod-troubleshooting"
```

## Built-in sessions

The agent ships with built-in scripted sessions:

| Name | Question pattern | Steps | Description |
|------|-----------------|-------|-------------|
| `pod-troubleshooting` | "why is my pod failing" | 8 | Diagnoses a CrashLoopBackOff pod |
| `cluster-exploration` | "what is running in my cluster" | 8 | Explores nodes, namespaces, workloads |

Sessions are matched by **case-insensitive substring** — any question
containing "why is my pod failing" will trigger the `pod-troubleshooting`
session.

## Session anatomy

Each session defines:

```typescript
interface MockAgentSession {
  name: string;           // Short identifier
  description?: string;   // Human-readable description
  question: string;       // Question pattern (substring match)
  steps: MockAgentStep[]; // Ordered sequence of thinking steps
  answer: string;         // Final answer (markdown)
}
```

Each step has a **phase** (`init`, `planning`, or `executing`) and an optional
**tool call**:

```typescript
interface MockAgentStep {
  phase: 'init' | 'planning' | 'executing';
  label: string;            // UI display text
  toolCall?: MockToolCall;  // Optional simulated tool execution
  durationMs?: number;      // Simulated duration (default: 100ms)
}

interface MockToolCall {
  tool: string;       // e.g. "call_kubectl"
  input: string;      // Simulated input
  output: string;     // Simulated output
  durationMs?: number;
}
```

## Custom sessions

### Inline

```typescript
const agent = createMockTestingAgent({
  speedMultiplier: 0,
  extraSessions: [{
    name: 'check-services',
    question: 'check my services',
    steps: [
      { phase: 'init', label: 'Model loaded', durationMs: 100 },
      { phase: 'planning', label: 'Planning service check', durationMs: 50 },
      {
        phase: 'executing',
        label: 'Running kubectl get svc',
        toolCall: {
          tool: 'call_kubectl',
          input: 'get svc -A',
          output: 'NAME         TYPE        CLUSTER-IP   PORT(S)\nkubernetes   ClusterIP   10.96.0.1    443/TCP',
          durationMs: 200,
        },
        durationMs: 200,
      },
    ],
    answer: 'You have 1 service: kubernetes (ClusterIP).',
  }],
});
```

### From JSON files

```typescript
import { loadSessionsFromFile } from '@headlamp-k8s/ai-common/mock-testing-agent/MockTestingAgent';

const sessions = loadSessionsFromFile('./my-sessions.json');
const agent = createMockTestingAgent({ extraSessions: sessions });
```

JSON file format (array of sessions or a single session object):

```json
[
  {
    "name": "my-scenario",
    "question": "check deployments",
    "steps": [
      { "phase": "init", "label": "Starting agent" },
      { "phase": "executing", "label": "Listing deployments" }
    ],
    "answer": "Found 3 deployments in the default namespace."
  }
]
```

## Speed control

The `speedMultiplier` option controls how fast steps are simulated:

| Value | Effect | Use case |
|-------|--------|----------|
| `0` | Instant — no delays | Unit tests, CI |
| `0.1` | 10× faster than defined durations | Fast integration tests |
| `1.0` | Real-time (default) | Interactive testing |
| `2.0` | Half speed | Demos, presentations |

## Testing agent UI components

The mock agent is designed for testing UI components that render agent progress:

```typescript
import { createMockTestingAgent } from '@headlamp-k8s/ai-common/mock-testing-agent/MockTestingAgent';

// In your test:
const agent = createMockTestingAgent({ speedMultiplier: 0 });
const stepsReceived: AgentThinkingStep[][] = [];

const result = await agent.run('why is my pod failing', (steps) => {
  stepsReceived.push([...steps]);
});

// Assert the UI received the expected progress updates
expect(stepsReceived.length).toBeGreaterThan(0);
expect(result.matchedSession).toBe('pod-troubleshooting');
expect(result.steps.every(s => s.status === 'completed')).toBe(true);
```

## Listing available sessions

```typescript
const agent = createMockTestingAgent();
const sessions = agent.listSessions();
// [
//   { name: 'pod-troubleshooting', description: '...', question: 'why is my pod failing' },
//   { name: 'cluster-exploration', description: '...', question: 'what is running in my cluster' },
// ]
```

## Fallback behaviour

When no session matches the input question, the agent returns immediately with
a generic fallback answer and an empty steps array:

```typescript
const result = await agent.run('unrecognized question');
expect(result.matchedSession).toBeNull();
expect(result.steps).toHaveLength(0);
expect(result.answer).toContain('mock testing agent');
```

The fallback answer can be customized via the `fallbackAnswer` option.

## API reference

### `createMockTestingAgent(options?)`

Returns a `MockTestingAgent` with `run()` and `listSessions()` methods.

| Option | Type | Description |
|--------|------|-------------|
| `extraSessions` | `MockAgentSession[]` | Additional sessions checked before built-ins |
| `fallbackAnswer` | `string` | Answer when no session matches |
| `speedMultiplier` | `number` | Duration multiplier (0 = instant) |

### `loadSessionsFromFile(path)`

Loads sessions from a JSON file (Node.js only). Returns `MockAgentSession[]`.
