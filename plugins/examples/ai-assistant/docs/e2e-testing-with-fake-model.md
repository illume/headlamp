# E2E Testing with the Fake Model

The **mock-testing-model** is a canned-response `BaseChatModel` that matches
user prompts against fixture files — no API keys, network, or real LLM required.
Drop-in replacement for any LangChain provider.

See also: [Mock Testing Model README](../packages/ai-common/src/mock-testing-model/README.md),
[KWOK walkthrough](./testing-with-mock-model.md).

## Quick start

```typescript
import { createMockTestingModel } from '@headlamp-k8s/ai-common/mock-testing-model/MockTestingModel';
const model = createMockTestingModel();
const result = await model.invoke([new HumanMessage('What is a Pod?')]);
```

Custom fixtures and sequence playback:

```typescript
// Custom fixtures — <<variable>> placeholders are captured and substituted
const model = createMockTestingModel({
  extraFixtures: [
    { prompt: 'How many replicas does <<name>> have?',
      response: 'The deployment **<<name>>** has 3 replicas.' },
  ],
});

// Sequence playback — each call returns the next canned response
const model = createMockTestingModel({ sequenceName: 'cluster-exploration-demo' });
```

## Template matching

Fixtures use `<<variable>>` placeholders (avoids conflicts with Go/Jinja/Mustache `{{…}}`).

Matching order: exact match → substring match → fallback response.

## Fixture search order

1. `extraFixtures` (passed at creation time)
2. `fixturesDir` (directory of `.json` files)
3. Built-in fixtures

## Fixture file format

Array of entries, or a named conversation sequence:

```json
[{ "prompt": "Hello", "response": "Hi!" }]
```

```json
{ "name": "my-demo", "sequence": [{ "prompt": "Hello", "response": "Welcome!" }] }
```

## CLI usage

```bash
npx tsx packages/ai-cli/src/cli.ts --config config.json "What is a Pod?"
```

Where `config.json` sets `"provider": "mock-testing-model"`.

## API

| Export | Description |
|--------|-------------|
| `createMockTestingModel(options?)` | Returns a `BaseChatModel`. Options: `extraFixtures`, `fixturesDir`, `fallbackResponse`, `sequenceName`, `extraSequences` |
| `listAvailableSequences()` | Lists all available sequences |
| `loadFixturesFromDirectory(dir)` | Loads `.json` fixture files (Node.js only) |
| `matchTemplate(input, template)` | Template matching helper |
