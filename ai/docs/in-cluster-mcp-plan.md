# Plan: MCP Support Across All Headlamp Runtime Modes

## Problem

The ai-assistant plugin's MCP (Model Context Protocol) support currently only works in the **Electron desktop app**. It relies on:

1. **Electron IPC** — `ElectronMCPClient` communicates with the main process via `window.desktopApi.mcp.*`
2. **stdio transport** — MCP servers are spawned as local child processes (`makeMcpServers` returns `transport: 'stdio'`)
3. **Local filesystem** — settings are read from/written to local JSON files (`mcp-tools-settings.json`)
4. **Process spawning** — `expandEnvAndResolvePaths` resolves local env vars and paths for command-line tools

MCP needs to work in **all four** Headlamp runtime modes:

| Runtime mode | Description | MCP today |
|---|---|---|
| **Desktop app** | Electron with full BrowserWindow | ✅ Works (Electron IPC + stdio) |
| **Headless desktop** | Electron `--headless` flag, UI in system browser | ⚠️ Electron main process spawns MCP servers, but browser has no `window.desktopApi` |
| **In-cluster** | Go backend in Kubernetes pod, frontend served as static files | ❌ No Electron, no local processes |
| **CLI** (`headlamp-ai`) | Node.js CLI, no browser | ✅ Works (direct `MultiServerMCPClient` in-process) |

## Goals

