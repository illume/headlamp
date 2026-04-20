# Proposal: Backend runCommand

## Summary

Extend Headlamp's `runCommand` to work through the Go backend, so plugins can run approved local commands in headless and (potentially) in-cluster modes — not just Electron.

Today `runCommand` only works in the Electron desktop app via IPC. This proposal adds an HTTP-based equivalent that reuses the same security model: permission secrets, command allowlists, and user consent.

## How runCommand works today (Electron only)

```
Plugin code                    Electron main process
──────────                     ─────────────────────
pluginRunCommand('minikube',   ──IPC──►  handleRunCommand()
  ['status'], {})                         │
                                          ├─ checkPermissionSecret()
                                          ├─ validateCommandData()
                                          ├─ checkCommandConsent()
                                          │
                                          └─ spawn('minikube', ['status'])
                                               │
stdout/stderr/exit  ◄──IPC──────────────────────┘
```

**Security layers (see `app/electron/runCmd.ts`):**

1. **Permission secrets** — Random numbers generated per command type at startup. Sent to renderer once via IPC. Plugin loader distributes only matching secrets to authorized plugins. Plugins run in `new Function()` scope and cannot access other plugins' secrets.

2. **Command allowlist** — `validateCommandData()` only accepts `['minikube', 'az', 'scriptjs']`.

3. **User consent** — `checkCommandConsent()` shows Electron dialog on first use, saves choice to settings file.

4. **Script path validation** — `scriptjs` commands must resolve to paths within the plugins directory.

## Proposal: HTTP-based runCommand through Go backend

```
Plugin code                    Go backend (/api/v1/run-command)
──────────                     ────────────────────────────────
pluginRunCommand('minikube',   ──HTTP──►  handleRunCommand()
  ['status'], {})                          │
                                           ├─ checkPermissionSecret (X-RunCmd-Permission-Secret header)
                                           ├─ checkHeadlampBackendToken (X-HEADLAMP_BACKEND-TOKEN header)
                                           ├─ validateCommand (allowlist)
                                           ├─ checkConsent (stored in backend config)
                                           │
                                           └─ exec.Command('minikube', ['status'])
                                                │
stdout/stderr/exit  ◄──WebSocket/SSE────────────┘
```

### API endpoints

```
POST /api/v1/run-command/start    Start a command, returns command ID
  Request:  { command, args, options, permissionSecret }
  Response: { id }

GET  /api/v1/run-command/{id}/stream   SSE stream of stdout/stderr/exit events
  Events:   { type: "stdout"|"stderr"|"exit", data: string|number }

POST /api/v1/run-command/{id}/input    Send stdin to running command (optional)
  Request:  { data: string }

GET  /api/v1/run-command/consent       Check if command is pre-approved
  Request:  ?command=minikube&firstArg=status
  Response: { consented: boolean | null }  (null = no stored decision)

POST /api/v1/run-command/consent       Record user's consent decision
  Request:  { command, firstArg, allowed: boolean }
```

### Security layers (mirroring Electron)

**Layer 1 — Permission secrets (plugin isolation):**

```go
// Backend generates random secrets at startup
permissionSecrets := map[string]float64{
    "runCmd-minikube": cryptoRandom(),
    "runCmd-scriptjs-...": cryptoRandom(),
}
```

- Frontend requests secrets via `GET /api/v1/run-command/secrets` (one-time, protected by `HEADLAMP_BACKEND_TOKEN`)
- Plugin loader distributes secrets to authorized plugins via existing `getAllowedPermissions` mechanism
- All `/api/v1/run-command/*` requests must include the matching secret in `X-RunCmd-Permission-Secret` header

**Layer 2 — Backend token (caller authentication):**

- Desktop/headless: `X-HEADLAMP_BACKEND-TOKEN` header (existing `checkHeadlampBackendToken`)
- In-cluster: Bearer token / OIDC (existing Headlamp auth)

**Layer 3 — Command allowlist:**

```go
var validCommands = []string{"minikube", "az", "scriptjs"}

func validateCommand(command string) error {
    for _, valid := range validCommands {
        if command == valid {
            return nil
        }
    }
    return fmt.Errorf("invalid command: %s", command)
}
```

**Layer 4 — User consent (backend-managed):**

- Instead of Electron dialog: frontend shows a consent UI, sends decision to `POST /api/v1/run-command/consent`
- Backend persists consent in config file (headless) or ConfigMap (in-cluster)
- Pre-approved commands can be configured via Helm values

