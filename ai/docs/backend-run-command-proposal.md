# Proposal: Backend runCommand

## Summary

Extend Headlamp's `runCommand` to work through the Go backend, so plugins can run approved local commands in headless and (potentially) in-cluster modes — not just Electron. Also proposes WebSocket-based local terminal access for interactive shell sessions on the backend server.

Today `runCommand` only works in the Electron desktop app via IPC. This proposal adds an HTTP-based equivalent that reuses the same security model: permission secrets, command allowlists, and user consent. The consent UI uses a same-port COOP popup (no second port needed).

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

**Security:**

| Property | Cross-origin iframe | Cross-origin popup |
|----------|--------------------|--------------------|
| **DOM access by plugin** | ❌ Blocked (cross-origin) | ❌ Blocked (cross-origin) |
| **fetch/XHR by plugin** | ❌ Blocked (no CORS headers) | ❌ Blocked (no CORS headers) |
| **Form submission by plugin** | ❌ Blocked (Origin header check) | ❌ Blocked (Origin header check) |
| **Clickjacking** | ⚠️ Possible — needs typed code defense | ✅ Not possible — separate OS window |
| **Plugin removes/hides UI** | ⚠️ Can remove iframe from DOM | ✅ Cannot close/hide a separate window |
| **Implementation complexity** | Medium (iframe + typed code + self-check) | Low (just window.open) |

**UX and accessibility:**

| Property | Cross-origin iframe | Cross-origin popup |
|----------|--------------------|--------------------|
| **Visual context** | ✅ Inline — user stays in the app | ⚠️ Separate window — may go behind main window or be missed on multi-monitor setups |
| **User notices consent** | ⚠️ Inline element may be overlooked among other content | ✅ Separate window demands attention (OS-level focus) |
| **Popup blockers** | ✅ Not affected | ⚠️ May be blocked — detectable, falls back to iframe |
| **Keyboard navigation** | ⚠️ User must Tab into the iframe (cross-origin iframes receive focus, but the boundary may confuse users). Focus trapping inside the iframe is possible but the parent page can't programmatically move focus into it. | ✅ Popup is a standalone page — normal Tab/Shift-Tab works. Focus is automatically in the new window. No focus-trapping issues. |
| **Screen readers** | ⚠️ Cross-origin iframes are announced as "frame" with the page title. Screen readers *can* navigate into them, but the transition is jarring — the user leaves the main page's virtual buffer and enters a new document context. Some screen readers (JAWS, NVDA) handle this well; others may not announce the iframe content proactively. The `<iframe title="Headlamp: Command Approval">` attribute helps, but the two-document experience is suboptimal. | ✅ Popup opens as a new browser window/tab — screen readers treat it as a normal page. The `window.open()` triggers a "new window" announcement. The consent page is a simple, focused document with a heading, description, input, and buttons — ideal for linear screen reader navigation. |
| **Touch / mobile** | ✅ Inline — works normally on touch devices | ⚠️ Popup may open in a new tab on mobile browsers, breaking the flow |
| **Mouse workflow** | ✅ User types code + clicks inline — no window switching | ⚠️ User must switch to popup, type code, click, then return to main window |
| **Keyboard-only workflow** | ⚠️ Tab into iframe → type code → Tab to Confirm → Enter. The iframe boundary means extra Tab presses. | ✅ Popup focuses automatically → type code → Tab to Confirm → Enter → window closes. Straightforward. |
| **High-contrast / zoom** | ✅ Both inherit the OS high-contrast mode. Iframe scales with page zoom. | ✅ Both inherit the OS high-contrast mode. Popup has its own zoom level. |

##### Popup blocker detection

Popup blockers can be reliably detected immediately after `window.open()`:

```javascript
function openConsentPopup(url) {
  const popup = window.open(url, 'headlamp-consent', 'width=450,height=350');

  // Detection: blocked popups return null or a closed window
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    // Popup was blocked — fall back to iframe
    showConsentIframe(url);
    return null;
  }

  // Additional check: some blockers allow the call but close immediately
  setTimeout(() => {
    if (popup.closed) {
      showConsentIframe(url);
    }
  }, 1000);

  return popup;
}
```

This detection is well-supported across browsers (Chrome, Firefox, Safari, Edge) and allows seamless fallback without user intervention.

##### Recommendation

**Same-port popup with COOP + Fetch Metadata + SW blocking.** A popup on the same port using `Cross-Origin-Opener-Policy: same-origin` (to sever the opener), Fetch Metadata filtering (to block programmatic access), server-side nonce (to prevent direct approval), and Service Worker registration blocking (to close the SW interception vector). No second port needed. Best a11y (standard popup page, no iframe focus boundaries). See the detailed analysis in "Could a same-port popup work?" below.

**Popup blockers are not a concern** because the popup is always opened in response to a user gesture — the Headlamp UI shows a "Review command" prompt that the user clicks, which triggers `window.open()`. User-gesture-triggered popups are allowed by all modern popup blockers. If a popup blocker still blocks it (e.g., aggressive enterprise policies), fall back to full-page navigation to the consent URL with a return-to redirect.

