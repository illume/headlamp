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

**Primary: cross-origin popup.** Best security (inherently immune to clickjacking, no additional defenses needed) and best a11y (standard page, no iframe focus boundaries, screen readers treat it as a normal window). The popup window demands user attention and has a clean keyboard flow.

**Fallback: cross-origin iframe with typed confirmation code.** When popup blockers prevent the popup, the frontend detects this (see above) and falls back to an inline iframe. The typed confirmation code defeats clickjacking (the main iframe weakness). The iframe should include `title="Headlamp: Command Approval"` for screen reader users, and the consent page should auto-focus the code input field for keyboard accessibility.

**Both approaches** are secure against direct API bypass (CORS + Origin header) and DOM manipulation (Same-Origin Policy). Both use the same consent server on a different port — the only difference is `window.open()` vs `<iframe src="...">`.

##### Accessibility requirements for the consent page

The consent page (served by the consent server on the different port) should follow these a11y guidelines regardless of whether it's displayed in a popup or iframe:

- **Heading structure:** `<h1>` for "Command Approval" — screen readers use headings for navigation
- **Auto-focus:** The confirmation code `<input>` should have `autofocus` so keyboard users can immediately start typing
- **Label association:** `<label for="code-input">` explicitly associated with the input field
- **Button roles:** Standard `<button>` elements (not `<div onclick>`) for Confirm/Deny — ensures keyboard Enter/Space activation
- **ARIA live region:** If the consent page shows a status message (e.g., "Approved — closing..."), use `aria-live="polite"` so screen readers announce it
- **Color contrast:** Minimum 4.5:1 contrast ratio for text, 3:1 for large text (WCAG AA)
- **Focus visible:** Ensure `:focus-visible` outlines are not suppressed — keyboard users need to see where focus is
- **Iframe-specific:** When displayed in an iframe, set `<iframe title="Headlamp: Command Approval" role="dialog" aria-label="Command approval required">` so screen readers announce the purpose before the user navigates into it

##### How it works (popup with iframe fallback)

```
Main app (localhost:4466)              Consent server (localhost:4467)
────────────────────────               ─────────────────────────────
1. Plugin requests command
   → Backend returns 202 +
     consentUrl + consentId

2. Frontend tries popup:
   window.open('http://localhost:4467
     /consent/{consentId}')
   → If blocked: falls back to iframe
     <iframe src="...same URL...">
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
          mainAppOrigin  // only send to expected origin, never '*'
        );
      }
    });

    // mainAppOrigin is injected by the consent server when rendering the page
    // e.g., 'http://localhost:4466' — derived from runtime configuration
    const mainAppOrigin = '{{MAIN_APP_ORIGIN}}';

    function deny() {
      fetch('/consent/abc123/deny', { method: 'POST' });
      parent.postMessage({ type: 'consent-result', approved: false }, mainAppOrigin);
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
- **Popup blocked:** Frontend detects blocked popup (see popup blocker detection above) and immediately falls back to cross-origin iframe with typed confirmation code. No user action needed — the fallback is automatic and seamless.
- **Iframe removed by plugin:** If using iframe fallback, frontend detects removal via MutationObserver and shows a clickable link: "Click here to approve command in a new tab." This is a last-resort manual fallback.
- **Multiple consent requests:** Each gets its own consentId and confirmation code. The consent server can show a list of pending requests.
- **Consent port discovery:** Main backend returns the consent port in its API (e.g., `GET /api/v1/config` includes `consentPort: 4467`).

**Verdict: ✅ Secure. Cross-origin isolation prevents DOM access and direct API calls. Origin header checking blocks form submission bypass. Typed confirmation code defeats clickjacking (iframe). Popup is inherently immune to clickjacking.**

##### Same port / different path — could it work?

The analysis above assumes the consent UI runs on a **different port** (e.g., `:4467` vs `:4466`). But deploying two ports is operationally inconvenient — Kubernetes Services, ingress rules, Docker port mappings, and firewall rules all need the extra port. Could a **different path on the same port** (e.g., `/consent/...` on `:4466`) provide the same security?

**Short answer: No — same port = same origin = no browser isolation. But there are practical workarounds.**

**Why same-origin paths don't isolate:**

The browser's Same-Origin Policy is defined by `scheme + host + port`. Two paths on the same `http://localhost:4466` share the same origin — regardless of the path. This means:

| Attack | Same port, different path | Different port |
|--------|--------------------------|----------------|
| `fetch('/consent/abc/approve', {method:'POST'})` | ✅ **Works** — same origin, no CORS block | ❌ Blocked — cross-origin, no CORS headers |
| `iframe.contentDocument.querySelector('#approve').click()` | ✅ **Works** — same origin, full DOM access | ❌ Blocked — cross-origin SecurityError |
| Plugin reads consent page content | ✅ **Works** — same origin | ❌ Blocked — cross-origin |

A same-port consent path is equivalent to Approach 1 (in-page React dialog) — the plugin can bypass it trivially by calling the endpoint directly.

**Server-side defenses that DON'T help on the same origin:**