**Layer 5 — Mode gating:**

- `!useInCluster`: stdio commands allowed (headless — user's machine)
- `useInCluster`: stdio commands disabled by default (security risk in shared pod). Admin can opt-in via Helm if the pod is single-tenant.

### Frontend changes

The existing `runCommand` function (`frontend/src/components/App/runCommand.ts`) only works with `window.desktopApi`. The backend version would add an HTTP fallback:

```typescript
export function runCommand(
  command: 'minikube' | 'az' | 'scriptjs',
  args: string[],
  options: {},
  permissionSecrets?: Record<string, number>,
  desktopApiSend?: Function,
  desktopApiReceive?: Function
) {
  // Existing path: Electron IPC
  if (window.desktopApi && desktopApiSend && desktopApiReceive) {
    return runCommandViaIPC(command, args, options, permissionSecrets, desktopApiSend, desktopApiReceive);
  }

  // New path: HTTP backend
  return runCommandViaHTTP(command, args, options, permissionSecrets);
}

function runCommandViaHTTP(
  command: string,
  args: string[],
  options: {},
  permissionSecrets?: Record<string, number>
) {
  const permissionName = `runCmd-${command}`;
  const secret = permissionSecrets?.[permissionName];

  if (secret === undefined) {
    throw new Error(`No permission secret for command: ${command}`);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...getHeadlampAPIHeaders(),
    'X-RunCmd-Permission-Secret': String(secret),
  };

  const stdout = new EventTarget();
  const stderr = new EventTarget();
  const exit = new EventTarget();

  // Start the command, then stream output via fetch + ReadableStream
  // (EventSource cannot set custom headers, so we use fetch-based SSE)
  (async () => {
    const startResp = await fetch('/api/v1/run-command/start', {
      method: 'POST',
      headers,
      body: JSON.stringify({ command, args, options }),
    });
    if (!startResp.ok) {
      exit.dispatchEvent(new CustomEvent('exit', { detail: 1 }));
      return;
    }
    const { id } = await startResp.json();

    // Stream output using fetch (supports auth headers, unlike EventSource)
    const streamResp = await fetch(`/api/v1/run-command/${id}/stream`, { headers });
    const reader = streamResp.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      // Parse SSE events from text (simplified — real impl needs SSE parser)
      for (const line of text.split('\n')) {
        if (line.startsWith('event: stdout')) {
          // next data: line has the payload
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6);
          stdout.dispatchEvent(new CustomEvent('data', { detail: data }));
        }
      }
    }
  })();

  return {
    stdout: { on: (event, listener) => stdout.addEventListener(event, (e) => listener(e.detail)) },
    stderr: { on: (event, listener) => stderr.addEventListener(event, (e) => listener(e.detail)) },
    on: (event, listener) => exit.addEventListener(event, (e) => listener(e.detail)),
  };
}
```

### Plugin loader changes

The `getAllowedPermissions` callback in `frontend/src/plugin/index.ts` already distributes secrets per-plugin. For the backend path, the same mechanism works — the plugin loader requests secrets from the backend instead of Electron IPC:

```typescript
export async function permissionSecretsFromApp(): Promise<Record<string, number>> {
  const { desktopApi } = window;

  if (desktopApi) {
    // Existing: get secrets from Electron
    return new Promise(resolve => {
      desktopApi.receive('plugin-permission-secrets', resolve);
      desktopApi.send('request-plugin-permission-secrets');
    });
  }

  // New: get secrets from Go backend
  const resp = await fetch('/api/v1/run-command/secrets', {
    headers: getHeadlampAPIHeaders(),
  });
  if (resp.ok) {
    return resp.json();
  }
  return {};
}
```

### Consent UI — why React dialogs are not safe

In Electron, `checkCommandConsent` shows a **native OS dialog** (`dialog.showMessageBoxSync`). This is critical for security — the dialog runs in the main process, outside the renderer's JavaScript context, so no plugin or script in the page can programmatically dismiss or approve it.

**A React dialog in the same page is not safe for consent.** Any JavaScript running in the page context — including a compromised or malicious plugin — could:
- Intercept the React component render and auto-approve
- Directly call the consent API endpoint without showing any UI
- Manipulate the DOM to hide/approve the dialog

**Recommended alternatives for headless/in-cluster consent:**

| Approach | Pros | Cons | Best for |
|----------|------|------|----------|
| **Admin pre-approval via config** | No runtime UI needed, simple | No per-user consent, all-or-nothing | In-cluster (admin controls config) |
| **Separate browser tab/popup** | Isolated JS context, cannot be manipulated by page scripts | Popup blockers may interfere, worse UX | Headless (single user, local machine) |
| **Backend-managed allowlist only** | Server-side enforcement, no client trust | No interactive consent, admin must pre-configure | All modes (defense-in-depth) |

**Recommendation:**

1. **In-cluster**: Admin pre-approves commands via Helm values (`runCommand.preApprovedCommands`). No runtime consent dialog. Unauthorized commands are rejected by the backend with 403.
2. **Headless**: Backend rejects commands not in the allowlist. For new commands, the headless Go backend can prompt via terminal stdout/stdin (same trust boundary as Electron — user's machine). The browser UI shows a status message ("Waiting for approval in terminal...") but the actual consent happens server-side.
3. **Defense-in-depth**: Even with valid consent, the permission secret check ensures only the authorized plugin can call the endpoint.

```
Consent flow (headless):
  Plugin calls runCommand ──HTTP──► Go backend
                                      ├─ checkPermissionSecret ✓
                                      ├─ checkHeadlampBackendToken ✓
                                      ├─ checkAllowlist ✓
                                      ├─ checkConsent
                                      │   └─ Not consented?
                                      │       ├─ Print to terminal: "Allow minikube status? [y/N]"
                                      │       └─ Wait for terminal input
                                      └─ spawn('minikube', ['status'])

Consent flow (in-cluster):
  Plugin calls runCommand ──HTTP──► Go backend
                                      ├─ checkPermissionSecret ✓
                                      ├─ checkBearerToken ✓
                                      ├─ checkAllowlist ✓
                                      ├─ checkPreApproved (from Helm config)
                                      │   └─ Not pre-approved? → 403 Forbidden
                                      └─ exec.Command(...)
```

## Could MCP use runCommand directly?

**Short answer: No for tool execution. Partially for the security model.**

MCP and `runCommand` have fundamentally different communication patterns. Reusing the `runCommand` infrastructure for MCP tool execution would require significant rearchitecting that yields no benefit. However, the **security model** (permission secrets, allowlists, consent) should absolutely be shared.

### Why the execution models don't match

| Aspect | runCommand | MCP stdio server | MCP HTTP server |
|--------|-----------|-----------------|----------------|
| **Process lifetime** | Short-lived (one per invocation) | Long-lived (one per session, serves many tool calls) | External service (always running) |
| **Communication** | Unidirectional streaming (stdout/stderr → caller) | Bidirectional JSON-RPC over stdin/stdout | HTTP request/response |
| **Protocol** | Raw text streams | JSON-RPC 2.0 with structured messages | SSE or Streamable HTTP |
| **Multiplexing** | One command = one process | One process = many concurrent tool calls | One server = many concurrent tool calls |
| **Return value** | Exit code + stream data | Structured JSON-RPC response per tool call | HTTP response body |

**runCommand spawns a new process per invocation.** When a plugin calls `pluginRunCommand('minikube', ['status'], {})`, Electron spawns `minikube status`, streams its output, and the process exits. Each call is independent.

**MCP stdio keeps one process running for many tool calls.** `MultiServerMCPClient` spawns the MCP server process once (e.g., `npx @modelcontextprotocol/server-filesystem`), keeps it running, and sends JSON-RPC requests over stdin / reads responses from stdout. The process stays alive across hundreds of tool calls.

```
runCommand pattern (one process per call):
  pluginRunCommand('minikube', ['status']) → spawn → stdout stream → exit
  pluginRunCommand('minikube', ['start'])  → spawn → stdout stream → exit

MCP stdio pattern (one process, many calls):
  spawn server process once
    ├── JSON-RPC request: list_tools    → JSON-RPC response
    ├── JSON-RPC request: call_tool(A)  → JSON-RPC response
    ├── JSON-RPC request: call_tool(B)  → JSON-RPC response
    └── ... (process stays running)
```

### What COULD be shared

Even though the execution model is different, these aspects of `runCommand` can be reused for MCP:

1. **Permission secret generation and distribution** — Same `cryptoRandom()` approach, same `getAllowedPermissions` gatekeeper in the plugin loader. MCP just needs its own secret names (`mcp-execute`, `mcp-tools`) alongside the existing `runCmd-*` names.

2. **Backend token authentication** — Same `checkHeadlampBackendToken` middleware on MCP endpoints.

3. **Consent storage** — Same `confirmedCommands` pattern in settings, extended with a `confirmedMcpTools` section.

4. **Command/tool allowlist validation** — Same concept: `runCommand` validates against `['minikube', 'az', 'scriptjs']`, MCP validates against admin-configured server/tool list.

### What would break if we forced MCP through runCommand

If we tried to implement MCP tool calls as `runCommand` invocations:

- **Each tool call would spawn a new MCP server process**, wait for initialization, execute one tool, then kill it. This turns a ~5ms tool call into a ~2-5 second operation (MCP servers need time to start, discover tools, etc.).
- **No connection reuse.** MCP servers often maintain state (open files, database connections, cached data). Killing and restarting per call loses all state.
- **JSON-RPC framing lost.** `runCommand` streams raw text. MCP needs structured JSON-RPC messages with request IDs, error codes, and typed responses. We'd have to build a parser on top of `runCommand`'s text streams.
- **Bidirectional communication impossible.** `runCommand` can only read stdout/stderr — it cannot write to stdin. MCP requires writing JSON-RPC requests to stdin.

### Recommendation

**Share the security model, not the execution path.**

```
Shared security layer (permission secrets + backend token + consent):
┌─────────────────────────────────────────────────┐
│  getAllowedPermissions() in plugin loader        │
│  checkHeadlampBackendToken() in Go backend      │
│  confirmedCommands / confirmedMcpTools           │
└─────────────────────────────────────────────────┘
         │                           │
    runCommand path              MCP path
    (short-lived spawn)          (long-lived JSON-RPC)
         │                           │
  POST /run-command/start     POST /mcp/execute
  GET  /run-command/stream    POST /mcp/tools
```

The Go backend should have **two separate subsystems** that share a common auth/permission layer:
- `runCommandHandler` — spawns short-lived processes, streams output (for minikube, az, scriptjs)
- `mcpHandler` — manages long-lived MCP server connections (stdio or HTTP), executes JSON-RPC tool calls

Both validate permission secrets from the same pool, both check `HEADLAMP_BACKEND_TOKEN`, both log to the same audit system.

## Relationship to MCP

MCP tool execution through the backend uses the same permission secret pattern as `runCommand`. The two systems are complementary:

| Aspect | runCommand | MCP |
|--------|-----------|-----|
| What it does | Runs local commands (minikube, az) | Calls MCP server tools |
| Permission secret name | `runCmd-minikube` | `mcp-execute` |
| Which plugin gets it | `@headlamp-k8s/minikube` | `@headlamp-k8s/ai-assistant` |
| Backend endpoint | `/api/v1/run-command/*` | `/api/v1/mcp/*` |
| Command allowlist | `['minikube', 'az', 'scriptjs']` | Admin-configured MCP servers |
| stdio in-cluster | Disabled by default | Disabled (HTTP only) |

Both share:
- The `getAllowedPermissions` gatekeeper in the plugin loader
- The `checkHeadlampBackendToken` / K8s auth for caller authentication
- Backend-managed consent storage
- Structured audit logging

## Implementation phases

1. **Go backend endpoints** — `POST /start`, `GET /stream`, `POST /consent` with permission secret validation
2. **Frontend HTTP fallback** — `runCommandViaHTTP` alongside existing IPC path
3. **Plugin loader backend secrets** — `permissionSecretsFromApp` fetches from backend when not in Electron
4. **Consent UI** — React dialog for headless/in-cluster (replaces Electron native dialog)
5. **Helm configuration** — `runCommand.enabled`, `runCommand.allowedCommands`, `runCommand.preApprovedCommands`

## Open questions

1. **WebSocket vs SSE for streaming** — SSE is simpler (unidirectional) but WebSocket supports stdin. Could start with SSE and add WebSocket later if stdin is needed.
2. **In-cluster runCommand** — Should this be disabled entirely, or configurable per-command? The minikube plugin doesn't make sense in-cluster, but future plugins might need local commands.
3. **Terminal consent UX** — For headless, the Go backend prompts via terminal. Should there be a timeout (e.g., 30s auto-deny)? Should previously-consented commands be remembered in a config file?