The approach is secure against direct API bypass (Sec-Fetch filtering), DOM manipulation (COOP), and Service Worker interception (SW registration blocking). See the detailed analysis in "Could a same-port popup work?" below for the full attack-by-attack analysis.

##### Accessibility requirements for the consent page

The consent page should follow these a11y guidelines regardless of how it's displayed:

- **Heading structure:** `<h1>` for "Command Approval" — screen readers use headings for navigation
- **Auto-focus:** The confirmation code `<input>` should have `autofocus` so keyboard users can immediately start typing
- **Label association:** `<label for="code-input">` explicitly associated with the input field
- **Button roles:** Standard `<button>` elements (not `<div onclick>`) for Confirm/Deny — ensures keyboard Enter/Space activation
- **ARIA live region:** If the consent page shows a status message (e.g., "Approved — closing..."), use `aria-live="polite"` so screen readers announce it
- **Color contrast:** Minimum 4.5:1 contrast ratio for text, 3:1 for large text (WCAG AA)
- **Focus visible:** Ensure `:focus-visible` outlines are not suppressed — keyboard users need to see where focus is
- **Iframe-specific:** When displayed in an iframe, set `<iframe title="Headlamp: Command Approval" role="dialog" aria-label="Command approval required">` so screen readers announce the purpose before the user navigates into it

##### How it works (same-port COOP popup)

```
Main app (localhost:4466)              Consent handler (same port :4466)
────────────────────────               ────────────────────────────────
1. Plugin requests command
   → Backend returns 202 +
     consentId

2. Headlamp UI shows prompt:
   "Command approval needed.
    Click to review."
   User clicks →
   window.open('/consent/{consentId}')
   (user gesture = popup blocker allows)

                                       3. Backend checks Sec-Fetch headers:
                                          Sec-Fetch-Dest: document ✓
                                          Sec-Fetch-Mode: navigate ✓
                                          → Serves consent page with:
                                            COOP: same-origin
                                            Nonce in hidden form field

                                       4. COOP mismatch severs opener
                                          (main page has no COOP)

                                       5. Page shows:
                                          "Allow: minikube status?"
                                          [Approve] [Deny]

                                       6. User clicks Approve
                                          → POST /consent/{consentId}/approve
                                            with { nonce: "..." }
                                          → Server validates nonce
                                          → Returns success
                                          → Popup closes

7. Plugin polls backend for status
   → Backend sees consent recorded
   → Command executes
```

##### Implementation details

```go
// In Go backend — consent handler on the same HTTP mux
mux.HandleFunc("GET /consent/{id}", showConsentPage)     // serves minimal HTML
mux.HandleFunc("POST /consent/{id}/approve", approveConsent)
mux.HandleFunc("POST /consent/{id}/deny", denyConsent)

// Block Service Worker registration for the entire origin
func securityMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Header.Get("Service-Worker") == "script" {
            http.Error(w, "Service Worker registration not allowed", http.StatusForbidden)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// In showConsentPage — serve only to navigations, with COOP
func showConsentPage(w http.ResponseWriter, r *http.Request) {
    if r.Header.Get("Sec-Fetch-Dest") != "document" ||
       r.Header.Get("Sec-Fetch-Mode") != "navigate" {
        http.Error(w, "Consent page must be opened via navigation", http.StatusForbidden)
        return
    }
    w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
    w.Header().Set("Content-Type", "text/html")
    // ... render minimal consent page with nonce in hidden field
}
```

Consent page HTML (minimal — no Headlamp bundle, no plugin code, no React):

```html
<!-- Served on the same port with COOP header -->
<html>
<body>
  <h1>Headlamp: Command Approval</h1>
  <p>Allow this command to run?</p>
  <pre>minikube status</pre>
  <form method="POST" action="/consent/abc123/approve">
    <input type="hidden" name="nonce" value="{{NONCE}}" />
    <button type="submit">Approve</button>
    <button type="button" onclick="deny()">Deny</button>
  </form>
  <script>
    // Defense-in-depth: refuse to render if a Service Worker is controlling this page.
    // Primary defense is server-side SW registration blocking (Service-Worker: script → 403).
    // This catches pre-existing SWs from before the server-side block was deployed.
    // Note: a sophisticated SW could strip this check from the HTML response, but combined
    // with the server-side block (which prevents new SW registration), the window of
    // vulnerability is limited to SWs registered before the feature was deployed.
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      document.body.innerHTML = '<p style="color:red">⚠️ Service Worker detected. ' +
        'Consent page cannot render securely. Please clear site data and reload.</p>';
    }

    function deny() {
      fetch('/consent/abc123/deny', { method: 'POST' });
      window.close();
    }

    document.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nonce = e.target.elements.nonce.value;
      const resp = await fetch(e.target.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce }),
      });
      if (resp.ok) {
        window.close();
      }
    });
  </script>
</body>
</html>
```

##### Consent secret (consentId) lifecycle

