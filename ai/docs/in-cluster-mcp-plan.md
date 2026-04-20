# Plan: MCP Support Across All Headlamp Runtime Modes

## Recommendation

**Use the Go backend as MCP proxy in all non-desktop modes, with plugin-isolated permission secrets modeled on the existing `runCommand` security system.**

| Mode | MCP transport | Auth | stdio? |
|------|--------------|------|--------|
| **Desktop** (Electron) | Electron IPC → stdio | Permission secrets via IPC | ✅ |
| **Headless** (`--headless`) | Go backend → stdio or HTTP | `HEADLAMP_BACKEND_TOKEN` + permission secrets | ✅ |
| **In-cluster** (K8s pod) | Go backend → HTTP/HTTPS only | Bearer/OIDC + permission secrets | ❌ |
| **CLI** (`headlamp-ai`) | In-process | N/A (single user) | ✅ |

### Why this approach

- **Headless gets stdio.** The Go backend runs on the user's machine — same trust boundary as Electron. It can safely spawn MCP child processes, just like Electron spawns `minikube`.
- **In-cluster stays HTTP-only.** No child process spawning inside a shared pod. MCP servers are standalone services reachable by URL.
- **Plugin isolation reuses the `runCommand` permission secret pattern.** Electron already generates per-command random tokens, sends them once to the renderer, and the plugin loader distributes only matching secrets to each plugin. The same pattern works for MCP: only the ai-assistant plugin receives the MCP permission secret.
- **Backend-side approval mirrors Electron's consent flow.** Instead of an Electron dialog, the backend checks the permission secret + approval token before executing a tool.

### Alternatives considered

| Approach | Pros | Cons | Why not chosen |
|----------|------|------|----------------|
| **A. Backend proxy + permission secrets** (chosen) | Reuses proven `runCommand` isolation pattern, supports stdio in headless, HTTP in-cluster, centralized audit | Backend must manage MCP connections and child processes | Pattern already exists in Electron; Go implementation is straightforward |
| **B. HTTP-only everywhere (no headless stdio)** | Simpler backend — no process spawning | Breaks existing stdio MCP servers in headless mode; forces users to deploy HTTP wrappers | Unnecessary limitation when backend runs on user's machine |
| **C. Sidecar stdio servers (in-cluster)** | Supports stdio MCP servers unchanged | Requires sidecar containers, shared volumes, complex Helm templates | Operational complexity outweighs benefit |
| **D. Go backend spawns stdio in-cluster** | Supports stdio without sidecars | Arbitrary command execution inside the pod, violates least-privilege | Unacceptable security risk in multi-user clusters |
| **E. Frontend connects directly to MCP servers** | No backend proxy needed | Exposes MCP server URLs/tokens to browser, CORS issues, no centralized auth | Breaks security model for multi-user deployments |

### Key tradeoffs

- **Headless gets stdio, in-cluster does not.** Headless runs on the user's machine (single-user, same trust as Electron). In-cluster runs in a shared pod (multi-user). The trust boundary determines what's safe.
- **Backend becomes a proxy** — adds ~1ms latency but gains centralized auth, approval, audit logging, and rate limiting.
- **Permission secrets add per-plugin isolation** — prevents other plugins from calling MCP tools, even if they share the same browser context. This is the same defense-in-depth used for `runCommand`. See also [Backend runCommand Proposal](./backend-run-command-proposal.md) for how this pattern extends to general `runCommand` through the backend.

---

## Problem

MCP support currently only works in the **Electron desktop app** via Electron IPC + stdio child processes. It needs to work in all four Headlamp runtime modes:

| Mode | MCP today | MCP with this plan |
|------|-----------|-------------------|
| **Desktop app** (Electron) | ✅ Works | ✅ Unchanged |
| **Headless** (`--headless`) | ⚠️ No `window.desktopApi` in browser | ✅ Via Go backend proxy (stdio + HTTP) |
| **In-cluster** (K8s pod) | ❌ No Electron | ✅ Via Go backend proxy (HTTP/HTTPS MCP servers only) |
| **CLI** (`headlamp-ai`) | ✅ Works | ✅ Unchanged |

## Architecture

```
Desktop app          Headless                In-cluster             CLI
─────────────        ────────                ──────────             ─────
ElectronMCPClient    HTTPMCPClient           HTTPMCPClient          Direct
      │                    │                      │                   │
  Electron IPC        Go backend              Go backend          In-process
      │              /api/v1/mcp/*           /api/v1/mcp/*             │
 stdio child         ┌─────┴──────┐         ┌─────┴──────┐      stdio child
 processes           │            │         │            │      processes
               stdio child   SSE/HTTP   SSE servers  Streamable
               processes     servers    (remote)     HTTP servers
```