1. Enable MCP tool usage in the ai-assistant plugin when Headlamp is deployed **in-cluster**.
2. Ensure MCP works when Headlamp runs in **headless mode** (`--headless`).
3. Keep the existing **desktop app** MCP path working with no regressions.
4. Keep the **CLI** MCP path working (it already manages MCP servers in-process).
5. Apply appropriate security controls for each runtime mode's trust model.

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  Consumers                                                         │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐ │
│  │ Desktop app  │  │ Headless     │  │ In-cluster   │  │ CLI    │ │
│  │ (Electron)   │  │ (--headless) │  │ (browser)    │  │        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───┬────┘ │
│         │                 │                 │               │      │
│         ▼                 ▼                 ▼               │      │
│  ┌─────────────────────────────────────────────────┐        │      │
│  │         MCPClientInterface (abstraction)         │        │      │
│  │                                                  │        │      │
│  │  ElectronMCPClient  │ HTTPMCPClient              │        │      │
│  │  (desktop only)     │ (in-cluster + headless)    │        │      │
│  └──────┬───────────────┴──────────┬────────────────┘        │      │
│         │                          │                         │      │
│         ▼                          ▼                         ▼      │
│  Electron IPC              Headlamp Go backend       Direct Node.js│
│  (main process)            (MCP proxy endpoints)     MCP client    │
│         │                          │                         │      │
│         ▼                          ▼                         ▼      │
│  Local stdio               stdio (sidecar)           Local stdio   │
│  MCP servers               SSE (remote)              MCP servers   │
│                             Streamable HTTP (remote)               │
└────────────────────────────────────────────────────────────────────┘
```

### Per-Mode MCP Data Flow

**Desktop app (Electron with BrowserWindow):**
- Browser renderer → `ElectronMCPClient` → Electron IPC → main process `MCPClient` → `MultiServerMCPClient` → stdio child processes
- Settings: local file `mcp-tools-settings.json` (user-writable)
- Trust: single user, full local access

**Headless desktop (`--headless`):**
- System browser → `HTTPMCPClient` → Headlamp Go backend (localhost) → stdio/SSE/Streamable HTTP MCP servers
- Settings: same local file as desktop, passed to Go backend at startup
- Trust: single user (localhost only), same trust as desktop

**In-cluster:**
- Browser → `HTTPMCPClient` → Go backend MCP proxy endpoints → sidecar (stdio) or remote (SSE/Streamable HTTP) MCP servers
- Settings: ConfigMap/Helm values (admin-managed), no user-writable config
- Trust: multi-user, authenticated, RBAC-enforced

**CLI (`headlamp-ai`):**
- CLI process → direct `MultiServerMCPClient` (no HTTP, no browser)
- Settings: `--config` file, env vars, or auto-discovered from `~/.config/Headlamp/`
- Trust: single user, local terminal

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
- [ ] CLI is unaffected (it manages MCP servers in-process, does not use `MCPClientInterface`)

### Phase 2: Backend MCP Proxy Endpoint

**Status:** Not started
**Effort:** Medium

Add an MCP proxy endpoint to the Headlamp Go backend that:
- Accepts MCP tool list/execute requests from the frontend over HTTP
- Manages MCP server connections server-side (stdio, SSE, or Streamable HTTP)
- Handles MCP server lifecycle (start, stop, restart)
- Reads MCP configuration from a ConfigMap, environment variables, or local settings file
- Works in **both** in-cluster and headless modes

```
POST /api/v1/mcp/tools          → list available tools
POST /api/v1/mcp/execute        → execute a tool
GET  /api/v1/mcp/status         → connection status
POST /api/v1/mcp/reset          → restart MCP connections
GET  /api/v1/mcp/config         → get current MCP configuration
```

Implementation options for the Go backend:
1. **Go MCP SDK** — Use an MCP client library for Go (e.g., [mcp-go](https://github.com/mark3labs/mcp-go)) to connect to MCP servers directly
2. **Node.js sidecar** — Run `@langchain/mcp-adapters` `MultiServerMCPClient` in a Node.js sidecar that the Go backend proxies to

Option 1 (Go MCP SDK) is preferred for simplicity and single-binary deployment.

Changes needed:
- [ ] Add MCP proxy handler in `backend/pkg/mcp/`
- [ ] Support stdio transport (sidecar MCP servers, local MCP servers in headless)
- [ ] Support SSE transport (remote MCP servers)
- [ ] Support Streamable HTTP transport (MCP spec 2025-03-26)
- [ ] Configuration via environment variables and/or ConfigMap (in-cluster), or local file (headless)
- [ ] Authentication/authorization for MCP endpoints (reuse existing Headlamp auth)
- [ ] Endpoints disabled by default, enabled only when MCP config is present
- [ ] Tests

### Phase 3: HTTP MCP Client for Browser

**Status:** Not started
**Effort:** Small

Create `HTTPMCPClient` implementing `MCPClientInterface` that communicates with the backend MCP proxy. Used in **both** in-cluster and headless modes.

```typescript
// ai/src/mcp/HTTPMCPClient.ts
export class HTTPMCPClient implements MCPClientInterface {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  isAvailable(): boolean {
    // Available in browser when Electron desktop API is not present (headless or in-cluster)
    return typeof window !== 'undefined' && !window.desktopApi;
  }

  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/mcp/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', // include auth cookies
      body: JSON.stringify({ toolName, args }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.result;
  }
  // ... other methods follow same pattern
}
```

Changes needed:
- [ ] Implement `HTTPMCPClient` in `ai/src/mcp/HTTPMCPClient.ts`
- [ ] Export from `@headlamp-k8s/ai` (Node.js-safe, no Electron deps)
- [ ] Auto-detect environment: `window.desktopApi` exists → `ElectronMCPClient`, else → `HTTPMCPClient`
- [ ] Forward auth tokens/cookies on all requests
- [ ] Tests

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

Changes needed:
- [ ] Extend `MCPServer` type to support `url` and `transport` fields
- [ ] Update Helm chart `values.yaml` with `ai.mcp` section
- [ ] Add ConfigMap template to Helm chart
- [ ] Backend reads MCP config from ConfigMap mount or env vars
- [ ] Document Helm configuration in `charts/headlamp/README.md`

### Phase 5: AI Provider Configuration for In-Cluster

**Status:** Not started
**Effort:** Small

```yaml
# values.yaml addition
ai:
  provider: ""        # e.g., "openai", "anthropic", "ollama"
  model: ""           # e.g., "gpt-4", "claude-3-sonnet"
  apiKeySecret: ""    # Kubernetes Secret name containing API key
  baseUrl: ""         # e.g., "http://ollama.default.svc:11434"