```
1. Backend generates consentId = crypto.RandomBytes(32).hex()
   and nonce = crypto.RandomBytes(32).hex()
2. Stored in memory: { consentId, command, args, nonce, expiry: now+60s, status: "pending" }
3. Frontend receives consentId in the 202 response
4. User clicks "Review command" → popup opens /consent/{consentId}
5. Backend checks Sec-Fetch-Dest: document + Sec-Fetch-Mode: navigate
   → Serves consent page with COOP: same-origin + nonce in hidden form field
6. User clicks Approve
   → POST /consent/{consentId}/approve with { nonce: "..." }
   → Server checks: nonce matches stored nonce
   → Server checks: consentId is pending and not expired
   → status: "approved"
7. consentId is single-use: once approved/denied, cannot be reused
8. After 60s, pending consentIds expire automatically
9. Plugin polls backend → backend sees approval → command executes
10. Optionally, choice is persisted to config (like Electron's confirmedCommands)
```

**Edge cases:**
- **Popup blocked:** The consent popup is opened via user gesture (clicking "Review command"), so popup blockers allow it. If an aggressive enterprise popup blocker still blocks it, fall back to full-page navigation: `location.href = '/consent/{consentId}?returnUrl=...'` — the consent page redirects back after approval.
- **Multiple consent requests:** Each gets its own consentId and nonce. The consent page can show a list of pending requests.
- **Browser doesn't support COOP or Sec-Fetch:** The server detects this by checking for the presence of `Sec-Fetch-Dest` header on the request. If absent (older browser), the server refuses to serve the consent page via popup and returns a redirect to full-page navigation flow instead. Full-page navigation is inherently secure (no plugins loaded on the consent page = no attacker JS). COOP is supported in Chrome 83+, Firefox 79+, Safari 15.2+; Sec-Fetch in Chrome 76+, Firefox 90+.
- **Pre-existing Service Worker:** If a SW was registered before the server-side `Service-Worker: script` blocking was deployed, the consent page JS self-check detects it and refuses to render. Admin action: clear site data or wait for the SW to expire. New deployments are not affected (server blocks all new SW registrations from day one).

**Verdict: ✅ Secure. COOP severs popup opener. Sec-Fetch filtering blocks programmatic access. Server-side nonce prevents direct approval. SW registration blocking closes the SW interception vector. Popup is inherently immune to clickjacking.**

##### Same port / different path — background analysis

This section analyzes why naive same-port, different-path approaches don't work for consent isolation — and how the COOP + Fetch Metadata approach (recommended above) solves the problem.

**Why same-origin paths alone don't isolate:**

The browser's Same-Origin Policy is defined by `scheme + host + port`. Two paths on the same `http://localhost:4466` share the same origin — regardless of the path. This means:

| Attack | Naive same-port (no COOP) | With COOP + Sec-Fetch + nonce |
|--------|--------------------------|-------------------------------|
| `fetch('/consent/abc/approve', {method:'POST'})` | ✅ **Works** — same origin, no CORS block | ❌ Blocked — plugin doesn't have the nonce |
| `fetch('/consent/abc')` to read nonce from HTML | ✅ **Works** — same origin | ❌ Blocked — Sec-Fetch-Dest: empty ≠ document |
| `iframe.contentDocument.querySelector(...)` | ✅ **Works** — same origin, full DOM access | ❌ Blocked — Sec-Fetch-Dest: iframe ≠ document |
| Read popup DOM via `window.opener` | ✅ **Works** — same origin | ❌ Blocked — COOP severed opener |

A naive same-port consent path (without COOP/Sec-Fetch) is equivalent to Approach 1 (in-page React dialog) — the plugin can bypass it trivially.

**Server-side defenses that DON'T help on their own:**

- **CORS headers:** CORS only restricts **cross-origin** requests. Same-origin requests bypass CORS entirely.
- **CSRF tokens:** The plugin runs in the same origin, so it can read tokens from cookies and DOM. CSRF tokens protect against *cross-site* forgery, not same-origin abuse.
- **Custom headers:** The plugin can set any custom header on same-origin fetch.
- **`Sec-Fetch-*` alone:** Distinguishes *how* a request was made but not *who* — however, when combined with COOP (which prevents DOM access) and server-side nonces, Sec-Fetch filtering becomes effective because the plugin has no way to obtain the nonce.

**What makes COOP + Fetch Metadata + nonce work:**

The key insight is that these mechanisms work together, not individually:
1. **Sec-Fetch filtering** prevents the plugin from reading the consent page content via `fetch()`/XHR/iframe
2. **COOP** prevents the plugin from reading the popup's DOM (opener severed)
3. **Server-side nonce** prevents the plugin from approving without the secret
4. **SW registration blocking** prevents the plugin from intercepting navigations via Service Worker

No single mechanism provides isolation — but together they create a complete defense. See "Could a same-port popup work?" below for the full attack-by-attack analysis.

##### Could iframe `sandbox` work if same-path isolation doesn't?

A natural follow-up: if same-origin paths don't isolate the consent UI from plugins, could the `<iframe sandbox>` attribute provide that isolation instead — all on a single port?

**Short answer: Yes, but the sandbox has to go around the *plugin*, not the consent UI — and that's an architectural change, not a one-line fix.**

**What `sandbox` actually does:**

The `sandbox` attribute applies to the iframe it's declared on. It restricts what code **inside** that iframe can do — script execution, form submission, popups, top-navigation, etc. Crucially, **`sandbox` without `allow-same-origin` forces the iframe into a unique (null) origin**, which means the Same-Origin Policy then treats it as a different origin even when served from the same scheme+host+port.

