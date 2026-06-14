# Mock Testing Agent

A scripted agent simulator for testing the Headlamp AI assistant's agent UI
and workflow — **no real agent backend or cluster required**.

## What it does

`createMockTestingAgent()` returns an object that simulates the full AKS agent
experience: thinking steps (init → planning → executing), tool call cycles,
and final answer delivery. It is designed to complement the `mock-testing-model`
(which provides canned LLM responses) by simulating the *agent* layer on top.

### How it differs from mock-testing-model

| | mock-testing-model | mock-testing-agent |
|---|---|---|
| **Simulates** | LLM responses | Full agent workflow |
| **Output** | Single text response | Thinking steps + tool calls + answer |
| **Use case** | Test LLM integration | Test agent UI components |
| **Progress** | None | Streams `AgentThinkingStep` callbacks |

## Scripted Sessions

Each session defines a question, an ordered sequence of thinking steps
(with optional tool calls), and a final answer. The agent matches user
questions against sessions using case-insensitive substring matching.

### Built-in Sessions

| Name | Question | Steps | Description |
|------|----------|-------|-------------|
| `pod-troubleshooting` | "why is my pod failing" | 8 | Diagnoses a CrashLoopBackOff pod |
| `cluster-exploration` | "what is running in my cluster" | 8 | Explores nodes, namespaces, workloads |

## Usage

### 1. Testing agent UI components

```typescript
import { createMockTestingAgent } from '@headlamp-k8s/ai-common/mock-testing-agent/MockTestingAgent';

const agent = createMockTestingAgent({ speedMultiplier: 0 }); // instant for tests
const result = await agent.run('why is my pod failing', (steps) => {
  // steps: AgentThinkingStep[] — render in your UI component
  console.log('Current steps:', steps);
});

console.log(result.answer);     // Markdown answer
console.log(result.steps);      // All completed AgentThinkingStep[]
console.log(result.matchedSession); // "pod-troubleshooting"
```

### 2. Custom sessions

```typescript
const agent = createMockTestingAgent({
  speedMultiplier: 0,
  extraSessions: [{
    name: 'custom-scenario',
    question: 'check my services',
    steps: [
      { phase: 'init', label: 'Model loaded', durationMs: 100 },
      { phase: 'planning', label: 'List services', durationMs: 50 },
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

### 3. Loading sessions from JSON files

```typescript
import { loadSessionsFromFile } from '@headlamp-k8s/ai-common/mock-testing-agent/MockTestingAgent';

const sessions = loadSessionsFromFile('./my-sessions.json');
const agent = createMockTestingAgent({ extraSessions: sessions });
```

### 4. Listing available sessions

```typescript
const agent = createMockTestingAgent();
console.log(agent.listSessions());
// [
//   { name: 'pod-troubleshooting', description: '...', question: 'why is my pod failing' },
//   { name: 'cluster-exploration', description: '...', question: 'what is running in my cluster' },
// ]
```

## Speed Control

The `speedMultiplier` option controls step timing:

| Value | Effect |
|-------|--------|
| `0` | Instant — no delays (best for unit tests) |
| `0.1` | 10× faster than defined durations |
| `1.0` | Real-time (default) — uses step `durationMs` as-is |
| `2.0` | Half speed — good for demos |

## API

### `createMockTestingAgent(options?)`

Returns a `MockTestingAgent` with `run()` and `listSessions()` methods.

| Option | Type | Description |
|--------|------|-------------|
| `extraSessions` | `MockAgentSession[]` | Additional sessions checked before built-ins |
| `fallbackAnswer` | `string` | Answer when no session matches |
| `speedMultiplier` | `number` | Duration multiplier (0 = instant) |

### `loadSessionsFromFile(path)`

Loads sessions from a JSON file (Node.js only). Returns `MockAgentSession[]`.

### Types

- `MockTestingAgent` — Agent interface with `run()` and `listSessions()`
- `MockAgentSession` — Complete scripted session definition
- `MockAgentStep` — Single step in a session
- `MockToolCall` — Simulated tool call details
- `MockAgentResult` — Result from `run()` with answer, steps, and matched session
