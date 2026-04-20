# Plan: MCP Support Across All Headlamp Runtime Modes

## Recommendation

**For in-cluster: support only HTTP/HTTPS MCP servers, with backend-side tool approval using a secret token (like `HEADLAMP_BACKEND_TOKEN`).**

This avoids the complexity and security risk of spawning child processes inside the cluster pod. The Go backend proxies HTTP/HTTPS MCP calls, validates tool approvals server-side, and uses the existing `HEADLAMP_BACKEND_TOKEN` pattern to authenticate the frontend.

### Why this approach

- **HTTP/HTTPS-only is simpler and safer.** No child process management, no sidecar containers, no Unix sockets. MCP servers are standalone services reachable by URL — the same as any microservice.
- **Backend-side approval reuses a proven pattern.** Headlamp already uses `HEADLAMP_BACKEND_TOKEN` (random 32-byte hex, set by Electron, checked by Go backend) to protect Helm and plugin routes. Extending this to MCP endpoints is minimal effort.
- **Admin controls what MCP servers are available.** Config comes from Helm values / ConfigMap — users cannot add arbitrary servers.

### Alternatives considered

| Approach | Pros | Cons | Why not chosen |
|----------|------|------|----------------|
| **A. HTTP/HTTPS-only + backend token** (chosen) | Simple, no process spawning, reuses existing auth, admin-controlled config | Cannot use stdio MCP servers in-cluster | stdio servers can expose an HTTP endpoint instead; most MCP servers already support SSE or Streamable HTTP |
| **B. Sidecar stdio servers** | Supports existing stdio MCP servers unchanged | Requires sidecar containers, shared volumes or Unix sockets, complex Helm templates, larger attack surface | Operational complexity outweighs benefit; stdio servers can add HTTP transport |
| **C. Go backend spawns stdio processes** | Supports stdio without sidecars | Arbitrary command execution inside the pod, difficult to sandbox, violates least-privilege | Unacceptable security risk in multi-user clusters |
| **D. Node.js sidecar running `@langchain/mcp-adapters`** | Reuses existing TypeScript MCP client code | Extra container, extra dependency, two runtimes to maintain | Adds complexity for no user-visible benefit |
| **E. Frontend connects directly to MCP servers** | No backend proxy needed | Exposes MCP server URLs/tokens to browser, CORS issues, no centralized auth/approval/audit | Breaks security model for multi-user deployments |

### Key tradeoffs

- **stdio not supported in-cluster** — MCP server authors must expose an HTTP endpoint. This is the direction the MCP spec is moving (Streamable HTTP transport, spec 2025-03-26). Most popular MCP servers already support SSE or HTTP.
- **Backend becomes a proxy** — Adds latency (~1ms) but gains centralized auth, approval, audit logging, and rate limiting.
- **Token-based auth is simple but not zero-trust** — Sufficient for Headlamp's threat model (backend and frontend are co-deployed; the token prevents unauthorized callers, not insider threats).

---

## Problem

MCP support currently only works in the **Electron desktop app** via Electron IPC + stdio child processes. It needs to work in all four Headlamp runtime modes:

| Mode | MCP today | MCP with this plan |
|------|-----------|-------------------|
| **Desktop app** (Electron) | ✅ Works | ✅ Unchanged |
| **Headless** (`--headless`) | ⚠️ No `window.desktopApi` in browser | ✅ Via Go backend proxy |
| **In-cluster** (K8s pod) | ❌ No Electron | ✅ Via Go backend proxy (HTTP/HTTPS MCP servers only) |
| **CLI** (`headlamp-ai`) | ✅ Works | ✅ Unchanged |

## Architecture

```
Desktop app          Headless / In-cluster         CLI
─────────────        ─────────────────────        ─────
ElectronMCPClient    HTTPMCPClient                 Direct MultiServerMCPClient
      │                    │                             │
  Electron IPC        Go backend                    In-process
      │              /api/v1/mcp/*                       │
 stdio child         ┌─────┴──────┐               stdio child
 processes           │            │               processes
              SSE servers  Streamable HTTP
              (remote)     servers (remote)
```

**Key design decisions:**
1. Plugin auto-detects mode: `window.desktopApi` → `ElectronMCPClient`, else → `HTTPMCPClient`
2. Go backend only connects to HTTP/HTTPS MCP servers (SSE or Streamable HTTP) — no stdio in-cluster
3. MCP config in-cluster comes from Helm values / ConfigMap (admin-only)
4. Tool approval enforced server-side in Go backend using `HEADLAMP_BACKEND_TOKEN` pattern