So `sandbox` can create a cross-origin boundary on a single port — but it makes whatever is inside the iframe "the different origin," not what's outside.

**Option A: Sandbox the consent UI (what you might try first) — DOESN'T HELP**

```html
<!-- Main page on :4466 (plugin lives here) -->
<iframe src="/consent/abc" sandbox="allow-scripts allow-forms"></iframe>
```

This is backwards. The threat is a hostile plugin in the **parent** page (DOM access, clickjacking, direct fetch). `sandbox` on the consent iframe:

- Does nothing to stop the parent plugin from calling `fetch('/consent/abc/approve')` directly — the plugin isn't in the sandbox.
- Does nothing to stop clickjacking (plugin still controls the parent DOM — overlay, resize, reposition).
- Does give the iframe a unique origin, so `iframe.contentDocument` access is blocked — but we already had that mitigation via CORS + Origin header on a different port; this doesn't add protection against the remaining attack surface.

The parent is the attacker. Sandboxing the victim doesn't protect the victim.

**Option B: Sandbox the plugin — WORKS, but is a bigger change**

```html
<!-- Main page on :4466 (trusted) -->
<iframe src="/plugin/foo" sandbox="allow-scripts"></iframe>
<!-- Plugin now has a null origin; it's cross-origin to :4466 -->
```

With `sandbox="allow-scripts"` (no `allow-same-origin`), the plugin iframe has a **null origin**. From its perspective, everything served from `:4466` — including the main app, its APIs, and `/consent/...` — is cross-origin. So:

| Attack | Outcome |
|--------|---------|
| `fetch('/consent/abc/approve')` from plugin | ❌ Blocked by CORS (null → :4466 is cross-origin; no `Access-Control-Allow-Origin: null`) |
| `parent.document.querySelector(...)` | ❌ Blocked (cross-origin) |
| Read cookies, localStorage of :4466 | ❌ Blocked (unique origin has no access) |
| Clickjack consent UI rendered in parent | ❌ Plugin can't reach parent DOM |

This genuinely isolates plugins from the main page — including the consent UI — on a **single port**. It's the same isolation model the sandboxed iframe gives to untrusted HTML (e.g., embedded ads, user-uploaded content).

**But: this is a plugin-system redesign, not a consent-UI fix.**

Headlamp plugins today run via `new Function()` in the main page's context (see `frontend/src/plugin/runPlugin.ts`). They call `@kinvolk/headlamp-plugin` APIs directly (registerSidebarEntry, registerRoute, registerAppBarAction, etc.), share the React tree with the host app, and use same-origin `fetch()` to hit the backend. Moving to `sandbox="allow-scripts"` (null origin) breaks all of that:

| Concern | Impact |
|--------|--------|
| Plugin API access | Currently direct JS calls. Would need `postMessage`-based RPC for every Headlamp API a plugin uses. Hundreds of entry points. |
| UI integration | Plugins register React components that render in the host tree. Sandboxed plugins can't share React trees — every plugin becomes a child iframe with its own React root. Layout, theming, modals, and context menus all become cross-document. |
| Backend API calls | Plugin `fetch('/api/v1/clusters/...')` becomes cross-origin. Backend must send `Access-Control-Allow-Origin: null` (risky — matches any sandboxed page on the internet) or `*` with no credentials, and plugins can no longer use auth cookies. |
| Performance | Each plugin = separate document, separate JS context, separate React root, separate React Query cache. Memory and load time increase with plugin count. |
| Existing plugins | Every published plugin would need to be rewritten against a new postMessage RPC API. Breaking change. |

There are web apps that do this — VS Code webviews, Figma plugins, Notion embeds — but all of them designed it in from day one. Retrofitting sandboxed plugins onto Headlamp is a multi-release project with a long compatibility tail.

**Option C: `sandbox` with `allow-same-origin` — DEFEATS THE ISOLATION**

Tempting compromise: `sandbox="allow-scripts allow-same-origin"` so the plugin can still call Headlamp APIs normally. This **does not give you a unique origin**; the plugin is same-origin with `:4466` again, and every same-origin attack from the earlier analysis comes back. Plus it still applies other sandbox restrictions (top navigation, popups), which mostly hurt legitimate plugin UX without helping security. Worst of both worlds.

**Summary:**

| Sandbox target | Isolates consent UI on one port? | Compatible with current plugin model? |
|---------------|----------------------------------|--------------------------------------|
| Sandbox consent iframe (Option A) | ❌ No — attacker is in parent | ✅ Yes |
| Sandbox plugin iframe, no `allow-same-origin` (Option B) | ✅ Yes | ❌ No — requires postMessage plugin API |
| Sandbox plugin iframe, with `allow-same-origin` (Option C) | ❌ No — still same origin | ✅ Yes |

**Recommendation:**

For this proposal, stick with the earlier guidance:

- **Localhost/headless:** Different port — trivial to add, gives cross-origin isolation immediately, no plugin rewrites.
- **In-cluster:** Admin pre-approval (no consent UI) or sub-domain isolation.

