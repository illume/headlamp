# headlamp-ai

A command-line interface for querying AI models using the same configuration and
providers as the [Headlamp](https://headlamp.dev) AI assistant plugin.

## Features

- **Auto-detection** — runs `gh auth token` to detect GitHub Copilot, checks for
  Ollama locally, and reads Azure CLI credentials automatically
- **Shared config** — reads the same `headlamp-ai.json` file that the Headlamp
  desktop app writes, so your configured provider is available immediately
- **MCP tools** — picks up `mcp-tools-settings.json` from the Headlamp data
  directory to give the model the same tool access as the app
- **Interactive mode** — multi-turn chat session in the terminal
- **Pipe-friendly** — reads a query from stdin when no argument is given

## Quick start

```sh
# Auto-detect providers (GitHub Copilot, Azure OpenAI, Ollama)
npx tsx src/cli.ts --auto-detect

# Save the detected provider and use it for queries
npx tsx src/cli.ts --auto-detect --save
npx tsx src/cli.ts "What pods are running in kube-system?"

# One-shot query with an explicit provider
npx tsx src/cli.ts --provider openai --api-key sk-... "Explain Deployments"

# Interactive chat
npx tsx src/cli.ts -i

# Pipe a prompt from stdin
kubectl get pods -A | npx tsx src/cli.ts "Which pods are not Running?"
```

## Usage

```
headlamp-ai [options] [query]

Options:
  --config <path>       Path to a headlamp-ai.json config file
  --provider <id>       Provider: openai, anthropic, gemini, mistral, deepseek,
                        copilot, local, mock-testing-model
  --model <name>        Model name (e.g. gpt-4o, claude-opus-4-6)
  --api-key <key>       API key for the provider
  --base-url <url>      Base URL for local/custom providers (Ollama, vLLM)
  --system-prompt <p>   Custom system prompt
  --interactive, -i     Start an interactive multi-turn chat session
  --auto-detect         Discover available providers and print a summary
  --save                With --auto-detect: write the first result to headlamp-ai.json
  --help, -h            Show this help message
```

## Provider auto-detection

`--auto-detect` runs all three detectors in parallel:

| Provider           | Detection method                                          |
| ------------------ | --------------------------------------------------------- |
| **GitHub Copilot** | `gh auth token` → validates token → fetches model catalog |
| **Azure OpenAI**   | `az account show` + `az cognitiveservices account list`   |
| **Ollama (local)** | HTTP request to `http://localhost:11434/api/tags`         |

The best available Copilot model is selected automatically using the same
priority list as the Headlamp UI (Claude Opus → GPT-5.x → Claude Sonnet → …).

## Configuration

Config resolution order (first match wins):

1. `--config <path>` flag or `HEADLAMP_AI_CONFIG` env var
2. `HEADLAMP_AI_PROVIDER` and related environment variables
3. `headlamp-ai.json` in the Headlamp data directory
4. Auto-detection (`gh auth token`, Ollama, Azure CLI)

### Config file format

```json
{
  "provider": "copilot",
  "config": {
    "apiKey": "__gh_cli__",
    "model": "claude-opus-4-6"
  },
  "mcp": {
    "enabled": true,
    "servers": [
      {
        "name": "my-server",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-everything"],
        "enabled": true
      }
    ]
  },
  "systemPrompt": "You are a Kubernetes expert. Be concise."
}
```

The special value `"__gh_cli__"` for `apiKey` means the token is fetched fresh
from `gh auth token` each time — the real token is never stored on disk.

### Data directory paths

The CLI looks for config files in the same location as the Headlamp desktop app:

| Platform | Path                                      |
| -------- | ----------------------------------------- |
| macOS    | `~/Library/Application Support/Headlamp/` |
| Linux    | `~/.config/Headlamp/`                     |
| Windows  | `%APPDATA%\Headlamp\`                     |

Files read:

- `headlamp-ai.json` — AI provider configuration
- `mcp-tools-settings.json` — MCP server definitions (shared with the app)

### Environment variables

| Variable                      | Description                       |
| ----------------------------- | --------------------------------- |
| `HEADLAMP_AI_PROVIDER`        | Provider ID                       |
| `HEADLAMP_AI_MODEL`           | Model name                        |
| `HEADLAMP_AI_API_KEY`         | API key                           |
| `HEADLAMP_AI_BASE_URL`        | Base URL for local/vLLM providers |
| `HEADLAMP_AI_ENDPOINT`        | Azure OpenAI endpoint             |
| `HEADLAMP_AI_DEPLOYMENT_NAME` | Azure deployment name             |
| `HEADLAMP_AI_CONFIG`          | Path to a config JSON file        |

## Running without a build step

The package uses [tsx](https://github.com/privatenumber/tsx) to run TypeScript
source directly — no compilation needed:

```sh
cd packages/ai-cli
npm install
npx tsx src/cli.ts "your query"
```

## Architecture

| Module      | Responsibility                                                           |
| ----------- | ------------------------------------------------------------------------ |
| `cli.ts`    | Thin orchestrator (~80 lines)                                            |
| `config.ts` | `CLIConfig` type, data-dir path helpers, file/env config loading         |
| `model.ts`  | Model creation via `ai-common`, Copilot sentinel resolution, auto-detect |
| `mcp.ts`    | MCP tool initialisation via `MultiServerMCPClient`                       |
| `chat.ts`   | `query()` and `interactiveMode()`                                        |
| `args.ts`   | Argument parsing, usage text, stdin reading                              |

The provider→model mapping (`createLangChainModel`) lives in
`@headlamp-k8s/ai-common/langchain/LangChainManager` and is shared with the
Headlamp AI assistant plugin so both always support the same providers.