```

Changes needed:
- [ ] Add `ai.provider` section to Helm `values.yaml`
- [ ] Backend endpoint to serve AI config (without exposing secrets)
- [ ] Option: backend-side AI proxy (keeps API keys out of browser)
- [ ] Document configuration options

### Phase 6: MCP Server Sidecar Pattern

**Status:** Not started
**Effort:** Medium

For stdio-based MCP servers in-cluster, use a sidecar container pattern:

```yaml
containers:
  - name: headlamp
    image: ghcr.io/headlamp-k8s/headlamp:latest
  - name: mcp-kubernetes
    image: my-mcp-server:latest
    ports:
      - containerPort: 8080
        name: mcp-sse
```

Changes needed:
- [ ] Document sidecar deployment pattern
- [ ] Add Helm chart support for sidecar containers
- [ ] Example manifests for common MCP servers

### Phase 7: Headless Mode MCP Support

**Status:** Not started
**Effort:** Small (depends on Phase 2 + 3)

When Headlamp runs with `--headless`, the Electron main process starts the Go backend but the UI opens in the system browser. The system browser does not have `window.desktopApi`.

**Approach:** The Go backend MCP proxy (Phase 2) serves MCP to the system browser via `HTTPMCPClient`. The Electron main process passes MCP config to the Go backend via environment variable or config file at startup.

Changes needed:
- [ ] Electron main process: pass MCP settings to Go backend when `--headless`
- [ ] Go backend: read MCP config from file/env
- [ ] System browser: `HTTPMCPClient` auto-detects (no `desktopApi` → HTTP)
- [ ] Test headless mode MCP round-trip

## Transport Support Matrix

| Transport | Desktop | Headless | In-Cluster | CLI |
|-----------|---------|----------|------------|-----|
| stdio | ✅ Current | ✅ Phase 7 | ✅ Sidecar (Phase 6) | ✅ Current |
| SSE | ❌ Not yet | ✅ Phase 2 | ✅ Phase 2 | ❌ Not yet |
| Streamable HTTP | ❌ Not yet | ✅ Phase 2 | ✅ Phase 2 | ❌ Not yet |

## MCP Type Extensions

```typescript
// Proposed MCPServer type
interface MCPServer {
  name: string;
  enabled: boolean;
  env?: Record<string, string>;

  // stdio transport (existing)
  command?: string;
  args?: string[];

  // SSE / Streamable HTTP transport
  url?: string;
  transport?: 'stdio' | 'sse' | 'streamable-http';