## Phases

### Phase 1: MCPClientInterface abstraction

**Effort:** Small

Extract interface from `ElectronMCPClient` so both it and `HTTPMCPClient` share a contract:

```typescript
interface MCPClientInterface {
  isAvailable(): boolean;
  getTools(): Promise<MCPTool[]>;
  executeTool(name: string, args: Record<string, any>): Promise<any>;
  getStatus(): Promise<{ isInitialized: boolean; hasClient: boolean }>;
  resetClient(): Promise<boolean>;
}
```

- `ToolManager` depends on `MCPClientInterface` instead of `ElectronMCPClient` directly
- Desktop and CLI unchanged

### Phase 2: Go backend MCP proxy

**Effort:** Medium — this is the core work

Add MCP proxy endpoints to the Headlamp Go backend:

```
POST /api/v1/mcp/tools     → list tools from all configured MCP servers
POST /api/v1/mcp/execute   → execute a tool (with approval check)
GET  /api/v1/mcp/status    → connection status
POST /api/v1/mcp/reset     → reconnect to MCP servers
```

**Authentication:** Reuse `checkHeadlampBackendToken` for desktop/headless mode. In-cluster mode uses existing Headlamp auth (Bearer token / OIDC cookie) — same as every other Headlamp API endpoint.

**Tool approval (backend-side):**
- Frontend sends tool execution request with user's approval decision
- Backend validates the approval token before forwarding to MCP server
- Admin can pre-approve specific tools via ConfigMap (e.g., all read-only tools)
- Backend logs every tool execution with user identity for audit