**Key design decisions:**
1. Plugin auto-detects mode: `window.desktopApi` → `ElectronMCPClient`, else → `HTTPMCPClient`
2. Headless: Go backend spawns stdio child processes (same machine, single-user trust) AND connects to HTTP/HTTPS MCP servers
3. In-cluster: Go backend connects to HTTP/HTTPS MCP servers only — no stdio
4. MCP config in-cluster comes from Helm values / ConfigMap (admin-only)
5. Plugin isolation via permission secrets — only the ai-assistant plugin receives MCP tokens (same pattern as `runCommand`, see [runCmd security research](#runcmd-security-research))

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

**Authentication:**
- Desktop/headless: reuse `checkHeadlampBackendToken` (random hex token generated by Electron, shared with Go backend via env var, sent by frontend in `X-HEADLAMP_BACKEND-TOKEN` header)
- In-cluster: use existing Headlamp auth (Bearer token / OIDC cookie) — same as every other Headlamp API endpoint. No `HEADLAMP_BACKEND_TOKEN` needed because auth is handled by K8s/OIDC.

**Tool approval (backend-side):**
- Backend validates the permission secret + HEADLAMP_BACKEND_TOKEN/Bearer auth before executing any tool
- **In-cluster:** Admin pre-approves tools via ConfigMap (Helm values). No runtime consent dialog — unapproved tools return 403.
- **Headless (terminal visible):** Backend prompts via terminal stdout/stdin for first-time tool approval (same trust boundary as Electron — user's machine).
- **Headless (no terminal, e.g., desktop icon):** Backend opens a same-port COOP popup for consent. Uses `Cross-Origin-Opener-Policy: same-origin` to sever the opener, Fetch Metadata filtering to block programmatic access, server-side nonce to prevent direct approval, and Service Worker registration blocking. Popup is inherently immune to clickjacking. No second port needed. See [detailed security analysis](./backend-run-command-proposal.md#could-a-same-port-popup-work-coop--fetch-metadata--sw-blocking).
- **Why not a React dialog?** A React consent dialog runs in the same JavaScript context as plugins. A malicious plugin could programmatically approve it, auto-click it, or bypass it entirely by calling the API directly. Same-origin popups without COOP are equally insecure. The COOP popup approach creates effective isolation on a single port. See [full analysis](./backend-run-command-proposal.md#approach-1-in-page-react-dialog--not-secure-).
- Backend logs every tool execution with user identity for audit

**MCP server connections:**
- Headless: Go backend uses [mcp-go](https://github.com/mark3labs/mcp-go) SDK to connect to MCP servers via SSE or Streamable HTTP, AND spawns stdio child processes for stdio MCP servers (safe because backend runs on user's machine)
- In-cluster: HTTP/HTTPS only — no stdio child process spawning

**Plugin isolation (permission secrets):**
- Backend generates a random MCP permission secret at startup (like Electron's `permissionSecrets`)
- Secret is sent to the frontend once (via `GET /api/v1/mcp/permission-secret`, protected by `HEADLAMP_BACKEND_TOKEN` or K8s auth)
- Plugin loader distributes the secret only to the ai-assistant plugin (same `getAllowedPermissions` mechanism as `runCommand`)
- All `/api/v1/mcp/*` requests must include the permission secret in `X-MCP-Permission-Secret` header
- This ensures only the ai-assistant plugin can call MCP endpoints, even if other plugins share the same browser context

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

### Phase 7: Headless stdio support

**Effort:** Medium — depends on Phase 2+6

Add stdio child process spawning to the Go backend for headless mode:

- Backend reads MCP server configs from the settings file passed by Electron
- For servers with `command` (stdio transport): spawn child process, communicate via stdin/stdout
- For servers with `url` (HTTP transport): connect via SSE or Streamable HTTP
- Gate stdio spawning on `!useInCluster` — only when backend runs on user’s machine
- Apply same command consent logic as Electron: check `confirmedCommands` in settings, prompt user on first use

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

  // stdio transport (desktop, headless, + CLI)
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}
```

## Transport Support

| Transport | Desktop | Headless | In-Cluster | CLI |
|-----------|---------|----------|------------|-----|
| stdio | ✅ | ✅ | ❌ | ✅ |
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

## runCmd Security Research

The existing `runCommand` system in Electron uses a multi-layered security model that can be adapted for MCP. Here is how it works today and how it maps to MCP.

### How runCommand works today (Electron)

**Layer 1 — Permission secrets (plugin isolation):**
- Electron main process generates random numbers per command type at startup (`setupRunCmdHandlers` in `app/electron/runCmd.ts`)
- Secrets are sent to the renderer exactly once via IPC (`plugin-permission-secrets` channel)
- The plugin loader (`frontend/src/plugin/index.ts`) distributes only matching secrets to each plugin via `getAllowedPermissions`
- Each plugin gets a pre-bound `pluginRunCommand` that embeds private copies of `desktopApi.send`/`receive` and the plugin's allowed secrets
- Plugins run in a sandboxed `new Function()` scope and cannot access the parent scope's `permissionSecrets` variable
- Defense: a malicious plugin cannot call `runCommand` because it doesn't have the correct permission secret

**Layer 2 — Command allowlist:**
- `validateCommandData` only accepts `['minikube', 'az', 'scriptjs']`
- Defense: even with a valid secret, only pre-approved commands can run

**Layer 3 — User consent (Electron dialog):**
- `checkCommandConsent` shows an Electron dialog on first use, saves the user's choice to settings
- Defense: user must explicitly approve each command; choice is persisted

**Layer 4 — Script path validation:**
- `scriptjs` commands must resolve to a path within the plugins directory
- Defense: prevents arbitrary script execution outside plugin boundaries

### How this maps to MCP

| runCommand layer | MCP equivalent |
|------------------|----------------|
| Permission secrets (per-plugin random token) | MCP permission secret — backend generates random token, distributed only to ai-assistant plugin via `getAllowedPermissions` |
| Command allowlist (`['minikube', 'az', 'scriptjs']`) | Tool allowlist — backend only executes tools from admin-configured MCP servers |
| User consent (Electron dialog) | Tool approval flow — frontend shows approval dialog, backend validates approval before execution |
| Script path validation | N/A for HTTP MCP; for stdio, validate command against allowlist in MCP config |

### Key insight: only one plugin gets MCP access

The `getAllowedPermissions` callback in the plugin loader is the gatekeeper. Today it checks `identifyPackages` to match `@headlamp-k8s/minikube`. For MCP, it would additionally check for the ai-assistant plugin and distribute the MCP permission secret only to it:

```typescript
// In getAllowedPermissions callback (frontend/src/plugin/index.ts)
if (isPackage['@headlamp-k8s/ai-assistant']) {
  secretsToReturn['mcp-execute'] = secrets['mcp-execute'];
  secretsToReturn['mcp-tools'] = secrets['mcp-tools'];
}
```

This ensures that even if a malicious plugin tries to call `/api/v1/mcp/execute`, it cannot because it doesn't have the `mcp-execute` permission secret.

For a detailed proposal on extending `runCommand` itself to work through the Go backend (not just MCP), see [Backend runCommand Proposal](./backend-run-command-proposal.md).

### Could MCP use runCommand for tool execution?

**No.** The execution models are fundamentally different — see [detailed analysis](./backend-run-command-proposal.md#could-mcp-use-runcommand-directly) in the backend runCommand proposal. In short:

- `runCommand` spawns a **short-lived process per call** and streams raw text. MCP stdio keeps a **long-lived process running** and uses **bidirectional JSON-RPC**.
- Forcing MCP through `runCommand` would mean spawning a new MCP server per tool call (~2-5s overhead vs ~5ms), losing connection state, and requiring a JSON-RPC parser on top of text streams.
- **The security model should be shared** (permission secrets, backend token, consent), **not the execution path.** The Go backend should have two subsystems (`runCommandHandler` + `mcpHandler`) behind a common auth layer.

## Backward Compatibility

1. **Desktop app** — `ElectronMCPClient` unchanged. stdio transport continues to work.
2. **CLI** — `MultiServerMCPClient` in-process. No changes.
3. **Headless** — New: Go backend proxy + `HTTPMCPClient`. Supports stdio (via backend child processes) and HTTP MCP servers.
4. **In-cluster** — New: Go backend proxy + `HTTPMCPClient`. HTTP/HTTPS MCP servers only.

## Implementation Priority

1. Phase 1 (MCPClientInterface) — prerequisite, small refactor
2. Phase 3 (HTTPMCPClient) — can develop against mock backend
3. Phase 2 (Go backend proxy) — core work, enables headless + in-cluster
4. Phase 6 (Headless integration) — small once Phase 2+3 done
5. Phase 4 (Helm config) — in-cluster configuration
6. Phase 7 (Headless stdio) — adds stdio spawning to Go backend for headless
7. Phase 5 (AI provider config) — independent of MCP

## Open Questions

1. **Per-user vs shared MCP config in-cluster** — Shared ConfigMap (simpler, admin-controlled) vs per-user stored in backend?
2. **AI provider proxy** — Should the backend proxy all AI API calls (keys server-side) or let the frontend call providers directly?
3. **SSE/HTTP transport for desktop** — Should the desktop app also gain HTTP transport for remote MCP servers via the Go backend?
