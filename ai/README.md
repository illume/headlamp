# @headlamp-k8s/ai

Shared AI assistant, MCP (Model Context Protocol), and LangChain library for Headlamp.

This library provides the core AI infrastructure used by both the Headlamp desktop app (Electron) and the ai-assistant plugin. It also includes a CLI for querying AI models from the command line.

## CLI

The `headlamp-ai` CLI lets you query AI models from the command line using the same configuration as the Headlamp app and ai-assistant plugin.

The CLI automatically discovers config from the Headlamp app's data directory:
- **Linux:** `~/.config/Headlamp/`
- **macOS:** `~/Library/Application Support/Headlamp/`
- **Windows:** `%APPDATA%/Headlamp/`

It reads `headlamp-ai.json` (AI provider config) and `mcp-tools-settings.json` (MCP servers) from this directory, so MCP servers configured in the app are available on the CLI too.

### Quick Start

```bash
# Build the library
cd ai && npm install && npm run build

# Query with CLI flags
npx headlamp-ai --provider openai --api-key sk-... "What is a Kubernetes Pod?"

# Or use environment variables
export HEADLAMP_AI_PROVIDER=openai
export HEADLAMP_AI_API_KEY=sk-...
npx headlamp-ai "Explain Kubernetes services"

# Or use a config file
npx headlamp-ai --config ./ai-config.json "List common kubectl commands"

# Or place config in the Headlamp app's data directory
# (e.g. ~/.config/Headlamp/headlamp-ai.json on Linux)

# Interactive chat mode
npx headlamp-ai -i --provider anthropic --api-key sk-ant-...

# Pipe from stdin
echo "What is a DaemonSet?" | npx headlamp-ai --provider openai --api-key sk-...
```

### Config File

The config file uses the same format as the ai-assistant plugin:

```json
{
  "provider": "openai",
  "config": {
    "apiKey": "sk-...",
    "model": "gpt-4o"
  },
  "mcp": {
    "enabled": true,
    "servers": [
      {
        "name": "my-mcp-server",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-everything"],
        "enabled": true
      }
    ]
  }
}
```

### Supported Providers

| Provider | ID | Required Config |
|----------|------|----------------|
| OpenAI | `openai` | `apiKey`, `model` |
| Azure OpenAI | `azure` | `apiKey`, `endpoint`, `deploymentName`, `model` |
| Anthropic | `anthropic` | `apiKey`, `model` |
| Mistral AI | `mistral` | `apiKey`, `model` |
| Google Gemini | `gemini` | `apiKey`, `model` |
| DeepSeek | `deepseek` | `apiKey`, `model` |
| Local (Ollama) | `local` | `baseUrl`, `model` |
| Mock Testing Model | `mock-testing-model` | *(none — no API key needed)* |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `HEADLAMP_AI_PROVIDER` | Provider ID |
| `HEADLAMP_AI_MODEL` | Model name |
| `HEADLAMP_AI_API_KEY` | API key |
| `HEADLAMP_AI_BASE_URL` | Base URL for local models |
| `HEADLAMP_AI_CONFIG` | Path to config file |
| `HEADLAMP_AI_ENDPOINT` | Azure endpoint |
| `HEADLAMP_AI_DEPLOYMENT_NAME` | Azure deployment name |

## Modules

### MCP (`@headlamp-k8s/ai/mcp`)

Types and utilities for the Model Context Protocol:

- **Types**: `MCPSettings`, `MCPServer`, `MCPToolState`, `MCPServerToolState`, `MCPToolsConfig`
- **Utilities**: `expandEnvAndResolvePaths`, `settingsChanges`, `parseServerNameToolName`, `validateToolArgs`, `summarizeMcpToolStateChanges`

### LangChain (`@headlamp-k8s/ai/langchain`)

LangChain integration for AI-powered Kubernetes management:

- **LangChainManager**: Main manager class for LangChain-based AI interactions
- **Prompt Templates**: Reusable prompt templates for Kubernetes operations
- **Output Parsers**: Structured output parsers for AI responses
- **Tools**: Tool management, orchestration, and Kubernetes-specific tools
- **Formatters**: MCP output formatting utilities

### AI (`@headlamp-k8s/ai/ai`)

AI manager and configuration:

- **AIManager**: Abstract base class for AI manager implementations
- **ElectronMCPClient**: Client for MCP operations in the Electron environment
- **Prompts**: System prompts for the AI assistant

## Library Usage

```typescript
// Import MCP types and utilities
import { MCPSettings, validateToolArgs } from '@headlamp-k8s/ai';

// Import from specific submodules
import { LangChainManager } from '@headlamp-k8s/ai/langchain';
import { ElectronMCPClient } from '@headlamp-k8s/ai/ai';
```

### Mock Testing Model

The `mock-testing-model` provider returns canned responses from fixture files —
no API keys or network access required.  See
[`ai/src/mock-testing-model/README.md`](src/mock-testing-model/README.md) for
fixture format, template variables, and sequence playback.

```bash
# CLI usage — no API key needed
npx headlamp-ai --provider mock-testing-model "What is a Pod?"

# Or with a config file
echo '{"provider":"mock-testing-model","config":{}}' > /tmp/mock-config.json
npx headlamp-ai --config /tmp/mock-config.json "Hello"
```

```typescript
// Programmatic usage
import { createMockTestingModel } from '@headlamp-k8s/ai/mock-testing-model';

const model = createMockTestingModel();
const result = await model.invoke([new HumanMessage('What is a Service?')]);
// → "A **Service** is a Kubernetes resource managed by the API server…"
```

For full instructions on running the AI assistant with KWOK and the mock model,
see [`ai/docs/testing-with-mock-model.md`](docs/testing-with-mock-model.md).

## Building

```bash
npm install
npm run build
```

## Testing

```bash
npm test          # runs all tests (102 tests across 6 files)
npm run lint      # eslint
npm run tsc       # type-check
npm run format    # prettier
```

## TODO

- [ ] Add `--config-dir` CLI flag to override the Headlamp app config directory
- [ ] Add CLI configuration fixture files for common testing scenarios
- [ ] Add Playwright e2e tests for the ai-assistant plugin using mock-testing-model + KWOK
