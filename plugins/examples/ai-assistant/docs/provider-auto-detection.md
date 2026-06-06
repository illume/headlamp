# Provider Auto-Detection

The AI assistant can automatically detect available AI providers on the user's
machine — no manual API key entry required for supported providers.

## Supported providers

| Provider | Detection method | Auth mechanism |
|----------|-----------------|----------------|
| **GitHub Copilot** | `gh auth token` via GitHub CLI | CLI-refreshed token (sentinel `__GH_CLI_AUTH__`) |
| **Azure OpenAI** | `az` CLI account + resource enumeration | CLI-refreshed API key (sentinel `__AZ_CLI_AUTH__`) |
| **Ollama (local)** | HTTP probe to `localhost:11434` | No auth needed |

## Architecture

### Core module

The detection logic is in `packages/ai-common/src/providers/providerAutoDetect.ts`
and is entirely platform-agnostic. It receives a `CommandRunner` function from
the host application (e.g. Electron's `pluginRunCommand`) for executing CLI
commands.

### UI components

The React UI is in `packages/ai-ui/src/components/settings/`:

- `AutoDetectProvider.tsx` — Dialog and `useAutoDetect()` hook
- `DetectedProvidersDialog` — Renders detected providers for user confirmation
- `ModelSelector` — Integrates the "Auto Detect" button

### Flow

```
User clicks "Auto Detect"
        │
        ▼
  useAutoDetect() hook
        │
        ▼
  detectProviders()          ← ai-common (platform-agnostic)
        │
        ├── detectCopilotProvider()  → gh auth token → validate → model catalog
        ├── collectAzureOpenAIProviders()  → az account show → list accounts → deployments
        └── detectOllamaProvider()   → HTTP GET localhost:11434/api/tags
        │
        ▼
  DetectedProvidersDialog
        │
        ├── User clicks "Add"     → saveProviderConfig()
        └── User clicks "Dismiss" → dismissal key persisted
```

## Detection details

### GitHub Copilot

1. Run `gh auth token` to obtain a GitHub personal access token.
2. Validate the token against `https://api.github.com/user`.
3. Fetch available models from `https://api.githubcopilot.com/models`.
4. Select the best model based on a priority list (`claude-opus` > `gpt-5` > `claude-sonnet` > `gpt-4` > `o4` > `o3` > `o1`).
5. Store `__GH_CLI_AUTH__` as the API key sentinel — the real token is
   refreshed from the CLI at model-creation time via `refreshGitHubToken()`.

### Azure OpenAI

1. Run `az account show` to verify the user is logged in.
2. Run `az cognitiveservices account list` to find OpenAI / AIServices accounts.
3. For each account, list deployments and filter for chat-capable ones (excludes embeddings, whisper, TTS, DALL-E).
4. Fetch an API key via `az cognitiveservices account keys list`.
5. Store `__AZ_CLI_AUTH__` as the API key sentinel — refreshed via `refreshAzureOpenAIKey()`.
6. Each Azure account produces a separate `DetectedProvider`.

### Ollama (local)

1. HTTP GET to `http://localhost:11434/api/tags` with a 2-second timeout.
2. If Ollama is running and has at least one model, return the first model.
3. No auth needed — local traffic only.

## Security

- **Command allowlist**: Only `gh` and `az` are permitted. Any other command is
  rejected before execution.
- **Timeout**: All CLI commands have a 15-second timeout.
- **Sentinel values**: Real tokens are never stored in config. Instead, sentinel
  strings (`__GH_CLI_AUTH__`, `__AZ_CLI_AUTH__`) are stored. The actual token is
  fetched from the CLI only when the model is created.

## Dismissal tracking

When a user dismisses a detected provider, a **dismissal key** is persisted so
the provider is not offered again:

| Provider | Dismissal key format |
|----------|---------------------|
| GitHub Copilot | `copilot` |
| Ollama | `local` |
| Azure OpenAI | `azure:<accountName>` |

Dismissal keys are persisted by the host application and passed to
`detectProviders()` on subsequent calls.

## Deduplication

Providers already saved in the user's configuration are automatically excluded:

- **Copilot / Ollama**: Skipped if any provider with the same `providerId` exists.
- **Azure**: Skipped if the account name or endpoint matches an existing config.

## API

### `detectProviders(existingProviders, dismissedKeys, commandRunner)`

Main entry point. Runs all detection checks in parallel and returns an array of
`DetectedProvider` objects that are not already configured or dismissed.

```typescript
const detected = await detectProviders(
  existingConfigs,     // StoredProviderConfig[]
  dismissedKeys,       // string[]
  electronCommandRunner // CommandRunner | null
);
```

### `DetectedProvider`

```typescript
interface DetectedProvider {
  providerId: string;          // 'copilot' | 'azure' | 'local'
  source: string;              // 'GitHub CLI' | 'Azure CLI' | 'Ollama'
  config: Record<string, any>; // Provider config with sentinel values
  displayName: string;         // Human-readable label
}
```

### Individual detection functions

| Function | Purpose |
|----------|---------|
| `detectGitHubToken(runner)` | Get token from `gh auth token` |
| `validateGitHubToken(token)` | Check token against GitHub API |
| `detectCopilotChatModels(token)` | Fetch Copilot model catalog |
| `pickBestCopilotChatModel(models)` | Select best model by priority |
| `detectCopilotProvider(runner)` | Full Copilot detection flow |
| `refreshGitHubToken(runner)` | Re-fetch token at model-creation time |
| `detectOllamaProvider()` | Detect local Ollama instance |
| `collectAzureOpenAIProviders(runner, skipNames, skipEndpoints)` | Enumerate all Azure OpenAI accounts |
| `refreshAzureOpenAIKey(rg, name, runner)` | Re-fetch Azure API key |
| `dismissalKey(provider)` | Compute dismissal key for a provider |

## Tests

Unit tests are in:
- `packages/ai-common/src/providers/providerAutoDetect.test.ts` — Core detection logic, token validation, model selection, dismissal keys
- `packages/ai-ui/src/components/settings/AutoDetectProvider.test.ts` — UI orchestration, dialog rendering

Run tests:

```bash
cd plugins/examples/ai-assistant/packages/ai-common
npx vitest run src/providers/providerAutoDetect.test.ts

cd plugins/examples/ai-assistant/packages/ai-ui
npx vitest run src/components/settings/AutoDetectProvider.test.ts
```