- **CORS headers:** CORS only restricts **cross-origin** requests. Same-origin requests bypass CORS entirely — the browser never checks `Access-Control-*` headers.
- **Different Content-Type:** The plugin can set any `Content-Type` on a same-origin fetch — no preflight needed.
- **CSRF tokens:** The plugin runs in the same origin, so it has access to the same cookies and tokens. CSRF tokens protect against *cross-site* forgery, not same-origin abuse.
- **`Sec-Fetch-*` headers:** These are set by the browser on navigation requests (e.g., `Sec-Fetch-Mode: navigate`) but a plugin using `fetch()` will have `Sec-Fetch-Mode: cors` — distinguishable in theory, but `Sec-Fetch-*` headers can only tell you *how* a request was made, not *who* made it. Both the real consent page and a malicious plugin call from the same origin will have the same `Sec-Fetch-Site: same-origin`.

**What DOES work for same-port isolation:**

1. **Custom header requirement:** The consent endpoint could require a custom header (e.g., `X-Consent-Token: <nonce>`) that is only known to the consent page itself (embedded in the HTML at render time, not available via any API). But since the plugin runs in the same origin, it can load the consent page in an iframe, read the nonce from the DOM (`iframe.contentDocument`), and use it. **Not secure on same origin.**

2. **Double-submit cookie with SameSite:** A cookie set with `Path=/consent/` and `SameSite=Strict` would only be sent on requests to `/consent/*`. But a plugin on the same origin can still read this cookie via `document.cookie` (unless it's `HttpOnly`), and even if `HttpOnly`, it can navigate to `/consent/approve` via a form submission and the cookie goes along. **Not secure on same origin.**

3. **Separate origin via reverse proxy:** Deploy one port externally but use a reverse proxy (nginx/Envoy) to map `/consent/*` to a separate internal service on a different port. The browser sees one port, but the backend has isolation. **However:** the browser still sees the same origin. The proxy only changes the backend routing, not the browser's Same-Origin Policy. The plugin can still `fetch('/consent/...')` and it reaches the consent endpoint. **Not secure from the browser's perspective.**

**The only same-port option that's secure: sub-domain isolation.**

If the main app runs on `headlamp.example.com` and the consent UI runs on `consent.headlamp.example.com` (pointing to the same server, same port, different sub-domain), the browser treats them as **different origins**. Same-Origin Policy kicks in. This works for production deployments behind a DNS, but not for `localhost` development (where sub-domains aren't available without `/etc/hosts` hacks).

**Practical recommendation:**

| Scenario | Approach | Why |
|----------|----------|-----|
| **Headless (localhost)** | Different port (`:4467`) | Only reliable way to get cross-origin isolation on localhost. The consent server is a lightweight Go HTTP handler — starting it on a second port is trivial. |
| **In-cluster (Kubernetes)** | Sub-domain (`consent.headlamp.svc`) or admin pre-approval | Sub-domain gives cross-origin isolation on a single port. But admin pre-approval (Approach 5) is simpler and already recommended for in-cluster. |
| **Behind ingress** | Sub-domain or admin pre-approval | If a second port is hard to expose, use sub-domain routing. Or skip the consent UI entirely with admin pre-approval. |

**Bottom line:** A different port is the simplest reliable way to get Same-Origin Policy isolation, especially for localhost/headless. For production Kubernetes deployments where a second port is inconvenient, admin pre-approval (Helm config) eliminates the need for a browser consent UI entirely. Sub-domain isolation is a middle ground for cases where you need browser-based consent but can't expose a second port.

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

Sandboxed plugins (Option B) are a genuinely good long-term architecture and would let consent UI, plugin isolation, and third-party plugin hosting all share a single port — but that belongs in a separate RFC about the plugin system itself, not a consent-UI proposal. If/when Headlamp plugins move to a sandboxed model, the "different port for consent" requirement relaxes naturally; until then, a second port is the cheapest path to real isolation.

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
| **Headless (no terminal)** | Cross-origin popup (primary) | ✅ | Inherently immune to clickjacking. Best a11y (standard window, no iframe focus boundary). |
| **Headless (no terminal, popup blocked)** | Cross-origin iframe with typed code (fallback) | ✅ | Same-Origin Policy + Origin header check + typed code defeats clickjacking. Falls back when popup blockers detected. |
| **In-cluster** | Admin pre-approval (Helm/ConfigMap) | ✅ | No runtime consent, server-side enforcement only |
| **Any mode** | In-page React dialog | ❌ | Same JS context as plugins, trivially bypassable |
| **Any mode** | Same-origin popup (same port) | ❌ | Same origin = full DOM access from plugin code |

#### Recommended consent flow

**Headless auto-detection:** The backend can detect whether stdin is a TTY (`golang.org/x/term` `term.IsTerminal(int(os.Stdin.Fd()))` in Go). If yes → terminal prompt. If no (e.g., started from desktop icon, stdin is /dev/null) → cross-origin popup, falling back to iframe if popup is blocked.

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
                                      │       ├─ Frontend tries cross-origin popup
                                      │       │  (detects popup blocker → falls back to iframe)
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
5. **Same port for consent** — A different port is required for Same-Origin Policy isolation on localhost. For in-cluster, sub-domain isolation (`consent.headlamp.svc`) or admin pre-approval can avoid the second port. See [Same port / different path analysis](#same-port--different-path--could-it-work) for details.