Sandboxed plugins (Option B) are a genuinely good long-term architecture and would let consent UI, plugin isolation, and third-party plugin hosting all share a single port — but that belongs in a separate RFC about the plugin system itself, not a consent-UI proposal. The COOP + Fetch Metadata + SW blocking approach (see below) provides same-port consent isolation without plugin system changes.

##### Could a same-port popup work? (COOP + Fetch Metadata + SW blocking)

The previous sections show that same-origin paths don't isolate, and sandboxing the plugin is a system redesign. But there's a middle ground: **a popup on the same port that combines three browser mechanisms to create effective isolation without a second port.**

**How it works:**

1. Plugin requests command execution → backend generates `consentId` + cryptographic `nonce`, stores nonce server-side
2. Headlamp frontend opens popup: `window.open('/consent/{consentId}')`
3. Backend serves the consent page with three protections:
   - **Fetch Metadata filtering**: only responds when `Sec-Fetch-Dest: document` AND `Sec-Fetch-Mode: navigate` (rejects `fetch()`/XHR which send `Sec-Fetch-Dest: empty`)
   - **`Cross-Origin-Opener-Policy: same-origin`**: the main page has no COOP (defaults to `unsafe-none`), creating a COOP mismatch → browser severs the opener relationship. The popup gets its own browsing context group.
   - **Nonce in HTML**: the consent page embeds the `nonce` in a hidden form field
4. User sees command details in the popup, clicks "Approve"
5. Form POSTs to `/consent/{consentId}/approve` with the nonce
6. Backend validates nonce (one-time use), records approval, popup closes
7. Plugin polls backend for consent status (it never had access to the nonce)

**Why this is secure — attack-by-attack analysis:**

| Attack | Outcome | Why |
|--------|---------|-----|
| `fetch('/consent/{id}')` to read nonce | ❌ Blocked | `Sec-Fetch-Dest: empty` ≠ `document` — server returns 403 |
| `XMLHttpRequest` to read nonce | ❌ Blocked | Same — `Sec-Fetch-Dest: empty` |
| `fetch('/consent/{id}/approve')` to auto-approve | ❌ Blocked | Plugin doesn't know the nonce |
| Read popup DOM via `window.opener` | ❌ Blocked | COOP mismatch severed the opener relationship |
| Hidden `<iframe src="/consent/{id}">` | ❌ Blocked | `Sec-Fetch-Dest: iframe` ≠ `document` — server returns 403 |
| `<object>` / `<embed>` to load consent page | ❌ Blocked | `Sec-Fetch-Dest: object`/`embed` ≠ `document` |
| `<link rel="prefetch">` | ❌ Blocked | `Sec-Fetch-Dest: empty` |
| Clickjack the popup | ❌ Impossible | Popup is a standalone OS window — parent can't overlay or reposition it |
| Create a form that POSTs to approve endpoint | ❌ Blocked | Plugin doesn't have the nonce to include in the form |
| Navigate main page to consent URL | ⚠️ User sees it | Obvious to user (page navigates away), and nonce is one-time |

**The remaining attack: Service Workers**

A Service Worker registered by a malicious plugin could intercept the popup's navigation request, read the response body, extract the nonce, and relay it back to the plugin. SW interception happens before COOP and Fetch Metadata checks — the SW sees the raw navigation request and can clone the response.

**Defense: block Service Worker registration at the server.**

When a browser registers a Service Worker, it fetches the SW script with a special `Service-Worker: script` request header. This header is a "forbidden header name" — JavaScript cannot set it; only the browser's SW registration machinery does. The backend can block SW registration for the entire origin:

```go
// In the Go backend's HTTP handler
func handleRequest(w http.ResponseWriter, r *http.Request) {
    if r.Header.Get("Service-Worker") == "script" {
        http.Error(w, "Service Worker registration not allowed", http.StatusForbidden)
        return
    }
    // ... normal handling
}
```

With this single check, no Service Worker can be registered on the Headlamp origin. This closes the SW attack vector without affecting normal script loading, CSS, images, or API calls. The `Service-Worker` header is only sent during SW script fetches — regular `<script>` tags don't include it.

**Additional depth defense (optional):**

- **Consent page self-check:** The consent page JS verifies `navigator.serviceWorker.controller === null`. If a pre-existing SW is controlling the page (registered before the server-side block was deployed), the page refuses to render and shows a warning.
- **CSP `worker-src 'none'`:** Set on the main Headlamp page to prevent all worker registration client-side. More aggressive — also blocks Web Workers and Shared Workers.
- **Freeze `navigator.serviceWorker.register`:** Before loading plugins, Headlamp sets `Object.defineProperty(navigator.serviceWorker, 'register', { value: () => Promise.reject(new Error('blocked')), writable: false })`. Fragile but effective against casual attackers.

**`Sec-Fetch-*` headers can't be spoofed by JavaScript.** Headers starting with `Sec-` are "forbidden header names" in the Fetch spec — `fetch()` and `XMLHttpRequest.setRequestHeader()` silently ignore attempts to set them. They are set exclusively by the browser based on the actual request context. This makes them reliable for server-side validation against malicious same-origin JS.

