# COOP Popup Consent — Proof of Concept

Minimal proof of concept for the same-port consent popup security model described in
[`backend-run-command-proposal.md`](../backend-run-command-proposal.md).

**No third-party dependencies.** Pure Node.js + minimal HTML/JS.

## Quick start

```bash
cd ai/docs/consent-poc
node server.cjs
# Open http://localhost:4466
```

## What it proves

The PoC demonstrates that a **same-port popup** can be securely isolated from the
page that opens it, using three coordinated browser mechanisms:

| Layer | Mechanism | What it stops |
|-------|-----------|---------------|
| 1 | **Sec-Fetch filtering** | `fetch()`, XHR, `<iframe>`, `<object>` — server only responds to top-level navigation |
| 2 | **COOP** (`Cross-Origin-Opener-Policy: same-origin`) | Parent page reading popup DOM or extracting the nonce via `window.opener` |
| 3 | **Server-side nonce** | Approval requires a one-time nonce embedded in the consent page HTML |
| 4 | **SW registration blocking** | Server rejects requests with `Service-Worker: script` header |

## How it works

1. **Main page** (`/`) — simulates Headlamp with a plugin. No COOP header (defaults to `unsafe-none`).
2. Plugin calls `POST /api/request-consent` → server generates `consentId` + cryptographic `nonce`.
3. Headlamp opens `window.open('/consent/{consentId}')` via user gesture (click).
4. Server serves consent page **only** when `Sec-Fetch-Dest: document` + `Sec-Fetch-Mode: navigate`.
   Response includes `Cross-Origin-Opener-Policy: same-origin` → COOP mismatch with parent → opener severed.
5. User clicks "Approve" → form POSTs nonce to `/consent/{id}/approve`.
6. Server validates nonce (one-time), records approval. Plugin polls `/api/consent-status/{id}`.

## Attack tests

Click each attack button on the main page to verify:

| # | Attack | Expected result |
|---|--------|----------------|
| 1 | `fetch('/consent/{id}')` | HTTP 403 — `Sec-Fetch-Dest: empty` rejected |
| 2 | XHR to consent page | HTTP 403 — same reason |
| 3 | `<iframe>` consent page | HTTP 403 — `Sec-Fetch-Dest: iframe` rejected |
| 4 | POST approve with wrong nonce | HTTP 403 — invalid nonce |
| 5 | Read popup DOM via `window.open()` ref | `SecurityError` — COOP severed the relationship |
| 6 | Register Service Worker | Rejected — server blocks `Service-Worker: script` |

## Browser requirements

- **COOP**: Chrome 83+, Firefox 79+, Safari 15.2+
- **Sec-Fetch-\***: Chrome 76+, Firefox 90+, Safari 16.1+

For older browsers without `Sec-Fetch-*` headers, the server allows the request
(headers are absent), but COOP + nonce still provide protection. The consent page
would be visible to `fetch()` but the nonce can't be replayed after use.

## E2E tests (Playwright)

The attack table above is verified by 19 Playwright tests that prove the
security model works end-to-end — 13 HTTP-layer tests (Sec-Fetch filter, nonce
validation, nonce replay, Service Worker blocking, 404s) and 6 browser-flow
tests (popup approval happy path, COOP opener severing, and the in-page attack
buttons).

```bash
cd ai/docs/consent-poc
npm install
npx playwright install chromium
npm test
```

The Playwright config auto-starts `server.cjs` as its `webServer`, so you don't
have to run the server separately. `@playwright/test` is the only dev
dependency; the PoC server itself remains dependency-free.

## Files

- `server.cjs` — Node.js HTTP server (no dependencies). Implements all endpoints,
  security checks, and serves HTML inline. Uses `.cjs` extension because the parent
  `ai/package.json` has `"type": "module"`.
- `playwright.config.ts` — Playwright config; auto-starts `server.cjs` on port 4466.
- `tests/consent-poc.spec.ts` — 19 e2e tests covering the attack table above.
- `package.json` — only `@playwright/test` as a dev dependency.
