# Mock Testing Model

A canned-response LLM for automated testing, CI pipelines, and scripted demos
of the Headlamp AI assistant — **no API keys or network access required**.

## What it does

`createMockTestingModel()` returns a LangChain `BaseChatModel` that matches
user prompts against a set of fixture files and returns pre-written responses.
It is a drop-in replacement for any real provider (OpenAI, Anthropic, etc.) in
the `LangChainManager`'s model slot.

### Two modes

| Mode | When to use | How it works |
|------|-------------|--------------|
| **Template matching** (default) | Unit tests, integration tests, evals | Each prompt is matched against fixture patterns; the best match wins. |
| **Sequence playback** | Demos, walkthroughs, presentations | Responses are returned in order from a named sequence, ignoring prompt content. |

## Template variables

Fixture prompts and responses can contain `<<variable>>` placeholders.
The `<<…>>` syntax was chosen to avoid conflicts with Mustache (`{{…}}`),
Go templates, Jinja, and other templating languages that commonly appear in
Kubernetes YAML or code snippets.

```json
{
  "prompt": "What is a <<resource>>?",
  "response": "A **<<resource>>** is a Kubernetes resource managed by the API server."
}
```

When a user asks *"What is a Pod?"*, the model captures `resource = "Pod"` and
returns *"A **Pod** is a Kubernetes resource managed by the API server."*

Matching uses plain string splitting — no regex — so it is easy to understand
and debug.

## Fixture file format

Fixture files live in the `fixtures/` subdirectory (or any custom directory you
point to). Each `.json` file is either:

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
  "name": "cluster-exploration-demo",
  "description": "Walkthrough of exploring a cluster",
  "sequence": [
    { "prompt": "Hello", "response": "Hi! …" },
    { "prompt": "What pods are running?", "response": "Here are the pods …" },
    { "prompt": "Scale nginx to 5", "response": "Scaled to 5 replicas." }
  ]
}
```

Sequences play back in order — every call returns the next response regardless
of the actual prompt. After the last turn, it wraps around.

## Use cases

### 1. Automated tests (unit / integration / CI)

Run the AI assistant plugin's tests without any real LLM provider:

```typescript
import { createMockTestingModel } from '@headlamp-k8s/ai/mock-testing-model';

const model = createMockTestingModel();
const result = await model.invoke([new HumanMessage('What is a Pod?')]);
// result.content → "A **Pod** is a Kubernetes resource …"
```

### 2. Evals

Provide a deterministic baseline for evaluation frameworks. Because responses
are fixed, you can assert exact output and measure retrieval/formatting without
LLM variance:

```typescript
const model = createMockTestingModel({
  extraFixtures: [
    { prompt: 'Summarize my cluster', response: 'You have 3 nodes and 12 pods.' },
  ],
});
```

### 3. Demos and presentations

Play back a scripted conversation sequence for live demos:

```typescript
import { createMockTestingModel, listAvailableSequences } from '@headlamp-k8s/ai/mock-testing-model';

// See what sequences are available
console.log(listAvailableSequences());
// → [{ name: 'cluster-exploration-demo', description: '…', turns: 6 }]

// Create a model that plays back the sequence in order
const model = createMockTestingModel({ sequenceName: 'cluster-exploration-demo' });
```

### 4. Playwright / E2E tests with KWOK

Combine with a KWOK cluster (lightweight fake Kubernetes) to test the full
Headlamp AI assistant end-to-end without real infrastructure:

1. Start a KWOK cluster: `kwokctl create cluster`
2. Configure the AI assistant plugin to use `mock-testing-model` as the provider
3. Run Playwright tests that interact with the chat UI and assert responses

### 5. Plugin development

Develop and iterate on AI assistant UI components without burning API credits
or needing network access.

## API

### `createMockTestingModel(options?)`

Returns a `BaseChatModel` instance.

| Option | Type | Description |
|--------|------|-------------|
| `extraFixtures` | `FixtureEntry[]` | Additional entries checked before built-ins |
| `fixturesDir` | `string` | Path to directory of extra `.json` fixture files |
| `fallbackResponse` | `string` | Response when nothing matches (default: generic message) |
| `sequenceName` | `string` | Name of a sequence to play back in order |
| `extraSequences` | `FixtureSequence[]` | Additional named sequences |

### `listAvailableSequences(fixturesDir?, extraSequences?)`

Returns `{ name, description, turns }[]` for all available sequences.

### `matchTemplate(input, template)`

Low-level: matches a single input string against a `<<var>>` template.
Returns extracted variables or `undefined`.

### `fillTemplate(template, vars)`

Low-level: substitutes `<<var>>` placeholders with values from a map.
