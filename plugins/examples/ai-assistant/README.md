# Headlamp AI Assistant

The Headlamp AI Assistant is a plugin that integrates AI capabilities directly into Headlamp. It provides a conversational interface to interact with your Kubernetes clusters, helping you manage resources, troubleshoot issues, and understand complex configurations through natural language.

The assistant is context-aware, meaning it uses information about your cluster to provide more relevant and accurate responses.

**IMPORTANT:** This plugin is in alpha state!

## Key Features

- **Conversational Kubernetes Management**: Interact with your cluster using natural language. Ask questions, get explanations, and issue commands.
- **Context-Aware Assistance**: The AI has access to cluster information, making its responses relevant to your current setup.
- **Multi-Provider Support**: Choose from a wide range of AI providers.
- **Configurable Tools**: Fine-tune the AI's capabilities by enabling or disabling specific tools, like direct Kubernetes API access.
- **Resource Generation**: Ask the AI to generate Kubernetes YAML manifests for deployments, services, and more.
- **In-depth Analysis**: Get help diagnosing issues, understanding resource configurations, and interpreting logs.

## Supported Providers

The plugin supports multiple AI providers, allowing you to choose the one that best fits your needs:

- **OpenAI** (GPT models)
- **Azure OpenAI Service**
- **Anthropic** (Claude models)
- **Mistral AI**
- **Google** (Gemini models)
- **DeepSeek** (DeepSeek-Chat, DeepSeek-Reasoner)
- **Local Models** (via Ollama)

You will need to provide your own API keys and endpoint information for the provider you choose to use. Please note that using AI providers may incur costs, so check the pricing details of your chosen provider.

## Adding Holmes Agent to Your Cluster

