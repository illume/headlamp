# E2E Testing with the Fake Model

The **mock-testing-model** is a canned-response `BaseChatModel` that matches
user prompts against fixture files and returns pre-written responses — no API
keys, network access, or real LLM provider required. It is a drop-in
replacement for any real provider in the LangChain pipeline.

For full API documentation see the
[Mock Testing Model README](../packages/ai-common/src/mock-testing-model/README.md).

## Why use it for e2e testing

- **Deterministic**: Same prompt → same response, every time.
- **Fast**: No network latency, no token metering.
- **Offline**: Works in CI environments with no internet access.
- **Controllable**: Custom fixtures let you script exact scenarios.

## Quick start

### 1. Programmatic usage in tests

```typescript
import { createMockTestingModel } from '@headlamp-k8s/ai-common/mock-testing-model/MockTestingModel';
import { HumanMessage } from '@langchain/core/messages';

const model = createMockTestingModel();
const result = await model.invoke([new HumanMessage('What is a Pod?')]);
// result.content → "A **Pod** is a Kubernetes resource …"
```

### 2. Custom fixtures for your test scenarios

```typescript
const model = createMockTestingModel({
  extraFixtures: [
    {
      prompt: 'How many replicas does <<name>> have?',
      response: 'The deployment **<<name>>** has 3 replicas.',
    },
  ],
});

const result = await model.invoke([new HumanMessage('How many replicas does nginx have?')]);
// result.content → "The deployment **nginx** has 3 replicas."
```

### 3. Sequence playback for scripted e2e flows

```typescript
const model = createMockTestingModel({
  sequenceName: 'cluster-exploration-demo',
});

// Each call returns the next response in the sequence, regardless of input
const r1 = await model.invoke([new HumanMessage('anything')]);
const r2 = await model.invoke([new HumanMessage('anything')]);
// r1, r2 contain successive responses from the named sequence
```

## Template matching

Fixtures use `<<variable>>` placeholders (not `{{…}}` to avoid conflicts with
Go/Jinja/Mustache templates in Kubernetes YAML):

```json
[
  {
    "prompt": "What is a <<resource>>?",
    "response": "A **<<resource>>** is a Kubernetes resource managed by the API server."
  }
]
```

**Matching rules:**
1. **Exact match first** — The full input (trimmed) must match the template.
2. **Substring match second** — If no exact match, the template is searched as a
   substring of the input. This handles cases where the LLM pipeline adds
   system-prompt context around the user message.

## Fixture search order

When a prompt is received, the model checks fixtures in this order:

1. `extraFixtures` (passed at creation time)
2. Files from `fixturesDir` (a directory of `.json` files)
3. Built-in fixtures (shipped with the library)

If nothing matches, a generic fallback response is returned (customizable via
`fallbackResponse`).

## Fixture file format

Fixture files are `.json` files in a directory. Each file contains either:

### Individual entries (array)

```json
[
  { "prompt": "Hello", "response": "Hi! How can I help?" },
  { "prompt": "What is a <<resource>>?", "response": "A <<resource>> is …" }
]
```

### Conversation sequence (object)

```json
{
  "name": "my-demo",
  "description": "A walkthrough scenario",
  "sequence": [
    { "prompt": "Hello", "response": "Welcome!" },
    { "prompt": "Show pods", "response": "Here are the pods…" }
  ]
}
```

## Using with the CLI

The `headlamp-ai` CLI supports the mock-testing-model as a provider. Create a
config file and pass it via `--config`:

```json
{
  "provider": "mock-testing-model",
  "config": {},
  "mcp": { "enabled": false, "servers": [] }
}
```

```bash
npx tsx packages/ai-cli/src/cli.ts --config /path/to/config.json "What is a Pod?"
```

## Using in the Headlamp UI

1. Open the AI Assistant panel.
2. Go to **Settings** → **Add Provider** → **Mock Testing Model**.
3. Optionally set a **Demo Sequence** name or **Custom Fixtures Directory**.
4. Save and start chatting.

See [Testing with Mock Model](./testing-with-mock-model.md) for a full
walkthrough with screenshots and KWOK cluster setup.

## Full e2e test setup with KWOK

For a complete end-to-end test that includes a simulated Kubernetes cluster:

1. **Create a KWOK cluster**: `kwokctl create cluster --name test`
2. **Deploy workloads**: `kubectl create deployment nginx --image=nginx --replicas=3`
3. **Configure the AI assistant** to use `mock-testing-model` as the provider.
4. **Run Playwright tests** that interact with the chat UI and assert responses.

The mock-testing-model ensures tests are:
- Reproducible (no LLM variance)
- Fast (no API calls)
- Free (no token costs)

## API reference

### `createMockTestingModel(options?)`

Returns a `BaseChatModel` instance.

| Option | Type | Description |
|--------|------|-------------|
| `extraFixtures` | `FixtureEntry[]` | Additional entries checked before built-ins |
| `fixturesDir` | `string` | Path to directory of extra `.json` fixture files |
| `fallbackResponse` | `string` | Response when nothing matches |
| `sequenceName` | `string` | Name of a sequence to play back in order |
| `extraSequences` | `FixtureSequence[]` | Additional named sequences |

### `listAvailableSequences(fixturesDir?, extraSequences?)`

Returns `{ name, description, turns }[]` for all available sequences (built-in + custom).

### `loadFixturesFromDirectory(dir)`

Loads all `.json` fixture files from a directory (Node.js only). Returns
`{ entries: FixtureEntry[], sequences: FixtureSequence[] }`.

### `matchTemplate(input, template)` / `fillTemplate(template, vars)`

Low-level helpers for template matching and substitution. Useful for building
custom fixture matching logic.