**MCP server connections:** Go backend uses [mcp-go](https://github.com/mark3labs/mcp-go) SDK to connect to MCP servers via SSE or Streamable HTTP. No stdio support in-cluster.

**Config source:**
- In-cluster: ConfigMap mounted as file (from Helm `ai.mcp.servers`)
- Headless: local `mcp-tools-settings.json` passed via env var at startup
- Endpoints disabled when no MCP config is present

### Phase 3: HTTPMCPClient for browser

**Effort:** Small

```typescript
class HTTPMCPClient implements MCPClientInterface {
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !window.desktopApi;
  }

  async executeTool(name: string, args: Record<string, any>): Promise<any> {
    const resp = await fetch('/api/v1/mcp/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeadlampAPIHeaders() },
      body: JSON.stringify({ toolName: name, args }),
    });
    return resp.json();
  }
}
```

Uses `getHeadlampAPIHeaders()` to include `X-HEADLAMP_BACKEND-TOKEN` automatically.

### Phase 4: Helm/ConfigMap configuration

**Effort:** Small

```yaml
# values.yaml
ai:
  mcp:
    enabled: false
    servers:
      - name: "my-mcp-server"
        url: "https://mcp-server.internal:8080/sse"
        transport: "sse"    # or "streamable-http"
        enabled: true
    # Tool approval settings
    preApprovedTools: []     # tools that skip user approval (e.g., read-only)
    rateLimit: 60            # max tool calls per user per minute
    timeoutSeconds: 120      # max execution time per tool call
```

Maps to a ConfigMap that the Go backend reads.

### Phase 5: AI provider configuration

**Effort:** Small — independent of MCP

```yaml
ai:
  provider: ""            # openai, anthropic, ollama, etc.
  model: ""
  apiKeySecret: ""        # K8s Secret name
  baseUrl: ""             # for Ollama or custom endpoints
```

API keys stay in K8s Secrets, read by backend only. Frontend never sees them.

### Phase 6: Headless mode integration

**Effort:** Small — depends on Phase 2+3

When `--headless`, Electron main process passes MCP settings to the Go backend via env var or temp config file. System browser uses `HTTPMCPClient` (auto-detected because `window.desktopApi` is absent).

## MCP Type Extensions

```typescript
interface MCPServer {
  name: string;
  enabled: boolean;

  // HTTP/HTTPS transport (in-cluster + headless)
  url?: string;
  transport?: 'sse' | 'streamable-http';
  headers?: Record<string, string>;
  authSecretRef?: string;   // K8s Secret name for auth tokens

  // stdio transport (desktop + CLI only)
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}
```

## Transport Support

| Transport | Desktop | Headless | In-Cluster | CLI |
|-----------|---------|----------|------------|-----|
| stdio | ✅ | ❌ | ❌ | ✅ |
| SSE | ❌ | ✅ | ✅ | ❌ |
| Streamable HTTP | ❌ | ✅ | ✅ | ❌ |

## Security Analysis (STRIDE)

### S — Spoofing

| Threat | Mitigation |
|--------|------------|
| Unauthenticated MCP proxy call (in-cluster) | All `/api/v1/mcp/*` endpoints require existing Headlamp auth (Bearer token / OIDC). Return 401 otherwise. |
| Unauthenticated MCP proxy call (headless) | `checkHeadlampBackendToken` — same pattern as Helm/plugin routes. Backend binds to localhost. |
| Rogue MCP server impersonation | Only connect to servers in admin-managed ConfigMap. TLS required; reject plain HTTP unless explicitly overridden. |

### T — Tampering

| Threat | Mitigation |
|--------|------------|
| User adds malicious MCP server (in-cluster) | No config endpoint. MCP server list is read-only from frontend. Changes require Helm upgrade. |
| Tool argument injection | Validate `toolName` against known server tools. Validate args against tool `inputSchema`. |
| Poisoned tool output influences LLM | Treat all tool output as untrusted content. Never allow it to override system prompts. |

### R — Repudiation

| Threat | Mitigation |
|--------|------------|
| Unaudited tool execution (in-cluster) | Structured JSON logs: user identity, tool name, args summary, result status, timestamp. |
| Cannot attribute AI actions to user | Backend associates every tool call with the authenticated user from the HTTP request. |

### I — Information Disclosure

| Threat | Mitigation |
|--------|------------|
| API keys leaked to browser | Keys in K8s Secrets, read by backend only. Frontend gets provider name + model, never keys. |
| MCP server credentials exposed | `authSecretRef` references K8s Secret. Backend resolves it server-side. |
| Tool leaks cluster data to wrong user | MCP tools that call K8s API use requesting user's token, not service account. |

### D — Denial of Service

| Threat | Mitigation |
|--------|------------|
| Tool call flooding | Per-user rate limit (configurable, default 60/min). |
| Long-running tool blocks resources | Server-side timeout (configurable, default 2 min). Global concurrency limit. |

### E — Elevation of Privilege

| Threat | Mitigation |
|--------|------------|
| Tool runs with service account privileges | MCP tools use requesting user's Bearer token for K8s API calls. |
| Prompt injection triggers dangerous tools | Tool approval flow. Admin pre-approves read-only tools; write tools require explicit user approval. |

### OWASP Mapping

Key threats map to:
- **OWASP LLM Top 10:** LLM-01 (Prompt Injection), LLM-02 (Sensitive Info Disclosure), LLM-06 (Excessive Agency), LLM-10 (Unbounded Consumption)
- **OWASP Agentic AI Top 10:** ASI-01 (Goal Hijack), ASI-03 (Identity Abuse), ASI-04 (Supply Chain)
- **OWASP MCP Top 10:** MCP-02 (Privilege Escalation), MCP-05 (Command Injection), MCP-07 (Insufficient Auth), MCP-09 (Shadow Servers)

## Backward Compatibility

1. **Desktop app** — `ElectronMCPClient` unchanged. stdio transport continues to work.
2. **CLI** — `MultiServerMCPClient` in-process. No changes.
3. **Headless** — New: Go backend proxy + `HTTPMCPClient`. Electron passes config to backend.
4. **In-cluster** — New: Go backend proxy + `HTTPMCPClient`. HTTP/HTTPS MCP servers only.

## Implementation Priority

1. Phase 1 (MCPClientInterface) — prerequisite, small refactor
2. Phase 3 (HTTPMCPClient) — can develop against mock backend
3. Phase 2 (Go backend proxy) — core work, enables headless + in-cluster
4. Phase 6 (Headless integration) — small once Phase 2+3 done
5. Phase 4 (Helm config) — in-cluster configuration
6. Phase 5 (AI provider config) — independent of MCP

## Open Questions

1. **Per-user vs shared MCP config in-cluster** — Shared ConfigMap (simpler, admin-controlled) vs per-user stored in backend?
2. **AI provider proxy** — Should the backend proxy all AI API calls (keys server-side) or let the frontend call providers directly?
3. **SSE/HTTP transport for desktop** — Should the desktop app also gain HTTP transport for remote MCP servers via the Go backend?
