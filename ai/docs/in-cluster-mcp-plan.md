# Plan: In-Cluster MCP Support for AI Assistant

## Problem

The ai-assistant plugin's MCP (Model Context Protocol) support currently only works in the **Electron desktop app**. It relies on:

1. **Electron IPC** — `ElectronMCPClient` communicates with the main process via `window.desktopApi.mcp.*`
2. **stdio transport** — MCP servers are spawned as local child processes (`makeMcpServers` returns `transport: 'stdio'`)
3. **Local filesystem** — settings are read from/written to local JSON files (`mcp-tools-settings.json`)
4. **Process spawning** — `expandEnvAndResolvePaths` resolves local env vars and paths for command-line tools

None of these work when Headlamp is deployed in-cluster, where the frontend runs in a browser and the backend runs in a Kubernetes pod.

## Goal

Enable MCP tool usage in the ai-assistant plugin when Headlamp is deployed in-cluster, so users can connect to MCP servers from the browser without requiring an Electron desktop app.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (ai-assistant plugin)                                │
│                                                              │
│  LangChainManager → ToolManager → MCPClient (abstracted)     │
│                                        │                     │
│                          ┌─────────────┴──────────────┐      │
│                          │                            │      │
│                 ElectronMCPClient           HTTPMCPClient     │
│                 (desktop only)             (in-cluster)       │
│                     │                          │             │
└─────────────────────┼──────────────────────────┼─────────────┘
                      │                          │
              Electron IPC              HTTP/SSE via backend
              (main process)                     │
                      │                          │
              Local stdio                ┌───────┴───────┐
              MCP servers                │ Headlamp      │
                                         │ Backend       │
                                         │ (Go server)   │
                                         └───────┬───────┘
                                                 │
                                    ┌────────────┼────────────┐
                                    │            │            │
                               stdio MCP    SSE MCP    Streamable
                               servers     servers    HTTP servers
                               (sidecar)   (remote)   (remote)
```

## Phases

### Phase 1: Abstract the MCP Client Interface

**Status:** Not started
**Effort:** Small

Create an `MCPClientInterface` that both `ElectronMCPClient` and a new `HTTPMCPClient` can implement. The `ToolManager` should depend on this interface, not directly on `ElectronMCPClient`.

```typescript
// ai/src/mcp/MCPClientInterface.ts
export interface MCPClientInterface {
  isAvailable(): boolean;
  getTools(): Promise<MCPTool[]>;
  executeTool(toolName: string, args: Record<string, any>, toolCallId?: string): Promise<any>;
  getStatus(): Promise<{ isInitialized: boolean; hasClient: boolean }>;
  resetClient(): Promise<boolean>;
  getConfig(): Promise<{ success: boolean; config?: any; error?: string }>;
  getToolsConfig(): Promise<{ success: boolean; config?: any; error?: string }>;
  getEnabledTools(): Promise<MCPTool[]>;
}
```

Changes needed:
- [ ] Define `MCPClientInterface` in `ai/src/mcp/MCPClientInterface.ts`
- [ ] Make `ElectronMCPClient` implement `MCPClientInterface`
- [ ] Update `ToolManager` constructor to accept `MCPClientInterface` instead of creating `ElectronMCPClient` directly
- [ ] Export interface from `@headlamp-k8s/ai`

### Phase 2: Backend MCP Proxy Endpoint

**Status:** Not started
**Effort:** Medium

Add an MCP proxy endpoint to the Headlamp Go backend that:
- Accepts MCP tool list/execute requests from the frontend over HTTP
- Manages MCP server connections server-side (stdio, SSE, or Streamable HTTP)
- Handles MCP server lifecycle (start, stop, restart)
- Reads MCP configuration from a ConfigMap or environment variables

```
POST /api/v1/mcp/tools          → list available tools
POST /api/v1/mcp/execute        → execute a tool
GET  /api/v1/mcp/status         → connection status
POST /api/v1/mcp/reset          → restart MCP connections
GET  /api/v1/mcp/config         → get current MCP configuration
```

Implementation options for the Go backend:
1. **Go MCP SDK** — Use an MCP client library for Go (e.g., [mcp-go](https://github.com/mark3labs/mcp-go)) to connect to MCP servers directly
2. **Node.js sidecar** — Run the `@langchain/mcp-adapters` `MultiServerMCPClient` in a Node.js sidecar process that the Go backend proxies to

Option 1 (Go MCP SDK) is preferred for simplicity and single-binary deployment.

Changes needed:
- [ ] Add MCP proxy handler in `backend/cmd/` or `backend/pkg/`
- [ ] Support stdio transport (for sidecar MCP servers in the same pod)
- [ ] Support SSE transport (for remote MCP servers)
- [ ] Support Streamable HTTP transport (MCP spec 2025-03-26)
- [ ] Add configuration via environment variables and/or ConfigMap
- [ ] Add authentication/authorization for MCP endpoints (reuse existing Headlamp auth)
- [ ] Add MCP proxy tests

### Phase 3: HTTP MCP Client for Browser

**Status:** Not started
**Effort:** Small

Create `HTTPMCPClient` implementing `MCPClientInterface` that communicates with the backend MCP proxy:

```typescript
// ai/src/mcp/HTTPMCPClient.ts
export class HTTPMCPClient implements MCPClientInterface {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  isAvailable(): boolean {
    // Available when not in Electron (in-cluster mode)
    return typeof window !== 'undefined' && !window.desktopApi;
  }

