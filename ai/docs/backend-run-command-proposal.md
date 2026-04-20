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

**Layer 4 — User consent (backend-managed, NOT browser-based):**

- **Headless:** Go backend prompts via terminal stdout/stdin (same trust as Electron — user's machine, possibly over SSH). See [consent security analysis](#consent-ui--security-analysis) for why React dialogs are not safe.
- **In-cluster:** Admin pre-approves commands via Helm values. No runtime consent — unapproved commands return 403.
- Backend persists consent in config file (headless). Pre-approved commands configured via Helm values (in-cluster).

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

### Consent UI — security analysis

In Electron, `checkCommandConsent` shows a **native OS dialog** (`dialog.showMessageBoxSync`). This dialog runs in Electron's main process — completely outside the renderer's JavaScript context. No page script can dismiss, approve, or even detect it. This is the gold standard for consent security.

When moving to backend-based `runCommand`, we lose access to Electron's native dialog. The question is: **what consent mechanism is secure enough?**

#### Why consent matters

Without consent, any plugin with a valid permission secret could silently run commands. The consent layer adds **user awareness** — the user explicitly approves "yes, I want minikube to be allowed to run." This is defense-in-depth on top of permission secrets.

#### Background: how browsers isolate UI

Browser-native permission prompts (geolocation, camera, Payment Request API, WebAuthn) are secure because they render **outside the DOM** in browser chrome that page JavaScript cannot access. There is no web API to create custom browser-chrome prompts. Any consent UI that a web app renders inside its own page is accessible to page scripts.

However, the browser's **Same-Origin Policy** provides strong isolation between different origins. Two pages on different origins (including different ports on localhost) cannot access each other's DOM, cookies, or JavaScript state. This is the same security boundary that makes OAuth2 work — the authorization server is on a different origin than the client application.

#### Approach 1: In-page React dialog — NOT SECURE ❌

A React consent dialog renders inside the same DOM and JavaScript context as plugins.

**Attack vectors:**

| Attack | How it works | Difficulty |
|--------|-------------|------------|
| **Direct API call** | Plugin calls `fetch('/api/v1/run-command/consent', { method: 'POST', body: '{"allowed": true}' })` — bypasses the dialog entirely | Trivial |
| **DOM manipulation** | Plugin finds the dialog's "Allow" button via `document.querySelector` and calls `.click()` | Easy |
| **React tree interception** | Plugin monkey-patches `React.createElement` or `useState` to intercept the consent component's state setter | Medium |
| **Global fetch override** | Plugin replaces `window.fetch` to intercept the consent request and auto-approve before it reaches the server | Easy |

**Why CSRF tokens don't help:** A CSRF token prevents *cross-site* forgery — requests from *other* websites. But a malicious plugin runs on the *same* origin. It has the same cookies, same CSRF tokens, same `HEADLAMP_BACKEND_TOKEN`. A CSRF token cannot distinguish between "the user clicked Allow in the dialog" and "a plugin script called the endpoint directly."

**Verdict: ❌ Do not use for security-critical consent.**

#### Approach 2: Same-origin popup (window.open, same port) — NOT SECURE ❌

A `window.open()` popup on the **same** origin (same host and port) provides a visually separate window, but **no security isolation**. The opener can fully access the popup's DOM.

**Why it fails:**
```javascript
// Malicious plugin on localhost:4466
const popup = window.open('/api/v1/consent/abc123');
// Same origin — full DOM access!
popup.document.querySelector('#approve-button').click();  // ✅ works
```

The browser treats same-origin popups identically to iframes in the same page — full mutual DOM access. A `new Function()` sandbox prevents accessing the opener's *scope variables*, but it does NOT prevent a plugin from calling `window.open()` and interacting with the popup's DOM.

**Verdict: ❌ Same origin = no isolation. Same problem as in-page React dialog.**

#### Approach 3: Cross-origin consent on a different port — SECURE ✅

Both iframes and popups on a **different port** (e.g., `localhost:4467` when the app runs on `localhost:4466`) are treated as a **different origin** by the browser. The Same-Origin Policy then enforces isolation. But iframes and popups have different security properties — this section analyzes both.

##### Shared security properties (iframe and popup)

Both cross-origin iframes and popups share these defenses:

| Attack | Attempt | Result | Why |
|--------|---------|--------|-----|
| **Direct API call (fetch/XHR)** | Plugin calls `fetch('http://localhost:4467/consent/abc/approve', {method:'POST'})` | ❌ Blocked | Cross-origin. Consent server sets no `Access-Control-Allow-Origin` headers. Browser blocks the preflight or response. |
| **DOM access** | `iframe.contentDocument.querySelector('#approve').click()` or `popup.document.querySelector(...)` | ❌ Blocked | Cross-origin. Browser throws `SecurityError`. |
| **Read content** | `iframe.contentDocument.body.innerHTML` or `popup.document.body.innerHTML` | ❌ Blocked | Same cross-origin restriction. |
| **postMessage spoofing** | Plugin sends `postMessage({type:'auto-approve'})` to iframe/popup | ❌ No effect | Consent page does not listen for messages from the parent/opener. Consent flows from consent page → consent server (same origin :4467), not from parent → consent page. |
| **Intercept postMessage result** | Plugin listens for `message` events from :4467 | ⚠️ Can observe | Harmless — consent already recorded server-side. Result message is informational only. |

##### Form submission bypass — and how to block it

**Important:** HTML `<form>` submissions bypass CORS. A plugin can create a form targeting the consent endpoint:

```javascript
// Malicious plugin on :4466
const form = document.createElement('form');
form.method = 'POST';
form.action = 'http://localhost:4467/consent/abc123/approve';
document.body.appendChild(form);
form.submit();  // This POST goes through! No CORS block.
```

**Defense: Origin header checking.** The browser automatically sets the `Origin` header on all cross-origin POST requests, including form submissions. JavaScript **cannot forge the `Origin` header** — it is a "forbidden" header name.

- Form submitted from plugin on `:4466` → `Origin: http://localhost:4466` → **consent server rejects**
- Form submitted from inside iframe/popup on `:4467` → `Origin: http://localhost:4467` → **consent server accepts**

```go
func approveConsent(w http.ResponseWriter, r *http.Request) {
    origin := r.Header.Get("Origin")
    expectedOrigin := fmt.Sprintf("http://localhost:%d", consentPort)
    if origin != expectedOrigin && origin != "" {
        http.Error(w, "Invalid origin", http.StatusForbidden)
        return
    }
    // ... process consent
}
```

This closes the form submission bypass for both iframe and popup approaches.

##### Where iframe and popup differ: clickjacking

This is the key security difference between the two approaches.

**Cross-origin iframe (embedded in the page):**

The iframe renders inside the Headlamp page. Plugins control the parent page's DOM, which means they can manipulate the iframe element **from the outside** — even though they can't access its internal DOM.

| Clickjacking attack | How it works | Difficulty |
|---------------------|-------------|------------|
| **Transparent overlay** | Plugin positions a transparent `<div>` over the iframe's "Allow" button. User thinks they're clicking something else, but the click passes through to the iframe button. | Medium |
| **Resize to tiny** | `iframe.style.width = '1px'; iframe.style.height = '1px'` — makes the iframe nearly invisible, then positions it precisely under the user's cursor | Medium |
| **Opacity manipulation** | `iframe.style.opacity = '0.01'` — iframe is functionally invisible but still receives clicks | Easy |
| **Remove and replace** | Plugin removes the real iframe from the DOM and inserts a fake one that auto-approves | Easy (but fake iframe is same-origin, so can't call :4467 — mitigated by Origin check) |
| **Reposition** | Plugin moves the iframe off-screen or behind other elements, then creates a fake visible "consent UI" | Easy |

**Cross-origin popup (separate window):**

The popup is a separate OS-level window. The plugin has **no control** over its position, size, appearance, or z-ordering.

| Clickjacking attack | How it works | Result |
|---------------------|-------------|--------|
| **Transparent overlay** | Can't overlay content on a separate window | ❌ Not possible |
| **Resize** | `popup.resizeTo()` blocked by browsers for cross-origin windows | ❌ Not possible |
| **Opacity** | No API to change another window's opacity | ❌ Not possible |
| **Remove/replace** | Can't remove a window from the DOM (it's not in the DOM) | ❌ Not possible |
| **Reposition** | `popup.moveTo()` blocked by browsers | ❌ Not possible |

**Verdict: Popup is inherently immune to clickjacking. Iframe requires additional defenses.**

##### Hardening the iframe against clickjacking

If same-window UX (iframe) is preferred, these defenses can mitigate clickjacking:

**Defense 1 — Typed confirmation code (strongest):**

Instead of a simple "Allow" button, the consent page displays a random short code and requires the user to type it:

```
┌──────────────────────────────────────────┐
│  Headlamp: Command Approval              │
│                                          │
│  Allow this command to run?              │
│  minikube status                         │
│                                          │
│  Type BLUE42 to confirm:  [________]    │
│                                          │
│  [Confirm]  [Deny]                       │
└──────────────────────────────────────────┘
```

Why this defeats clickjacking:
- The attacker can overlay a transparent div and trick the user into clicking — but they **cannot trick the user into typing a specific random code** they can't see
- The code is displayed inside the cross-origin iframe — the plugin can't read it
- The consent server verifies the typed code matches the generated code
- The code is single-use and expires after 60 seconds

**Defense 2 — Iframe self-check (additional layer):**

The consent page inside the iframe can detect tampering using JavaScript:

```javascript
// Inside the cross-origin iframe on :4467
function checkVisibility() {
  // Check if iframe is being displayed at a reasonable size
  if (window.innerWidth < 200 || window.innerHeight < 100) {
    document.getElementById('approve-form').style.display = 'none';
    document.getElementById('warning').textContent =
      'Consent dialog is too small. Possible tampering detected.';
    return false;
  }
  // Check if the iframe has focus when user interacts
  if (!document.hasFocus()) {
    return false; // Don't process clicks if we don't have focus
  }
  return true;
}

document.getElementById('confirm-btn').addEventListener('click', (e) => {
  if (!checkVisibility()) {
    e.preventDefault();
    return;
  }
  // ... process consent
});
```

**Defense 3 — Frame-busting CSP:**

The consent server sets `Content-Security-Policy: frame-ancestors http://localhost:4466` to allow embedding only from the main app. This doesn't prevent clickjacking BY the main app's plugins, but it prevents third-party sites from embedding the consent page.

##### Head-to-head comparison

| Property | Cross-origin iframe | Cross-origin popup |
|----------|--------------------|--------------------|
| **UX** | ✅ Inline, no window switching | ⚠️ Separate window, may go behind main window |
| **Popup blockers** | ✅ Not affected | ❌ May be blocked unless user-gesture-triggered |
| **DOM access by plugin** | ❌ Blocked (cross-origin) | ❌ Blocked (cross-origin) |
| **fetch/XHR by plugin** | ❌ Blocked (no CORS headers) | ❌ Blocked (no CORS headers) |
| **Form submission by plugin** | ❌ Blocked (Origin header check) | ❌ Blocked (Origin header check) |
| **Clickjacking** | ⚠️ Possible — needs typed code defense | ✅ Not possible — separate OS window |
| **Plugin removes/hides UI** | ⚠️ Can remove iframe from DOM | ✅ Cannot close/hide a separate window |
| **User notices consent** | ⚠️ Inline element may be overlooked | ✅ Separate window is hard to miss |
| **Implementation complexity** | Medium (iframe + typed code + self-check) | Low (just window.open) |

##### Recommendation

**Best UX + security: cross-origin iframe with typed confirmation code.** The typed code defeats clickjacking (the main weakness vs popup) while keeping the consent inline. Falls back to popup if the iframe is removed from the DOM or fails to load.

**Simpler alternative: cross-origin popup.** No clickjacking defense needed. Use if UX tradeoff is acceptable.

Both are secure against direct API bypass (CORS + Origin header) and DOM manipulation (Same-Origin Policy).

##### How it works (both iframe and popup)

```
Main app (localhost:4466)              Consent server (localhost:4467)
────────────────────────               ─────────────────────────────
1. Plugin requests command
   → Backend returns 202 +
     consentUrl + consentId

2. Frontend embeds iframe (or opens popup):
   src='http://localhost:4467
     /consent/{consentId}'
                                       3. Consent page loads
                                          (minimal HTML, no plugins,
                                           no Headlamp JS bundle)

                                       4. Page shows:
                                          "Allow: minikube status?"
                                          "Type BLUE42 to confirm:"
                                          [input] [Confirm] [Deny]

                                       5. User types code + clicks Confirm
                                          → POST /consent/{consentId}/approve
                                            with { code: "BLUE42" }
                                          → Server verifies code
                                          → Server verifies Origin header
                                          → Returns success

                                       6. Consent page calls:
                                          window.parent.postMessage(
                                            {type:'consent-result',
                                             consentId, approved:true},
                                            'http://localhost:4466')

7. Main app receives postMessage
   → Retries the original command
   → Backend sees consent recorded
   → Command executes
```

##### Implementation details

```go
// In Go backend startup
consentPort := findFreePort()  // e.g., 4467
go startConsentServer(consentPort, consentStore)

// Consent server — minimal, no CORS headers
mux := http.NewServeMux()
mux.HandleFunc("GET /consent/{id}", showConsentPage)   // serves minimal HTML
mux.HandleFunc("POST /consent/{id}/approve", approveConsent)
mux.HandleFunc("POST /consent/{id}/deny", denyConsent)
// NO Access-Control-Allow-Origin headers — blocks all cross-origin fetch/XHR
// Origin header checked on POST — blocks cross-origin form submissions
```

Consent page HTML (minimal — no Headlamp bundle, no plugin code, no React):

```html
<!-- Served by consent server on :4467 -->
<html>
<body>
  <h2>Headlamp: Command Approval</h2>
  <p>Allow this command to run?</p>
  <pre>minikube status</pre>
  <p>Type <strong>BLUE42</strong> to confirm:</p>
  <form method="POST" action="/consent/abc123/approve">
    <input type="text" name="code" autocomplete="off" required
           placeholder="Type the code above" />
    <button type="submit">Confirm</button>
    <button type="button" onclick="deny()">Deny</button>
  </form>
  <script>
    // Self-check: hide form if iframe is suspiciously small
    if (window.innerWidth < 200 || window.innerHeight < 100) {
      document.querySelector('form').style.display = 'none';
      document.body.innerHTML += '<p style="color:red">⚠️ Window too small. Possible tampering.</p>';
    }

    document.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = e.target.elements.code.value;
      const resp = await fetch(e.target.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (resp.ok) {
        parent.postMessage(
          { type: 'consent-result', approved: true },
          '*'  // main app validates origin on receive side
        );
      }
    });

    function deny() {
      fetch('/consent/abc123/deny', { method: 'POST' });
      parent.postMessage({ type: 'consent-result', approved: false }, '*');
    }
  </script>
</body>
</html>
```

##### Consent secret (consentId) lifecycle

```
1. Backend generates consentId = crypto.RandomBytes(32).hex()
   and confirmationCode = randomWord() + randomDigits()  (e.g., "BLUE42")
2. Stored in memory: { consentId, command, args, code, expiry: now+60s, status: "pending" }
3. Frontend receives consentId in the 202 response
4. Iframe/popup loads /consent/{consentId} — server renders page with the code
5. User types code + clicks Confirm
   → POST /consent/{consentId}/approve with { code: "BLUE42" }
   → Server checks: Origin header == consent server origin
   → Server checks: submitted code == stored code
   → Server checks: consentId is pending and not expired
   → status: "approved"
6. consentId is single-use: once approved/denied, cannot be reused
7. After 60s, pending consentIds expire automatically
8. Frontend retries the original command — backend sees it's now approved
9. Optionally, choice is persisted to config (like Electron's confirmedCommands)
```

**Edge cases:**
- **Iframe removed by plugin:** Frontend detects the iframe was removed from DOM (MutationObserver) and falls back to opening a popup instead.
- **Popup blocked:** Frontend shows a clickable link: "Click here to approve command in a new tab."
- **Multiple consent requests:** Each gets its own consentId and confirmation code. The consent server can show a list of pending requests.
- **Consent port discovery:** Main backend returns the consent port in its API (e.g., `GET /api/v1/config` includes `consentPort: 4467`).

**Verdict: ✅ Secure. Cross-origin isolation prevents DOM access and direct API calls. Origin header checking blocks form submission bypass. Typed confirmation code defeats clickjacking (iframe). Popup is inherently immune to clickjacking.**

#### Approach 4: Terminal prompt (headless with visible terminal) — SECURE ✅

For headless mode when the user has terminal access (e.g., SSH session, or started from a terminal), the Go backend prompts via terminal stdout/stdin:

```
[headlamp] Allow command: minikube status? [y/N]
```

**Why this is secure:**
- The terminal is controlled by the OS, not by browser JavaScript
- No plugin can interact with the terminal — it's a completely separate I/O channel
- The user who started the headless server is the same user who sees the prompt (same trust boundary as Electron)
- Appropriate for SSH/headless scenarios — the user is already looking at a terminal

**Attack surface:** An attacker would need shell access to the machine running the backend to inject input into the terminal. If they have shell access, they can already run arbitrary commands — consent is moot.

**Implementation:**
- Backend uses Go's `fmt.Fprintf(os.Stderr, ...)` and `bufio.NewReader(os.Stdin)` for the prompt
- Browser UI shows a non-interactive status: "Waiting for approval in terminal..." (informational only — not a consent mechanism)
- Previously-approved commands are saved to a config file, same as Electron's `confirmedCommands`
- Optional timeout (e.g., 60s auto-deny) prevents blocking indefinitely

**Verdict: ✅ Secure. Equivalent to Electron's native dialog in a terminal context.**

#### Approach 5: Admin pre-approval via config (in-cluster) — SECURE ✅

For in-cluster deployments, an admin pre-approves commands via Helm values:

```yaml
runCommand:
  preApprovedCommands:
    - "minikube status"
    - "minikube start"
```

**Why this is secure:**
- No runtime consent UI at all — nothing to bypass
- Changing the approved list requires Helm upgrade (K8s RBAC-protected)
- Backend reads config from ConfigMap (mounted as a file) — not from any browser request
- Unapproved commands return 403 with no option to override at runtime

**Verdict: ✅ Secure. No client-side trust required. Appropriate for shared/multi-user clusters.**

#### Summary: which approach for which mode

| Mode | Consent mechanism | Secure? | Reasoning |
|------|-------------------|---------|-----------|
| **Desktop (Electron)** | Native OS dialog (`dialog.showMessageBoxSync`) | ✅ | Runs in main process, outside renderer JS context |
| **Headless (terminal visible)** | Terminal prompt (Go backend stdin/stdout) | ✅ | Separate I/O channel, inaccessible to browser JS. Good for SSH. |
| **Headless (no terminal)** | Cross-origin iframe with typed code (best UX) | ✅ | Same-Origin Policy + Origin header check + typed code defeats clickjacking |
| **Headless (no terminal, fallback)** | Cross-origin popup on different port | ✅ | Inherently immune to clickjacking. Fallback if iframe is removed. |
| **In-cluster** | Admin pre-approval (Helm/ConfigMap) | ✅ | No runtime consent, server-side enforcement only |
| **Any mode** | In-page React dialog | ❌ | Same JS context as plugins, trivially bypassable |
| **Any mode** | Same-origin popup (same port) | ❌ | Same origin = full DOM access from plugin code |

#### Recommended consent flow

**Headless auto-detection:** The backend can detect whether stdin is a TTY (`golang.org/x/term` `term.IsTerminal(int(os.Stdin.Fd()))` in Go). If yes → terminal prompt. If no (e.g., started from desktop icon, stdin is /dev/null) → cross-origin iframe, falling back to popup if iframe is removed.

```
Consent flow (headless — terminal available):
  Plugin calls runCommand ──HTTP──► Go backend
                                      ├─ checkPermissionSecret ✓
                                      ├─ checkHeadlampBackendToken ✓
                                      ├─ checkAllowlist ✓
                                      ├─ checkConsent (config file)
                                      │   └─ Not consented?
                                      │       ├─ stdin is TTY → prompt in terminal
                                      │       └─ Save choice to config file
                                      └─ spawn('minikube', ['status'])

Consent flow (headless — no terminal, e.g., desktop icon):
  Plugin calls runCommand ──HTTP──► Go backend
                                      ├─ checkPermissionSecret ✓
                                      ├─ checkHeadlampBackendToken ✓
                                      ├─ checkAllowlist ✓
                                      ├─ checkConsent (config file)
                                      │   └─ Not consented?
                                      │       ├─ Generate consentId + confirmation code
                                      │       ├─ Return 202 with consentId + consentPort
                                      │       ├─ Frontend shows cross-origin iframe
                                      │       │  (falls back to popup if iframe removed)
                                      │       ├─ User types confirmation code + clicks Confirm
                                      │       ├─ Consent server verifies Origin + code
                                      │       └─ Frontend retries, backend sees approval
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
4. **Consent: terminal prompt** — Go backend checks `term.IsTerminal(os.Stdin)`, prompts via stdin/stdout, saves choice to config
5. **Consent: cross-origin popup** — Go backend starts consent server on separate port, serves minimal consent HTML, uses single-use consentId nonces
6. **Helm configuration** — `runCommand.enabled`, `runCommand.allowedCommands`, `runCommand.preApprovedCommands`

## Open questions

1. **WebSocket vs SSE for streaming** — SSE is simpler (unidirectional) but WebSocket supports stdin. Could start with SSE and add WebSocket later if stdin is needed.
2. **In-cluster runCommand** — Should this be disabled entirely, or configurable per-command? The minikube plugin doesn't make sense in-cluster, but future plugins might need local commands.
3. **Consent port stability** — The consent server runs on a random port. Should it be configurable (e.g., `--consent-port 4467`) so that popup blocker exceptions can be saved?
4. **Popup blocker UX** — If the popup is blocked, the frontend falls back to a clickable link. Should there be a third fallback (e.g., admin pre-approval via config file)?