**COOP mismatch behavior:** When the main page has no COOP (defaults to `unsafe-none`) and the popup responds with `Cross-Origin-Opener-Policy: same-origin`, the browser detects the mismatch and places them in separate browsing context groups. The parent's `window.open()` returns an opaque `WindowProxy` — it can check `.closed` but cannot access `.document`, `.location`, or any DOM property. This is true even though both pages are same-origin (same scheme + host + port). COOP overrides same-origin access at the browsing context level.

**Comparison: same-port COOP popup vs different-port popup:**

| Property | Same-port COOP popup | Different-port popup |
|----------|---------------------|---------------------|
| Origin isolation | COOP + Fetch Metadata (browsing context level) | Full Same-Origin Policy (origin level) |
| `fetch()` to consent endpoint | Blocked by Sec-Fetch check (server-side) | Blocked by CORS (browser-side) |
| DOM access to popup | Blocked by COOP (browser-side) | Blocked by SOP (browser-side) |
| SW attack | Blocked by SW registration check (server-side) | N/A (different origin) |
| Clickjacking | Immune (standalone popup window) | Immune (standalone popup window) |
| Deployment complexity | None — single port | Extra port to expose |
| Kubernetes / Docker | No extra Service or port mapping | Extra Service, port mapping, firewall rules |
| Ingress compatibility | No changes needed | Second port or sub-domain routing |
| Browser support | Chrome 83+, Firefox 79+, Safari 15.2+ (COOP); Chrome 76+, Firefox 90+ (Sec-Fetch) | All browsers (SOP is universal) |
| Defense depth | 3 layers (Sec-Fetch + COOP + nonce + SW block) | 1 layer (SOP) — but that one layer is absolute |

**Recommendation:**

The same-port COOP popup approach is the recommended consent mechanism for all browser-based deployment modes:

- **Localhost/headless**: Same-port COOP popup. SW registration blocked server-side.
- **In-cluster**: Admin pre-approval via Helm (no consent UI needed). COOP popup available as opt-in for interactive use.
- **Behind ingress**: Same-port COOP popup. No ingress changes needed.

**Popup blocker handling:** The consent popup is always opened via a user gesture (user clicks "Review command"), so popup blockers allow it. If an aggressive enterprise popup blocker still intervenes, fall back to full-page navigation to `/consent/{consentId}?returnUrl=...` — the consent page redirects back after approval. No plugins are loaded on the consent page, so full-page navigation is inherently secure.

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
| **Headless (no terminal)** | Same-port COOP popup | ✅ | COOP severs opener, Sec-Fetch blocks programmatic access, nonce prevents direct approval. Popup is inherently immune to clickjacking. |
| **In-cluster** | Admin pre-approval (Helm/ConfigMap) | ✅ | No runtime consent, server-side enforcement only |
| **Any mode** | In-page React dialog | ❌ | Same JS context as plugins, trivially bypassable |
| **Any mode** | Same-origin popup without COOP | ❌ | Same origin = full DOM access from plugin code |

#### Recommended consent flow

**Headless auto-detection:** The backend can detect whether stdin is a TTY (`golang.org/x/term` `term.IsTerminal(int(os.Stdin.Fd()))` in Go). If yes → terminal prompt. If no (e.g., started from desktop icon, stdin is /dev/null) → same-port COOP popup.

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
                                      │       ├─ Generate consentId + nonce
                                      │       ├─ Return 202 with consentId
                                      │       ├─ Frontend shows "Review command" prompt
                                      │       ├─ User clicks → COOP popup opens
                                      │       ├─ User clicks Approve in popup
                                      │       ├─ Backend validates nonce
                                      │       └─ Plugin polls, backend sees approval
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

## Could MCP be implemented on top of runCommand?

**Short answer: Technically possible with the proposed stdin support — but impractical. Better to share the security model while keeping separate execution paths.**

The proposed HTTP-based runCommand includes `POST /run-command/{id}/input` for sending stdin to a running process. This means runCommand now supports bidirectional communication — the missing piece that previously made MCP-over-runCommand impossible. So the question deserves a fresh look.

### How it would work (theoretically)

With the proposed stdin endpoint, MCP stdio could work like this:

```
1. POST /run-command/start
   { command: "npx", args: ["@modelcontextprotocol/server-filesystem", "/path"] }
   → Returns { id: "abc123" }

2. GET /run-command/abc123/stream
   → SSE stream of stdout (JSON-RPC responses from MCP server)

3. POST /run-command/abc123/input
   { data: '{"jsonrpc":"2.0","method":"tools/list","id":1}\n' }
   → Sends JSON-RPC request to MCP server's stdin

4. SSE stream delivers:
   event: stdout
   data: {"jsonrpc":"2.0","result":{"tools":[...]},"id":1}
```

This is technically a bidirectional channel over HTTP — stdin via POST, stdout via SSE. The MCP JSON-RPC protocol could ride on top of it.

### Why it's still not the right approach

Even though it's technically possible, building MCP on runCommand creates problems:

| Issue | Detail |
|-------|--------|
| **Process lifecycle mismatch** | runCommand is designed for short-lived processes. MCP servers run for the entire session (minutes to hours). runCommand would need process keepalive, reconnection, and health monitoring — features that don't belong in a "run a command" abstraction. |
| **JSON-RPC framing over SSE** | runCommand streams raw text lines. MCP JSON-RPC responses can be multi-line JSON objects. The SSE stream would need a JSON-RPC message parser to reassemble responses from text chunks. This is fragile — stdout buffering, partial writes, and interleaved stderr all complicate parsing. |
| **Request-response correlation** | MCP multiplexes concurrent tool calls over one connection using JSON-RPC request IDs. runCommand's SSE stream delivers raw stdout — the caller must parse JSON-RPC, match response IDs to pending requests, and handle out-of-order delivery. This is reimplementing an MCP client inside the runCommand caller. |
| **No HTTP MCP support** | runCommand is fundamentally a process-spawning API. MCP HTTP/SSE servers (the in-cluster model) can't be reached via runCommand at all — they need HTTP client calls, not process spawning. A unified MCP layer needs to handle both stdio and HTTP transports. |
| **Error semantics** | runCommand reports exit codes and stderr streams. MCP reports JSON-RPC error objects with codes and structured data. Mapping between the two adds unnecessary complexity. |
| **Abstraction leak** | Plugins using MCP would need to know they're talking to a runCommand session, construct JSON-RPC by hand, parse SSE streams, and manage the long-lived process. This defeats the purpose of an MCP abstraction layer. |

### What SHOULD be shared

The security infrastructure is the right thing to share — not the execution path:

1. **Permission secret generation and distribution** — Same `cryptoRandom()` approach, same `getAllowedPermissions` gatekeeper in the plugin loader. MCP just needs its own secret names (`mcp-execute`, `mcp-tools`) alongside the existing `runCmd-*` names.

2. **Backend token authentication** — Same `checkHeadlampBackendToken` middleware on MCP endpoints.

3. **Consent storage** — Same `confirmedCommands` pattern in settings, extended with a `confirmedMcpTools` section.

4. **Command/tool allowlist validation** — Same concept: `runCommand` validates against `['minikube', 'az', 'scriptjs']`, MCP validates against admin-configured server/tool list.

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

**Could you build MCP on runCommand?** Yes — the stdin endpoint makes it technically possible. But you'd be building a full MCP client (JSON-RPC framing, request correlation, process lifecycle management) on top of a raw text streaming API. It's simpler and more robust to build the MCP handler as a peer of runCommand that shares the same auth layer.

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

1. **Go backend endpoints** — `POST /start`, `GET /stream`, `POST /consent` with permission secret validation; `Service-Worker: script` header blocking middleware
2. **Frontend HTTP fallback** — `runCommandViaHTTP` alongside existing IPC path
3. **Plugin loader backend secrets** — `permissionSecretsFromApp` fetches from backend when not in Electron
4. **Consent: terminal prompt** — Go backend checks `term.IsTerminal(os.Stdin)`, prompts via stdin/stdout, saves choice to config
5. **Consent: same-port COOP popup** — Consent handler on same port with `Cross-Origin-Opener-Policy: same-origin`, Sec-Fetch filtering, server-side nonce
6. **Helm configuration** — `runCommand.enabled`, `runCommand.allowedCommands`, `runCommand.preApprovedCommands`

## Could runCommand be used for terminal access?

**Short answer: Yes — the runCommand infrastructure can be extended to support a full interactive terminal on the backend server. WebSocket is the right transport (not SSE). Headlamp already has all the frontend pieces (XTerm.js, channel protocol, `useTerminalStream` hook).**

### What "terminal access" means here

Headlamp already supports terminal access to **pods** via `kubectl exec` — the frontend has XTerm.js (`frontend/src/components/common/Terminal.tsx`), WebSocket streaming (`frontend/src/lib/k8s/useTerminalStream.ts`), and the Go backend proxies WebSocket connections to the Kubernetes API server.

A **local terminal** is different: it runs a shell (bash, sh, zsh) on the **backend server machine** itself, not inside a pod. Use cases:

- **Headless mode**: User accesses Headlamp remotely and needs a shell on the server (for kubectl, helm, minikube, debugging)
- **Desktop mode**: Less useful (user can open their own terminal), but provides a unified experience
- **In-cluster**: Potentially dangerous (shell on the cluster node) — should be disabled by default

### How it would work

The Go backend spawns a PTY (pseudo-terminal) process and bridges it to a WebSocket:

```go
import (
    "github.com/creack/pty"
    "github.com/gorilla/websocket"
)

func handleTerminal(w http.ResponseWriter, r *http.Request) {
    // Same security checks as runCommand
    checkPermissionSecret(r)
    checkHeadlampBackendToken(r)
    checkConsent(r, "terminal")

    conn, _ := upgrader.Upgrade(w, r, nil)
    defer conn.Close()

    // Use user's login shell, fall back to sh (works on Alpine, BusyBox)
    shell := os.Getenv("SHELL")
    if shell == "" { shell = "/bin/sh" }

    // Spawn shell in a PTY (requires github.com/creack/pty)
    cmd := exec.Command(shell)
    ptmx, _ := pty.Start(cmd)
    defer ptmx.Close()

    // PTY output → WebSocket (using same channel protocol as pod exec)
    go func() {
        buf := make([]byte, 4096)
        for {
            n, err := ptmx.Read(buf)
            if err != nil {
                log.Printf("terminal: PTY read error: %v", err)
                return
            }
            // Channel 1 = StdOut
            msg := append([]byte{1}, buf[:n]...)
            conn.WriteMessage(websocket.BinaryMessage, msg)
        }
    }()

    // WebSocket → PTY input / resize
    for {
        _, msg, err := conn.ReadMessage()
        if err != nil { return }
        channel := msg[0]
        data := msg[1:]
        switch channel {
        case 0: // StdIn
            ptmx.Write(data)
        case 4: // Resize — data format: JSON {"cols":80,"rows":24}
            var size struct{ Cols, Rows uint16 }
            json.Unmarshal(data, &size)
            pty.Setsize(ptmx, &pty.Winsize{Cols: size.Cols, Rows: size.Rows})
        }
    }
}
```

### Why WebSocket, not SSE

| Property | WebSocket | SSE + POST |
|----------|-----------|------------|
| Latency per keystroke | 1 message | 1 HTTP POST per keystroke |
| Bidirectional | Native | Emulated (separate channel) |
| Terminal resize | In-band (channel 4) | Separate POST endpoint |
| Existing infrastructure | ✅ Headlamp already proxies K8s WebSocket | ❌ New SSE infrastructure |
| XTerm.js integration | ✅ `useTerminalStream` hook already handles WebSocket | ❌ New hook needed |

SSE is fine for one-off commands (runCommand), but terminal I/O needs low-latency bidirectional communication — WebSocket is the right choice.

### Reuse from existing code

The frontend already has everything needed:

| Component | File | Reuse |
|-----------|------|-------|
| XTerm.js terminal UI | `Terminal.tsx` | Reuse component, change WebSocket URL |
| Channel protocol (StdIn/Out/Err/Resize) | `useTerminalStream.ts` | Reuse directly — same channel encoding |
| WebSocket connection | `streamingApi.ts` | Reuse `stream()` function |
| Terminal resize handling | `useTerminalStream.ts` | Reuse FitAddon + resize channel |

The main new code is in the Go backend: PTY spawning + WebSocket handler (~100 lines). Plus a new route/component to open the terminal UI.

### Relationship to runCommand

| | runCommand | Terminal |
|---|-----------|----------|
| **Purpose** | One-off commands (minikube status, az login) | Interactive shell session |
| **Lifetime** | Short — run → output → exit | Long — open → interact → close |
| **Transport** | SSE (output) + POST (stdin, if needed) | WebSocket (bidirectional) |
| **Process** | `exec.Command` (no PTY) | `pty.Start` (PTY for terminal emulation) |
| **Command scope** | Allowlisted commands only | Shell (bash, sh) — much broader |
| **Security** | Permission secret + consent + allowlist | Permission secret + consent + opt-in flag |
| **ANSI codes** | Not needed (structured output) | Essential (colors, cursor, tab completion) |

They share the same security model (permission secrets, consent, backend token) but have different execution patterns. Terminal access should be a **separate endpoint** (`/api/v1/terminal`) with its own permission secret (`terminal-access`), not an extension of runCommand.

### Security considerations

A local terminal is more powerful than runCommand (arbitrary commands vs. allowlist). Additional safeguards:

- **Opt-in**: Disabled by default. Enabled via `--enable-terminal` flag or Helm `terminal.enabled: true`
- **Shell restriction**: Configurable shell command (default: user's login shell). Admin can restrict to specific shells.
- **Audit logging**: All terminal sessions logged with user identity, start/end time, and optionally command history
- **Session timeout**: Auto-close after configurable idle timeout (default: 30 minutes)
- **In-cluster**: Disabled by default. If enabled, the terminal runs on the Headlamp pod — not on cluster nodes. Admin must explicitly opt in via Helm.
- **Consent**: Same COOP popup mechanism as runCommand. First terminal session requires user consent. Choice can be saved.

### Implementation phases (terminal-specific)

1. **Go backend**: WebSocket endpoint at `/api/v1/terminal` using `creack/pty`, with permission secret and consent checks
2. **Frontend**: New "Terminal" component that reuses `useTerminalStream` with the local terminal WebSocket URL
3. **UI integration**: Terminal tab/panel in the Headlamp UI (like pod terminal, but for the backend server)
4. **Configuration**: `--enable-terminal`, `--terminal-shell`, `--terminal-idle-timeout` CLI flags; Helm `terminal.*` values

## Open questions

1. **WebSocket vs SSE for runCommand streaming** — SSE is simpler for one-off commands. WebSocket is needed for terminal access. Could support both: SSE for runCommand, WebSocket for terminal.
2. **In-cluster runCommand** — Should this be disabled entirely, or configurable per-command? The minikube plugin doesn't make sense in-cluster, but future plugins might need local commands.
3. **Terminal access scope** — Should the terminal be a full shell, or restricted to specific commands? A full shell is most useful but highest risk. Could offer both modes.
4. **Terminal in-cluster** — The terminal runs on the Headlamp pod. Is this useful? Kubernetes admins might want `kubectl` access from the pod. Should be heavily restricted and opt-in.