The AI Assistant can connect to a [HolmesGPT](https://holmesgpt.dev) agent running in your cluster for enhanced Kubernetes diagnostics and troubleshooting. Follow the steps below to deploy Holmes.

### 1. Add the Robusta Helm Repository

```bash
helm repo add robusta https://robusta-charts.storage.googleapis.com
helm repo update
```

### 2. Create a `values.yaml`

Below is an example using Azure OpenAI. For other providers (OpenAI, AWS Bedrock, etc.), see the [HolmesGPT installation docs](https://holmesgpt.dev/latest/installation/kubernetes-installation/#installation).

```yaml
# values.yaml
image: robustadev/holmes:0.19.1

additionalEnvVars:
- name: AZURE_API_KEY
  value: ""
- name: AZURE_API_BASE
  value: "https://<your-azure-endpoint>.openai.azure.com"
- name: AZURE_API_VERSION
  value: "2024-02-15-preview"
# Or load from secret:
# - name: AZURE_API_KEY
#   valueFrom:
#     secretKeyRef:
#       name: holmes-secrets
#       key: azure-api-key
# - name: AZURE_API_BASE
#   valueFrom:
#     secretKeyRef:
#       name: holmes-secrets
#       key: azure-api-base

modelList:
  azure-gpt4:
    api_key: "{{ env.AZURE_API_KEY }}"
    model: azure/gpt-5
    api_base: "{{ env.AZURE_API_BASE }}"
    api_version: "{{ env.AZURE_API_VERSION }}"
```

### 3. Render and Patch the Helm Template

Holmes requires enabling the AG-UI server for the AI Assistant to communicate with it. Render the template and update the container command:

```bash
helm template holmesgpt robusta/holmes -f values.yaml > rendered.yaml
```

In `rendered.yaml`, find the container command and change it to:

```yaml
command: ["python3", "-u", "/app/experimental/ag-ui/server-agui.py"]
```

### 4. Deploy to Your Cluster

```bash
kubectl apply -f rendered.yaml
```

## MCP (Model Context Protocol) Server Support

The AI Assistant supports [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers, allowing you to extend the assistant's capabilities by connecting it to external tools and data sources.

> **Note:** MCP server support is currently available only in the **Headlamp desktop application**.

### What is MCP?

MCP is an open protocol that enables AI assistants to interact with external tools and services. By configuring MCP servers, you can give the AI Assistant access to specialized tools — for example, connecting it to [Flux](https://fluxcd.io/) for GitOps management or any other MCP-compatible tool.

### Configuring MCP Servers

Navigate to the AI Assistant settings to add and manage MCP servers. Each server is configured with:

- **Name** — A unique identifier for the server.
- **Command** — The executable to run (e.g., `flux-operator-mcp`).
- **Args** — Command-line arguments (e.g., `serve --kube-context HEADLAMP_CURRENT_CLUSTER`).
- **Environment Variables** — Optional env vars required by the server (e.g., `KUBECONFIG`).

You can configure servers using the form-based UI or by editing the JSON configuration directly.

![MCP Servers List](mcp-servers-list.png)

![MCP Config Editor](mcp-config.png)

### Managing MCP Tools

Once servers are configured, the assistant automatically discovers the tools they expose. You can:

- Enable or disable individual tools per server.
- View tool descriptions and input schemas.
- Track tool usage statistics.
- Use bulk operations to enable or disable all tools at once.

## Development

### Project Structure

```
ai-assistant/
  package.json          # Plugin package — consumes the shared packages
  src/                  # Plugin source code (React components, hooks)
  tsconfig.json         # Extends @kinvolk/headlamp-plugin config
  .npmrc                # install-links=true for file: deps

  packages/
    ai-common/          # @headlamp-k8s/ai-common — shared logic
      package.json      #   Config, prompts, tool approval, mock-testing-model,
      src/              #   LangChain orchestration, MCP utilities.
                        #   Ships .ts directly (no build step). 95 unit tests.

    ai-cli/             # @headlamp-k8s/ai-cli — Node CLI entrypoint
      package.json      #   `headlamp-ai` binary.
      src/              #   Ships .ts directly (uses tsx/node loaders).

    ai-ui/              # @headlamp-k8s/ai-ui — React UI utilities
      package.json      #   Browser-only components and hooks.
      src/              #   Ships .ts directly (consumer bundlers compile).

    ai-app/             # @headlamp-k8s/ai-app — Electron application code
      package.json      #   MCP settings, tool state store.
      src/              #   Requires TypeScript build (Electron needs JS).
```

The plugin depends on `ai-common`, `ai-ui`, and `ai-app` via `file:` references
in `package.json`. The `.npmrc` file sets `install-links=true` so `npm ci`
copies rather than symlinks the packages.

### Prerequisites

- Node.js ≥ 20.11.1
- npm ≥ 10.0.0
- Go (for the backend, if running the full app)

### Quick Start — Plugin Development

```bash
cd plugins/examples/ai-assistant
npm install    # installs plugin + all file: package deps
npm start      # starts headlamp-plugin dev server (hot reload)
```

This is enough to develop and make changes to the plugin. The `file:`
dependencies on the `packages/` subdirectories are resolved at install time.
Changes to files inside `packages/ai-common/src/`, `packages/ai-ui/src/`,
etc. are picked up automatically by the plugin bundler since they ship
`.ts` directly.

### Package Commands

#### ai-common (shared logic)

```bash
cd packages/ai-common
npm install
npm test              # run 95 unit tests (vitest)
```

#### ai-app (Electron code)

```bash
cd packages/ai-app
npm install
npm run build         # compile TypeScript → dist/ (required for Electron)
npm run clean         # remove dist/
```

#### ai-cli and ai-ui

These packages ship `.ts` directly and have no build or test scripts.
They are consumed by bundlers (plugin, Electron) or Node loaders (tsx).

### Plugin Commands

All commands run from the `ai-assistant/` root:

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies (plugin + packages) |
| `npm start` | Start plugin dev server with hot reload |
| `npm run build` | Production build of the plugin |
| `npm run lint` | Run ESLint |
| `npm run lint-fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run tsc` | TypeScript type-check |
| `npm test` | Run plugin tests |
| `npm run storybook` | Start Storybook dev server |
| `npm run storybook-build` | Build static Storybook |
| `npm run package` | Package plugin for distribution |

### Full App Development (with KWOK)

To run Headlamp with the ai-assistant plugin on a KWOK test cluster:

```bash
# 1. Create a KWOK cluster
kwokctl create cluster --name headlamp-test

# 2. Install ai-common dependencies (needed by app/ tests)
cd plugins/examples/ai-assistant/packages/ai-common && npm install
cd -

# 3. Build the plugin
cd plugins/examples/ai-assistant
npm install
npm run build
cd -

# 4. Build the frontend
npm run frontend:build

# 5. Build the backend
cd backend && go build -o headlamp-server ./cmd && cd -

# 6. Install the plugin
mkdir -p ~/.config/Headlamp/plugins/ai-assistant
cp -r plugins/examples/ai-assistant/dist/* ~/.config/Headlamp/plugins/ai-assistant/
cp plugins/examples/ai-assistant/package.json ~/.config/Headlamp/plugins/ai-assistant/

# 7. Start the backend
KUBECONFIG=$(kwokctl get kubeconfig --name headlamp-test) \
  backend/headlamp-server \
  -plugins-dir ~/.config/Headlamp/plugins \
  -in-cluster=false

# 8. Open http://localhost:4466
```

### Makefile Targets

From the repository root, these Make targets involve the ai-assistant:

| Target | Description |
|--------|-------------|
| `make ai-build` | Install ai-common dependencies (prereq for app/plugin builds) |
| `make app-build` | Build frontend + app (depends on `ai-build`) |
| `make app-test` | Run app tests (depends on `ai-build`) |
| `make plugins-test` | Run all plugin tests (depends on `ai-build`) |

### Releasing

1. **Version bump** — Update `version` in:
   - `plugins/examples/ai-assistant/package.json` (the plugin)
   - `packages/ai-common/package.json`
   - `packages/ai-cli/package.json`
   - `packages/ai-ui/package.json`
   - `packages/ai-app/package.json`

2. **Build the plugin** — `npm run build` in the `ai-assistant/` directory.

3. **Package** — `npm run package` creates a tarball suitable for
   distribution via ArtifactHub or manual installation.

4. **Docker** — The plugin is included in `Dockerfile.plugins` automatically.
   The Docker build copies the `packages/` directory, installs deps, and
   runs `headlamp-plugin build` for ai-assistant.

### Troubleshooting

- **`npm ci` fails with "Missing from lock file"** — Make sure `.npmrc`
  contains `install-links=true`. Regenerate `package-lock.json` with
  `npm install --install-links`.
- **vitest walks up to plugin tsconfig** — The `ai-common` package has
  its own `tsconfig.json` to stop consumers from resolving the plugin's
  `tsconfig.json` (which extends `@kinvolk/headlamp-plugin` config).
- **Plugin shows "Incompatible"** — The plugin SDK version
  (`@kinvolk/headlamp-plugin@^0.13.0-alpha.14`) must match the runtime.
  This is expected in development when using a pre-built frontend.