  // Auth for remote MCP servers
  headers?: Record<string, string>;
  authSecretRef?: string;  // Kubernetes Secret name (in-cluster only)
}
```

## Security Analysis

This section applies STRIDE threat modeling to the MCP proxy architecture and maps findings to the **OWASP Top 10 for LLM Applications (2025)**, **OWASP Agentic AI Top 10**, and **OWASP MCP Top 10**.

### STRIDE Threat Model

#### S — Spoofing (Identity)

| Threat | Modes affected | OWASP mapping | Mitigation |
|--------|---------------|---------------|------------|
| Unauthenticated caller invokes MCP proxy endpoints | In-cluster, Headless | MCP-07: Insufficient Auth | All `/api/v1/mcp/*` endpoints require the same auth as existing Headlamp API (Bearer token or OIDC session cookie). Reuse `ParseClusterAndToken` from `backend/pkg/auth/auth.go`. Return 401 for unauthenticated requests. |
| Attacker on same machine calls headless MCP proxy | Headless | MCP-07 | Go backend binds to `localhost` only in headless mode. Consider a per-session startup token passed via URL fragment to prevent other local processes from using the proxy. |
| MCP server impersonation (rogue SSE/HTTP endpoint) | In-cluster | MCP-09: Shadow MCP Servers | Only connect to servers listed in admin-managed ConfigMap. Validate TLS certs for remote servers. Reject non-TLS URLs unless `allowInsecure: true` is explicitly set. |

**Desktop app and CLI:** Not affected — no HTTP endpoints, process-internal IPC or in-process calls.

#### T — Tampering (Data Integrity)

| Threat | Modes affected | OWASP mapping | Mitigation |
|--------|---------------|---------------|------------|
| User modifies MCP server list to add a malicious server | In-cluster | MCP-09: Shadow MCP Servers, Agentic-04: Supply Chain | MCP config is read-only from the frontend. No `mcp-update-config` endpoint in the Go backend for in-cluster mode. Config changes require Helm upgrade or ConfigMap edit by cluster admin. |
| Tool arguments manipulated to cause unintended actions | All modes | MCP-05: Command Injection, LLM-01: Prompt Injection | Validate `toolName` against known tools from configured servers. Validate arguments against tool's `inputSchema` via `validateToolArgs`. Sanitize server names (alphanumeric + hyphens only). |
| MCP server returns poisoned tool output that influences the LLM | All modes | Agentic-06: Memory & Context Poisoning, MCP-03: Tool Poisoning | Treat all MCP tool output as untrusted. Do not allow tool output to override system prompts or inject new tool calls. Log tool outputs for audit. |

#### R — Repudiation (Audit Trail)

| Threat | Modes affected | OWASP mapping | Mitigation |
|--------|---------------|---------------|------------|
| MCP tool execution with no audit trail — attacker actions undetectable | In-cluster | MCP-08: Lack of Audit/Telemetry, Agentic-08: Cascading Failures | Log every MCP tool execution: timestamp, authenticated user, tool name, argument summary (redact sensitive values), result status. Structured JSON logs to stdout for Kubernetes log collection. |
| AI-initiated tool calls cannot be attributed to the requesting user | In-cluster | Agentic-03: Identity & Privilege Abuse | The Go backend must associate every tool execution with the authenticated user's identity from the HTTP request. Pass the user's Kubernetes token through to MCP tools that call the Kubernetes API. |

**Desktop and CLI:** Single-user — existing console logging is sufficient.

#### I — Information Disclosure

| Threat | Modes affected | OWASP mapping | Mitigation |
|--------|---------------|---------------|------------|
| API keys leaked to browser | In-cluster | LLM-02: Sensitive Information Disclosure | AI provider API keys stored in Kubernetes Secrets, read by backend only. Frontend receives provider name and model, never the key. MCP server auth tokens also in Secrets via `authSecretRef`. |
| System prompt or internal context exposed via tool output | All modes | LLM-07: System Prompt Leakage | Do not include API keys, internal URLs, or sensitive config in the system prompt sent to the LLM. Sanitize tool output before displaying to the user. |
| MCP tool leaks cluster data to unauthorized users | In-cluster | MCP-10: Context Over-Sharing | MCP tools that call the Kubernetes API must use the requesting user's token, not the Headlamp service account. This enforces Kubernetes RBAC on every tool action. |
| Config endpoint exposes secrets | In-cluster, Headless | LLM-02 | The `/api/v1/mcp/config` endpoint returns server names and transport types but never credentials, tokens, or secret values. |

#### D — Denial of Service

| Threat | Modes affected | OWASP mapping | Mitigation |
|--------|---------------|---------------|------------|
| User floods MCP proxy with tool calls | In-cluster | LLM-10: Unbounded Consumption | Rate-limit MCP tool executions per user (e.g., 60 calls/minute). Configure via Helm values. |
| Long-running MCP tool blocks backend resources | In-cluster, Headless | LLM-10 | Enforce server-side timeout on tool calls (configurable, default 2 minutes). Global concurrency limit on simultaneous MCP executions. |
| AI model API cost exhaustion | In-cluster | LLM-10 | Rate-limit AI model API calls. Budget alerts via provider dashboards. Optional: backend-side proxy with per-user quotas. |

#### E — Elevation of Privilege

| Threat | Modes affected | OWASP mapping | Mitigation |
|--------|---------------|---------------|------------|
| MCP tool executes with service account instead of user permissions | In-cluster | Agentic-03: Identity & Privilege Abuse, MCP-02: Privilege Escalation | MCP tools calling the Kubernetes API must use the requesting user's Bearer token. Never use the Headlamp pod's service account for user-initiated tool calls. |
| LLM prompt injection tricks agent into calling dangerous tools | All modes | LLM-01: Prompt Injection, LLM-06: Excessive Agency, Agentic-01: Goal Hijack | Tool approval flow (existing `ToolApprovalHandler`). Separate read-only tools (auto-approvable) from write tools (require explicit user approval). In-cluster: admin can pre-approve specific tools via ConfigMap. |
| Sidecar container escapes to host or other pods | In-cluster | Agentic-04: Supply Chain | Sidecar MCP servers run as non-root, drop all capabilities, use read-only root filesystem, no service account token mount. Pin container images by digest. |

### Key Mitigations Summary

Based on the STRIDE analysis, these are the mitigations that must be implemented:

**Authentication & Authorization (all HTTP-served modes):**
- Reuse existing Headlamp auth for all MCP endpoints.
- User's Kubernetes token passed through to MCP tools that call K8s API (never use service account).
- In headless mode, bind to localhost only.

**MCP Server Trust (in-cluster):**
- Admin-only config via ConfigMap; no user-writable MCP server configuration.
- TLS required for remote MCP servers; reject plain HTTP unless explicitly overridden.
- Pin sidecar images by digest.

**Input Validation (all modes):**
- Validate tool names against configured server tool lists.
- Validate tool arguments against `inputSchema`.
- Sanitize MCP server names (alphanumeric + hyphens).

**Audit Logging (in-cluster):**
- Structured JSON logs for every tool execution with user identity, tool name, status.
- Sufficient for incident response and compliance.

**Resource Protection (in-cluster):**
- Per-user rate limits on tool calls.
- Server-side execution timeout.
- Global concurrency limit.

**Secret Management (in-cluster):**
- API keys and MCP auth tokens in Kubernetes Secrets only.
- Backend reads secrets; frontend never sees them.

**Tool Approval (all modes):**
- Existing `ToolApprovalHandler` interface supports pluggable approval per mode.
- In-cluster: admin pre-approval list, per-user approval state, configurable TTL.
- Read-only tools (GET) can have lower approval threshold than write tools.

### Network Segmentation (In-Cluster)

Recommended NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: headlamp-mcp-egress
spec:
  podSelector:
    matchLabels:
      app: headlamp  # Match your actual Headlamp pod labels
  policyTypes:
    - Egress
  egress:
    - to: [{ namespaceSelector: {} }]  # DNS
      ports: [{ port: 53, protocol: UDP }]
    - to: [{ ipBlock: { cidr: <API_SERVER>/32 } }]  # K8s API
      ports: [{ port: 443, protocol: TCP }]
    - to: [{ ipBlock: { cidr: 0.0.0.0/0 } }]  # AI provider + remote MCP
      ports: [{ port: 443, protocol: TCP }]
```

Sidecar MCP servers communicate via localhost within the pod — no external network exposure.

## Backward Compatibility

All changes must maintain backward compatibility:

1. **Desktop app**: `ElectronMCPClient` continues to work via Electron IPC unchanged.
2. **Headless mode**: Go backend gains MCP proxy endpoints. Electron main process passes MCP settings to Go backend.
3. **CLI**: Manages `MultiServerMCPClient` in-process. No changes needed.
4. **Plugin**: Auto-detects environment via `MCPClientInterface` — `window.desktopApi` → `ElectronMCPClient`, absent → `HTTPMCPClient`.

## Implementation Priority

1. **Phase 1** (Abstract MCP Client) — Prerequisite. Small, low-risk refactor.
2. **Phase 3** (HTTP MCP Client) — Parallel with Phase 2 using a mock backend.
3. **Phase 2** (Backend Proxy) — Core. Largest effort. Enables headless + in-cluster.
4. **Phase 7** (Headless Mode) — Small integration once Phase 2 + 3 done.
5. **Phase 4** (Helm Config) — In-cluster configuration.
6. **Phase 5** (AI Provider Config) — Independent of MCP.
7. **Phase 6** (Sidecar Pattern) — Docs and Helm helpers.

## Open Questions

1. **Go vs Node.js for MCP client** — Go MCP SDK (simpler deployment) vs Node.js sidecar (reuses `@langchain/mcp-adapters`)?

2. **Per-user vs shared MCP config** — Desktop/headless: per-user (local file). In-cluster: shared ConfigMap, or per-user stored in backend keyed by identity?

3. **AI provider proxy** — Backend proxies all AI API calls (keys server-side, recommended for in-cluster) vs frontend-direct (simpler but keys in browser memory)?

4. **SSE/Streamable HTTP in desktop** — Should the desktop app also gain SSE/HTTP transport for remote MCP servers via the Go backend proxy?

5. **Headless MCP config passing** — Electron → Go backend: temp config file, env var, or CLI argument?