  async getTools(): Promise<MCPTool[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/mcp/tools`, { method: 'POST' });
    const data = await response.json();
    return data.tools || [];
  }

  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/mcp/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, args }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.result;
  }
  // ... other methods
}
```

Changes needed:
- [ ] Implement `HTTPMCPClient` in `ai/src/mcp/HTTPMCPClient.ts`
- [ ] Export from `@headlamp-k8s/ai` (Node.js-safe, no Electron deps)
- [ ] Auto-detect environment: use `ElectronMCPClient` in Electron, `HTTPMCPClient` in browser
- [ ] Add tests for `HTTPMCPClient`

### Phase 4: MCP Configuration via Helm/ConfigMap

**Status:** Not started
**Effort:** Small

Enable MCP server configuration for in-cluster deployments:

```yaml
# values.yaml addition
ai:
  mcp:
    enabled: false
    servers: []
    # Example:
    # servers:
    #   - name: "kubernetes-tools"
    #     command: "/usr/local/bin/mcp-k8s"
    #     args: ["--namespace", "default"]
    #     enabled: true
    #   - name: "remote-mcp"
    #     url: "https://mcp-server.example.com/sse"
    #     transport: "sse"
    #     enabled: true
```

This maps to a ConfigMap that the backend reads:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: headlamp-mcp-config
data:
  mcp-settings.json: |
    {
      "enabled": true,
      "servers": [
        {
          "name": "kubernetes-tools",
          "command": "/usr/local/bin/mcp-k8s",
          "args": [],
          "enabled": true
        }
      ]
    }
```

Changes needed:
- [ ] Extend `MCPServer` type to support `url` and `transport` fields (for SSE/HTTP servers)
- [ ] Update Helm chart `values.yaml` with `ai.mcp` section
- [ ] Add ConfigMap template to Helm chart
- [ ] Backend reads MCP config from ConfigMap mount or env vars
- [ ] Document Helm configuration in `charts/headlamp/README.md`

### Phase 5: AI Provider Configuration for In-Cluster

**Status:** Not started
**Effort:** Small

The AI provider (API key, model selection) also needs a configuration path for in-cluster:

```yaml
# values.yaml addition
ai:
  provider: ""        # e.g., "openai", "anthropic", "ollama"
  model: ""           # e.g., "gpt-4", "claude-3-sonnet"
  apiKeySecret: ""    # Name of a Kubernetes Secret containing the API key
  # For Ollama or other local models:
  baseUrl: ""         # e.g., "http://ollama.default.svc:11434"
```

The backend would:
1. Read the API key from the referenced Secret
2. Pass provider config to the frontend via a config endpoint
3. Or proxy AI requests through the backend (keeping keys server-side)

Changes needed:
- [ ] Add `ai.provider` section to Helm `values.yaml`
- [ ] Backend endpoint to serve AI configuration (without exposing secrets)
- [ ] Option: backend-side AI proxy (keeps API keys out of browser)
- [ ] Document configuration options

### Phase 6: MCP Server Sidecar Pattern

**Status:** Not started
**Effort:** Medium

For stdio-based MCP servers in-cluster, use a sidecar container pattern:

```yaml
# Example: MCP server as sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: headlamp
spec:
  template:
    spec:
      containers:
        - name: headlamp
          image: ghcr.io/headlamp-k8s/headlamp:latest
          # ...
        - name: mcp-kubernetes
          image: my-mcp-server:latest
          # stdio-based: communicate via shared Unix socket or named pipe
          # SSE-based: expose on localhost port
          ports:
            - containerPort: 8080
              name: mcp-sse
```

For SSE/HTTP-based MCP servers, the sidecar exposes a port and the backend connects via `localhost:PORT`.

Changes needed:
- [ ] Document sidecar deployment pattern
- [ ] Add Helm chart support for sidecar containers
- [ ] Example manifests for common MCP servers

## Transport Support Matrix

| Transport | Desktop (Electron) | In-Cluster | CLI |
|-----------|-------------------|------------|-----|
| stdio | ✅ Current | ✅ Via sidecar | ✅ Current |
| SSE | ❌ Not yet | ✅ Phase 2 | ❌ Not yet |
| Streamable HTTP | ❌ Not yet | ✅ Phase 2 | ❌ Not yet |

## MCP Type Extensions

The current `MCPServer` type only supports stdio:

```typescript
// Current
interface MCPServer {
  name: string;
  command: string;  // stdio command
  args: string[];   // stdio args
  enabled: boolean;
  env?: Record<string, string>;
}
```

Extend to support all MCP transports:

```typescript
// Proposed
interface MCPServer {
  name: string;
  enabled: boolean;
  env?: Record<string, string>;

  // stdio transport (existing)
  command?: string;
  args?: string[];

  // SSE transport
  url?: string;
  transport?: 'stdio' | 'sse' | 'streamable-http';

  // Streamable HTTP transport
  // Uses `url` field with transport: 'streamable-http'
}
```

## Security Considerations

1. **API Key Storage** — In-cluster API keys should be stored in Kubernetes Secrets, not ConfigMaps. The backend reads them and never exposes them to the frontend.

2. **MCP Tool Authorization** — The backend MCP proxy should enforce the same RBAC rules as the Kubernetes API proxy. MCP tool execution should be auditable.

3. **MCP Server Trust** — Only MCP servers configured by cluster administrators (via Helm/ConfigMap) should be connectable. Users should not be able to add arbitrary MCP servers in in-cluster mode.

4. **Network Policies** — MCP servers (especially sidecar stdio servers) should be restricted to communicate only with the Headlamp backend pod.

## Implementation Priority

1. **Phase 1** (Abstract MCP Client) — Prerequisite for all other phases. Small, low-risk refactor.
2. **Phase 3** (HTTP MCP Client) — Can be developed in parallel with Phase 2 using a mock backend.
3. **Phase 2** (Backend Proxy) — Core functionality. Largest effort.
4. **Phase 4** (Helm Config) — Configuration for Phase 2.
5. **Phase 5** (AI Provider Config) — Independent of MCP, but needed for full in-cluster AI.
6. **Phase 6** (Sidecar Pattern) — Deployment pattern documentation and Helm helpers.

## Open Questions

1. **Go vs Node.js for MCP client** — Should the backend use a Go MCP SDK or proxy through a Node.js sidecar running `@langchain/mcp-adapters`? Go is simpler for deployment; Node.js reuses existing code.

2. **Per-user vs shared MCP config** — In desktop mode, each user has their own MCP settings. In-cluster, should MCP config be shared (cluster-wide ConfigMap) or per-user (stored in the backend, keyed by authenticated user)?

3. **AI provider proxy** — Should the backend proxy all AI API calls (keeping keys server-side) or pass provider config to the frontend (simpler but exposes keys in browser memory)?

4. **MCP tool approval in-cluster** — The current `ToolApprovalHandler` interface works for both UI and CLI. For in-cluster multi-user deployments, should tool approvals be logged/audited? Should admins be able to pre-approve certain tools?

5. **SSE/Streamable HTTP in desktop** — Should the desktop app also gain SSE/HTTP transport support for remote MCP servers, or is that only needed for in-cluster?
