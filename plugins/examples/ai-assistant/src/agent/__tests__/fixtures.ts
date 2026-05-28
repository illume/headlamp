/**
 * Consolidated test fixtures for AI agent response parsing scenarios.
 *
 * This file merges three former fixture files into one:
 *   - testFixtures.ts   — real-world AI response fixtures
 *   - syntheticFixtures.ts — synthetic edge-case fixtures
 *   - findbugFixtures.ts   — bug-hunt regression fixtures (rounds 1–15)
 *
 * All export names are preserved so that existing tests and Storybook
 * stories continue to work without modification.
 */

// ---------------------------------------------------------------------------
// Helpers (deduplicated from the three original files)
// ---------------------------------------------------------------------------

/**
 * Helper: simulate a Rich-terminal-formatted line.
 * Real terminal output pads each content line to ~80 chars with ANSI color codes.
 */
function termLine(content: string, color = '97;40'): string {
  const padded = content.padEnd(78);
  return `\x1b[40m \x1b[0m\x1b[${color}m${padded}\x1b[0m\x1b[40m \x1b[0m`;
}

/** Helper: YAML comment line (grey on black) */
function commentLine(content: string): string {
  return termLine(content, '37;40');
}

/** Helper: Cyan-coloured code line (embedded Python in YAML) */
function codeLine(content: string): string {
  return termLine(content, '96;40');
}

/**
 * Helper: simulate a Rich code panel line.
 * Rich renders code blocks as panels with [40m background on every line,
 * with individual characters colored via different SGR codes.
 * The optional second color parameter mirrors the real terminal format
 * where keys and values have different colors, but our simplified helper
 * only applies the first color.
 */
function panelLine(content: string, keyColor = '97;40'): string {
  const padded = content.padEnd(78);
  return `\x1b[40m \x1b[0m\x1b[${keyColor}m${padded}\x1b[0m\x1b[40m \x1b[0m`;
}

/** Helper: blank panel line (just [40m background filling the whole width) */
function panelBlank(): string {
  return '\x1b[40m' + ' '.repeat(80) + '\x1b[0m';
}

/** Rich-terminal bold panel line (e.g. filename headings). Uses bold weight (1;97) unlike panelLine. */
function boldLine(content: string): string {
  return `\x1b[40m \x1b[0m\x1b[1;97;40m${content.padEnd(78)}\x1b[0m\x1b[40m \x1b[0m`;
}

/** Wrap a body array with the standard terminal prefix / suffix. */
function makeRaw(body: string[]): string {
  const prefix = [
    'stty -echo',
    '\x1b[?2004l',
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
    '\x1b[?2004l',
    '',
    "Loaded models: ['azure/gpt-4']",
    '\x1b[1;96mAI:\x1b[0m ',
    '',
  ];
  const suffix = ['', '\x1b[?2004hroot@aks-agent-abc123:/app# '];
  return [...prefix, ...body, ...suffix].join('\n');
}

/** Extract markdown fenced code blocks from a parsed result string. */
function extractCodeBlocks(result: string): string[] {
  const blocks: string[] = [];
  let inBlock = false;
  let current: string[] = [];
  for (const line of result.split('\n')) {
    if (/^```/.test(line.trim())) {
      if (inBlock) {
        blocks.push(current.join('\n'));
        current = [];
      }
      inBlock = !inBlock;
      continue;
    }
    if (inBlock) current.push(line);
  }
  return blocks;
}

/**
 * Assert that no ANSI escape sequences leaked into the output.
 * Throws an Error (no vitest dependency) so it works in any context.
 */
function assertNoAnsiLeaks(result: string): void {
  if (/\x1b/.test(result)) {
    throw new Error('ANSI escape (\\x1b) found in result');
  }
  if (/\x1b\[\d+m/.test(result)) {
    throw new Error('ANSI color code (ESC[Nm) found in result');
  }
}

export { panelLine, panelBlank, boldLine, makeRaw, extractCodeBlocks, assertNoAnsiLeaks };

// ===========================================================================
// Real-world fixtures (from testFixtures.ts)
// ===========================================================================

// ─── Fixture 1: Microservices YAML with embedded Python & terminal line wrapping ─

/**
 * Reproduces a real-world scenario where the AI returns a large multi-document
 * YAML manifest with:
 * - YAML comments containing paths (e.g. "# - ingress routes /api/* and /")
 *   that looksLikeShellOrDockerCodeLine falsely matches as shell code
 * - A long YAML comment split at 80-char boundary ("this would\ncall /api/*")
 * - Embedded Python code inside a YAML `args: - |` block
 * - Multiple YAML documents separated by ---
 *
 * Key bugs this fixture exposed:
 * 1. normalizeTerminalMarkdown wrapped "# - ingress routes /api/*" as shell code
 * 2. Terminal-wrapped "call /api/*" continuation got its own code fence
 * 3. These spurious fences broke the YAML into fragments in ContentRenderer
 */
export const rawMicroservicesPythonYaml = [
  '\x1b[?2004l',
  '',
  '\x1b[?2004h> ',
  '\x1b[?2004l',
  '\x1b[?2004h> ',
  '\x1b[?2004l',
  "Loaded models: \x1b[1m[\x1b[0m\x1b[32m'azure/gpt-5.2'\x1b[0m\x1b[1m]\x1b[0m",
  '\x1b[1;33mThis tool uses AI to generate responses and may not always be accurate.\x1b[0m',
  '\x1b[1;97mUser:\x1b[0m Show me a microservices demo with Python',
  '\x1b[1;96mAI:\x1b[0m ',
  // Terminal-formatted YAML comments
  commentLine('# microservices-demo.yaml'),
  commentLine('# Example "many microservices" app:'),
  commentLine('# - web (public entrypoint)'),
  commentLine('# - user + catalog (internal APIs)'),
  commentLine('# - orders (internal API) calls user+catalog via env vars'),
  commentLine('# - redis (state)'),
  // This comment contains /api/* path — triggers shell code false positive
  commentLine('# - ingress routes /api/* and /'),
  termLine(''),
  // First YAML document: Namespace
  termLine('apiVersion: v1'),
  termLine('kind: Namespace'),
  termLine('metadata:'),
  termLine('  name: micro-demo'),
  termLine('---'),
  // Second YAML document: Deployment with embedded Python
  termLine('apiVersion: apps/v1'),
  termLine('kind: Deployment'),
  termLine('metadata:'),
  termLine('  name: web'),
  termLine('  namespace: micro-demo'),
  termLine('spec:'),
  termLine('  replicas: 2'),
  termLine('  selector:'),
  termLine('    matchLabels: { app: web }'),
  termLine('  template:'),
  termLine('    metadata:'),
  termLine('      labels: { app: web }'),
  termLine('    spec:'),
  termLine('      containers:'),
  termLine('        - name: web'),
  termLine('          image: python:3.12-slim'),
  termLine('          ports:'),
  termLine('            - name: http'),
  termLine('              containerPort: 8080'),
  // This long YAML comment gets split at 80-char terminal boundary
  commentLine('          # Simple "web" that serves a landing page; in real setups this would'),
  // "call /api/*" is the continuation — looks like shell code but is YAML comment
  commentLine('call /api/*'),
  termLine('          command: ["python"]'),
  termLine('          args:'),
  termLine('            - -c'),
  termLine('            - |'),
  // Embedded Python code inside YAML args block
  codeLine('              from http.server import BaseHTTPRequestHandler, HTTPServer'),
  codeLine('              class H(BaseHTTPRequestHandler):'),
  codeLine('                def do_GET(self):'),
  codeLine('                  self.send_response(200)'),
  codeLine('                  self.send_header("Content-Type","text/plain")'),
  codeLine('                  self.end_headers()'),
  codeLine('                  self.wfile.write(b"web OK\\n")'),
  codeLine('              HTTPServer(("0.0.0.0",8080),H).serve_forever()'),
  termLine('          readinessProbe:'),
  termLine('            httpGet: { path: "/", port: 8080 }'),
  termLine('            initialDelaySeconds: 2'),
  termLine('          resources:'),
  termLine('            requests: { cpu: 25m, memory: 64Mi }'),
  termLine('            limits: { cpu: 200m, memory: 256Mi }'),
  termLine('---'),
  // Third YAML document: Service
  termLine('apiVersion: v1'),
  termLine('kind: Service'),
  termLine('metadata:'),
  termLine('  name: web'),
  termLine('  namespace: micro-demo'),
  termLine('spec:'),
  termLine('  selector: { app: web }'),
  termLine('  ports:'),
  termLine('    - name: http'),
  termLine('      port: 80'),
  termLine('      targetPort: 8080'),
  termLine('---'),
  // Fourth YAML document: Redis Deployment
  termLine('apiVersion: apps/v1'),
  termLine('kind: Deployment'),
  termLine('metadata:'),
  termLine('  name: redis'),
  termLine('  namespace: micro-demo'),
  termLine('spec:'),
  termLine('  replicas: 1'),
  termLine('  selector:'),
  termLine('    matchLabels: { app: redis }'),
  termLine('  template:'),
  termLine('    metadata:'),
  termLine('      labels: { app: redis }'),
  termLine('    spec:'),
  termLine('      containers:'),
  termLine('        - name: redis'),
  termLine('          image: redis:7-alpine'),
  termLine('          ports:'),
  termLine('            - name: redis'),
  termLine('              containerPort: 6379'),
  termLine('          resources:'),
  termLine('            requests: { cpu: 25m, memory: 64Mi }'),
  termLine('            limits: { cpu: 300m, memory: 256Mi }'),
  termLine('---'),
  // Fifth YAML document: Redis Service
  termLine('apiVersion: v1'),
  termLine('kind: Service'),
  termLine('metadata:'),
  termLine('  name: redis'),
  termLine('  namespace: micro-demo'),
  termLine('spec:'),
  termLine('  selector: { app: redis }'),
  termLine('  ports:'),
  termLine('    - name: redis'),
  termLine('      port: 6379'),
  termLine('      targetPort: 6379'),
  '',
  '',
  // Trailing kubectl commands
  termLine('kubectl apply -f microservices-demo.yaml'),
  termLine(''),
  termLine('kubectl get all -n micro-demo'),
  '',
  '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
].join('\r\n');

// ─── Fixture 2: Python Flask app with __name__ dunder pattern ────────────────

/**
 * Reproduces a scenario where the AI returns bare Python code with __name__
 * that gets interpreted as markdown bold (**name**) if not properly fenced.
 *
 * Key bugs this fixture exposed:
 * 1. "app = Flask(__name__)" → __name__ rendered as <strong>name</strong>
 * 2. "from flask import Flask" not detected as code
 * 3. "@app.route" decorator not detected as code
 */
export const rawPythonFlaskApp = [
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a simple Flask app:',
  '',
  'from flask import Flask, jsonify',
  'app = Flask(__name__)',
  '',
  '@app.route("/")',
  'def index():',
  '    return jsonify({"status": "ok"})',
  '',
  'if __name__ == "__main__":',
  '    app.run(host="0.0.0.0", port=5000)',
  '',
  'Save this as app.py and run it.',
  '',
  '\x1b[?2004hroot@aks-agent-pod:/app# ',
].join('\r\n');

// ─── Fixture 3: Python imports (bare, no Flask) ─────────────────────────────

/**
 * Simple scenario: bare Python imports that should be fenced as code.
 */
export const rawPythonImports = [
  '\x1b[1;96mAI:\x1b[0m ',
  'Use this script:',
  '',
  'import os',
  'from pathlib import Path',
  '',
  'That will work.',
  '',
  '\x1b[?2004hroot@aks-agent-pod:/app# ',
].join('\r\n');

// ─── Fixture 4: Rust Axum app with indented method chains and {-blocks ────────

/**
 * Reproduces a real-world scenario where the AI returns Rust code with:
 * - Rust `use` imports, `async fn`, `let` bindings
 * - Method chains (.route(...)) indented under a let binding
 * - #[tokio::main] attribute
 * - Closing braces `}` on their own lines
 * - Mixed content: shell commands, Cargo.toml, Rust source, Dockerfile, YAML
 *
 * Key bugs this fixture exposes:
 * 1. normalizeTerminalMarkdown wraps Rust code but closes at indented .route()
 * 2. Closing `}` leaks as plain text paragraph
 * 3. Indented method chains broken into separate code blocks
 */
export const rawRustAxumApp = [
  '\x1b[?2004l',
  '',
  '\x1b[?2004h> ',
  '\x1b[?2004l',
  "Loaded models: \x1b[1m[\x1b[0m\x1b[32m'azure/gpt-5.2'\x1b[0m\x1b[1m]\x1b[0m",
  '\x1b[1;33mThis tool uses AI to generate responses and may not always be accurate.\x1b[0m',
  '\x1b[1;97mUser:\x1b[0m Show me how to deploy a rust example app to kubernetes?',
  '\x1b[1;96mAI:\x1b[0m ',
  // Section heading (centered, bold+underline) — real Rich terminal format
  '                         \x1b[1;4m1) Create a tiny Rust HTTP app\x1b[0m                         ',
  '',
  // Bold heading for file name (NOT inside panel — Rich renders these outside)
  '\x1b[1mCargo.toml\x1b[0m'.padEnd(80),
  '',
  // Rich code panel: [40m background on EVERY line, each char individually colored
  panelBlank(),
  panelLine('[package]', '96;40'),
  panelLine('name = "rust-k8s-example"', '97;40'),
  panelLine('version = "0.1.0"', '97;40'),
  panelLine('edition = "2021"', '97;40'),
  panelBlank(),
  panelLine('[dependencies]', '96;40'),
  panelLine('axum = "0.7"', '97;40'),
  panelLine('tokio = { version = "1", features = ["macros", "rt-multi-thread"] }', '97;40'),
  panelBlank(),
  '',
  // Bold heading for Rust source file
  '\x1b[1msrc/main.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('use axum::{routing::get, Router};', '96;40'),
  panelLine('use std::net::SocketAddr;', '96;40'),
  panelBlank(),
  panelLine("async fn healthz() -> &'static str {", '96;40'),
  panelLine('    "ok"', '93;40'),
  panelLine('}'),
  panelBlank(),
  panelLine("async fn root() -> &'static str {", '96;40'),
  panelLine('    "hello from rust"', '93;40'),
  panelLine('}'),
  panelBlank(),
  panelLine('#[tokio::main]', '37;40'),
  panelLine('async fn main() {', '96;40'),
  panelLine('    let app = Router::new()', '96;40'),
  panelLine('        .route("/", get(root))', '97;40'),
  panelLine('        .route("/healthz", get(healthz));', '97;40'),
  panelBlank(),
  panelLine('    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));', '96;40'),
  panelLine('    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();', '97;40'),
  panelLine('    axum::serve(listener, app).await.unwrap();', '97;40'),
  panelLine('}'),
  panelBlank(),
  '',
  '',
  // Section 2 heading
  '                 \x1b[1;4m2) Containerize it (multi-stage Docker build)\x1b[0m                  ',
  '',
  // Bold heading for Dockerfile
  '\x1b[1mDockerfile\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('# build stage', '37;40'),
  panelLine('FROM rust:1.76 as builder', '96;40'),
  panelLine('WORKDIR /app', '96;40'),
  panelLine('COPY Cargo.toml Cargo.lock ./', '96;40'),
  panelLine('RUN mkdir -p src && echo "fn main(){}" > src/main.rs', '96;40'),
  panelLine('RUN cargo build --release', '96;40'),
  panelLine('COPY src ./src', '96;40'),
  panelLine('RUN cargo build --release', '96;40'),
  panelBlank(),
  panelLine('# runtime stage', '37;40'),
  panelLine('FROM gcr.io/distroless/cc-debian12:nonroot', '96;40'),
  panelLine('WORKDIR /app', '96;40'),
  panelLine(
    'COPY --from=builder /app/target/release/rust-k8s-example /app/rust-k8s-example',
    '96;40'
  ),
  panelLine('EXPOSE 8080', '96;40'),
  panelLine('USER nonroot:nonroot', '96;40'),
  panelLine('ENTRYPOINT ["/app/rust-k8s-example"]', '96;40'),
  panelBlank(),
  '',
  'Build + push (example with Docker Hub):'.padEnd(80),
  '',
  panelBlank(),
  panelLine('export IMAGE=docker.io/<youruser>/rust-k8s-example:0.1.0', '97;40'),
  panelLine('docker build -t $IMAGE .', '97;40'),
  panelLine('docker push $IMAGE', '97;40'),
  panelBlank(),
  '',
  '',
  // Section 3 heading
  '                            \x1b[1;4m3) Deploy to Kubernetes\x1b[0m                             ',
  '',
  'Save as \x1b[1;36;40mk8s.yaml\x1b[0m (replace \x1b[1;36;40mimage:\x1b[0m with your pushed image):'.padEnd(
    80
  ),
  '',
  panelBlank(),
  panelLine('apiVersion: v1', '91;40'),
  panelLine('kind: Namespace', '91;40'),
  panelLine('metadata:', '91;40'),
  panelLine('  name: rust-demo', '91;40'),
  panelLine('---', '97;40'),
  panelLine('apiVersion: apps/v1', '91;40'),
  panelLine('kind: Deployment', '91;40'),
  panelLine('metadata:', '91;40'),
  panelLine('  name: rust-k8s-example', '91;40'),
  panelLine('  namespace: rust-demo', '91;40'),
  panelLine('spec:', '91;40'),
  panelLine('  replicas: 2', '91;40'),
  panelLine('  selector:', '91;40'),
  panelLine('    matchLabels:', '91;40'),
  panelLine('      app: rust-k8s-example', '91;40'),
  panelLine('  template:', '91;40'),
  panelLine('    metadata:', '91;40'),
  panelLine('      labels:', '91;40'),
  panelLine('        app: rust-k8s-example', '91;40'),
  panelLine('    spec:', '91;40'),
  panelLine('      containers:', '91;40'),
  panelLine('        - name: app', '91;40'),
  panelLine('          image: docker.io/<youruser>/rust-k8s-example:0.1.0', '91;40'),
  panelLine('          ports:', '91;40'),
  panelLine('            - containerPort: 8080', '91;40'),
  panelLine('          readinessProbe:', '91;40'),
  panelLine('            httpGet:', '91;40'),
  panelLine('              path: /healthz', '91;40'),
  panelLine('              port: 8080', '91;40'),
  panelLine('            initialDelaySeconds: 2', '91;40'),
  panelLine('            periodSeconds: 5', '91;40'),
  panelLine('          livenessProbe:', '91;40'),
  panelLine('            httpGet:', '91;40'),
  panelLine('              path: /healthz', '91;40'),
  panelLine('              port: 8080', '91;40'),
  panelLine('            initialDelaySeconds: 10', '91;40'),
  panelLine('            periodSeconds: 10', '91;40'),
  panelLine('          resources:', '91;40'),
  panelLine('            requests:', '91;40'),
  panelLine('              cpu: 50m', '91;40'),
  panelLine('              memory: 64Mi', '91;40'),
  panelLine('            limits:', '91;40'),
  panelLine('              cpu: 250m', '91;40'),
  panelLine('              memory: 256Mi', '91;40'),
  panelLine('---', '97;40'),
  panelLine('apiVersion: v1', '91;40'),
  panelLine('kind: Service', '91;40'),
  panelLine('metadata:', '91;40'),
  panelLine('  name: rust-k8s-example', '91;40'),
  panelLine('  namespace: rust-demo', '91;40'),
  panelLine('spec:', '91;40'),
  panelLine('  selector:', '91;40'),
  panelLine('    matchLabels:', '91;40'),
  panelLine('      app: rust-k8s-example', '91;40'),
  panelLine('  ports:', '91;40'),
  panelLine('    - name: http', '91;40'),
  panelLine('      port: 80', '91;40'),
  panelLine('      targetPort: 8080', '91;40'),
  panelLine('  type: ClusterIP', '91;40'),
  panelBlank(),
  '',
  'Apply + test:'.padEnd(80),
  '',
  panelBlank(),
  panelLine('kubectl apply -f k8s.yaml', '97;40'),
  panelLine('kubectl -n rust-demo get pods', '97;40'),
  panelLine('kubectl -n rust-demo port-forward svc/rust-k8s-example 8080:80', '97;40'),
  panelLine('curl http://localhost:8080/', '97;40'),
  panelLine('curl http://localhost:8080/healthz', '97;40'),
  panelBlank(),
  '',
  'If you want it exposed externally, tell me what you have (Ingress controller?',
  "AKS LoadBalancer?) and I'll give the exact Service/Ingress YAML.",
  '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
].join('\r\n');

// ─── Fixture 5: Rust K8s deployment with bold section headings & large YAML ──

/**
 * Reproduces a real-world scenario where:
 * - The AI doesn't use "# filename" headers; instead Rich renders bold section
 *   headings like "Dockerfile (multi-stage, small runtime image)" centered.
 * - A bold section heading wraps across two terminal lines:
 *   "Kubernetes manifests (Namespace + ConfigMap + Deployment + Service + optional"
 *   "                            Ingress + optional HPA)"
 * - A YAML key is split by a newline inside the code panel:
 *   "averageUtilization\n: 70"
 * - The YAML block is large (Namespace + ConfigMap + Deployment + Service +
 *   Ingress + HPA) and needs to stay as one ```yaml``` block.
 *
 * Key bugs this fixture exposes:
 * 1. Bold wrapped section heading gets partially absorbed into code block
 * 2. YAML key split by newline produces "averageUtilization" code block + ": 70" text
 * 3. The Dockerfile code block may absorb the next section heading
 */
export const rawRustK8sDeployment = [
  '\x1b[?2004l',
  '',
  '\x1b[?2004h> ',
  '\x1b[?2004l',
  "Loaded models: \x1b[1m[\x1b[0m\x1b[32m'azure/gpt-5.2'\x1b[0m\x1b[1m]\x1b[0m",
  '\x1b[1;33mThis tool uses AI to generate responses and may not always be accurate.\x1b[0m',
  '\x1b[1;97mUser:\x1b[0m Show me an example rust deployment to kubernetes?',
  '\x1b[1;96mAI:\x1b[0m ',
  // Prose intro
  'Example Rust HTTP service (listens on \x1b[1;36;40m0.0.0.0:8080\x1b[0m, has \x1b[1;36;40m/healthz\x1b[0m and \x1b[1;36;40m/readyz\x1b[0m)'.padEnd(
    80
  ),
  'deployed to Kubernetes.'.padEnd(80),
  '',
  // Bold centered section heading: "Dockerfile (multi-stage, small runtime image)"
  '                 \x1b[1mDockerfile (multi-stage, small runtime image)\x1b[0m'.padEnd(80),
  '',
  // Dockerfile panel
  panelBlank(),
  panelLine('# syntax=docker/dockerfile:1', '37;40'),
  panelLine('', '40'),
  panelLine('FROM rust:1.76-bullseye AS builder', '96;40'),
  panelLine('WORKDIR /app', '96;40'),
  panelLine('', '40'),
  panelLine('# Cache deps', '37;40'),
  panelLine('COPY Cargo.toml Cargo.lock ./', '96;40'),
  panelLine('RUN mkdir -p src && echo "fn main() {}" > src/main.rs', '96;40'),
  panelLine('RUN cargo build --release', '96;40'),
  panelLine('', '40'),
  panelLine('# Build real app', '37;40'),
  panelLine('COPY . .', '96;40'),
  panelLine('RUN cargo build --release', '96;40'),
  panelLine('', '40'),
  panelLine('# Minimal runtime', '37;40'),
  panelLine('FROM debian:bookworm-slim', '96;40'),
  panelLine('RUN useradd -u 10001 -m appuser \\', '96;40'),
  panelLine('  && apt-get update \\', '96;40'),
  panelLine('  && apt-get install -y --no-install-recommends ca-certificates \\', '96;40'),
  panelLine('  && rm -rf /var/lib/apt/lists/*', '96;40'),
  panelLine('WORKDIR /app', '96;40'),
  panelLine('COPY --from=builder /app/target/release/my-rust-app /app/my-rust-app', '96;40'),
  panelLine('USER 10001:10001', '96;40'),
  panelLine('EXPOSE 8080', '96;40'),
  panelLine('ENV RUST_LOG=info', '96;40'),
  panelLine('ENTRYPOINT ["/app/my-rust-app"]', '96;40'),
  panelBlank(),
  '',
  // Bold section heading that wraps across TWO terminal lines
  ' \x1b[1mKubernetes manifests (Namespace + ConfigMap + Deployment + Service + optional\x1b[0m'.padEnd(
    80
  ),
  '                            \x1b[1mIngress + optional HPA)\x1b[0m'.padEnd(80),
  '',
  // YAML panel — large manifest
  panelBlank(),
  panelLine('apiVersion: v1', '91;40'),
  panelLine('kind: Namespace', '91;40'),
  panelLine('metadata:', '91;40'),
  panelLine('  name: rust-demo', '91;40'),
  panelLine('---', '97;40'),
  panelLine('apiVersion: v1', '91;40'),
  panelLine('kind: ConfigMap', '91;40'),
  panelLine('metadata:', '91;40'),
  panelLine('  name: my-rust-app-config', '91;40'),
  panelLine('  namespace: rust-demo', '91;40'),
  panelLine('data:', '91;40'),
  panelLine('  RUST_LOG: "info"', '91;40'),
  panelLine('  APP_GREETING: "hello from rust"', '91;40'),
  panelLine('---', '97;40'),
  panelLine('apiVersion: apps/v1', '91;40'),
  panelLine('kind: Deployment', '91;40'),
  panelLine('metadata:', '91;40'),
  panelLine('  name: my-rust-app', '91;40'),
  panelLine('  namespace: rust-demo', '91;40'),
  panelLine('  labels:', '91;40'),
  panelLine('    app: my-rust-app', '91;40'),
  panelLine('spec:', '91;40'),
  panelLine('  replicas: 2', '91;40'),
  panelLine('  selector:', '91;40'),
  panelLine('    matchLabels:', '91;40'),
  panelLine('      app: my-rust-app', '91;40'),
  panelLine('  template:', '91;40'),
  panelLine('    metadata:', '91;40'),
  panelLine('      labels:', '91;40'),
  panelLine('        app: my-rust-app', '91;40'),
  panelLine('    spec:', '91;40'),
  panelLine('      securityContext:', '91;40'),
  panelLine('        seccompProfile:', '91;40'),
  panelLine('          type: RuntimeDefault', '91;40'),
  panelLine('      containers:', '91;40'),
  panelLine('        - name: app', '91;40'),
  panelLine('          image: ghcr.io/your-org/my-rust-app:1.0.0', '91;40'),
  panelLine('          imagePullPolicy: IfNotPresent', '91;40'),
  panelLine('          ports:', '91;40'),
  panelLine('            - name: http', '91;40'),
  panelLine('              containerPort: 8080', '91;40'),
  panelLine('          envFrom:', '91;40'),
  panelLine('            - configMapRef:', '91;40'),
  panelLine('                name: my-rust-app-config', '91;40'),
  panelLine('          resources:', '91;40'),
  panelLine('            requests:', '91;40'),
  panelLine('              cpu: 50m', '91;40'),
  panelLine('              memory: 64Mi', '91;40'),
  panelLine('            limits:', '91;40'),
  panelLine('              cpu: 500m', '91;40'),
  panelLine('              memory: 256Mi', '91;40'),
  panelLine('          securityContext:', '91;40'),
  panelLine('            allowPrivilegeEscalation: false', '91;40'),
  panelLine('            readOnlyRootFilesystem: true', '91;40'),
  panelLine('            runAsNonRoot: true', '91;40'),
  panelLine('            runAsUser: 10001', '91;40'),
  panelLine('            capabilities:', '91;40'),
  panelLine('              drop: ["ALL"]', '91;40'),
  panelLine('          livenessProbe:', '91;40'),
  panelLine('            httpGet:', '91;40'),
  panelLine('              path: /healthz', '91;40'),
  panelLine('              port: http', '91;40'),
  panelLine('            initialDelaySeconds: 10', '91;40'),
  panelLine('            periodSeconds: 10', '91;40'),
  panelLine('            timeoutSeconds: 2', '91;40'),
  panelLine('            failureThreshold: 3', '91;40'),
  panelLine('          readinessProbe:', '91;40'),
  panelLine('            httpGet:', '91;40'),
  panelLine('              path: /readyz', '91;40'),
  panelLine('              port: http', '91;40'),
  panelLine('            initialDelaySeconds: 3', '91;40'),
  panelLine('            periodSeconds: 5', '91;40'),
  panelLine('            timeoutSeconds: 2', '91;40'),
  panelLine('            failureThreshold: 3', '91;40'),
  panelLine('---', '97;40'),
  panelLine('apiVersion: v1', '91;40'),
  panelLine('kind: Service', '91;40'),
  panelLine('metadata:', '91;40'),
  panelLine('  name: my-rust-app', '91;40'),
  panelLine('  namespace: rust-demo', '91;40'),
  panelLine('spec:', '91;40'),
  panelLine('  selector:', '91;40'),
  panelLine('    app: my-rust-app', '91;40'),
  panelLine('  ports:', '91;40'),
  panelLine('    - name: http', '91;40'),
  panelLine('      port: 80', '91;40'),
  panelLine('      targetPort: http', '91;40'),
  panelLine('  type: ClusterIP', '91;40'),
  panelLine('---', '97;40'),
  panelLine('# Optional: Ingress (requires an Ingress controller, e.g., nginx)', '37;40'),
  panelLine('apiVersion: networking.k8s.io/v1', '91;40'),
  panelLine('kind: Ingress', '91;40'),
  panelLine('metadata:', '91;40'),
  panelLine('  name: my-rust-app', '91;40'),
  panelLine('  namespace: rust-demo', '91;40'),
  panelLine('spec:', '91;40'),
  panelLine('  ingressClassName: nginx', '91;40'),
  panelLine('  rules:', '91;40'),
  panelLine('    - host: my-rust-app.example.com', '91;40'),
  panelLine('      http:', '91;40'),
  panelLine('        paths:', '91;40'),
  panelLine('          - path: /', '91;40'),
  panelLine('            pathType: Prefix', '91;40'),
  panelLine('            backend:', '91;40'),
  panelLine('              service:', '91;40'),
  panelLine('                name: my-rust-app', '91;40'),
  panelLine('                port:', '91;40'),
  panelLine('                  number: 80', '91;40'),
  panelLine('---', '97;40'),
  panelLine('# Optional: HPA (requires metrics-server)', '37;40'),
  panelLine('apiVersion: autoscaling/v2', '91;40'),
  panelLine('kind: HorizontalPodAutoscaler', '91;40'),
  panelLine('metadata:', '91;40'),
  panelLine('  name: my-rust-app', '91;40'),
  panelLine('  namespace: rust-demo', '91;40'),
  panelLine('spec:', '91;40'),
  panelLine('  scaleTargetRef:', '91;40'),
  panelLine('    apiVersion: apps/v1', '91;40'),
  panelLine('    kind: Deployment', '91;40'),
  panelLine('    name: my-rust-app', '91;40'),
  panelLine('  minReplicas: 2', '91;40'),
  panelLine('  maxReplicas: 10', '91;40'),
  panelLine('  metrics:', '91;40'),
  panelLine('    - type: Resource', '91;40'),
  panelLine('      resource:', '91;40'),
  panelLine('        name: cpu', '91;40'),
  panelLine('        target:', '91;40'),
  panelLine('          type: Utilization', '91;40'),
  // The real terminal output has a newline splitting the YAML key from its colon
  // This simulates: "averageUtilization\n: 70" as seen in the actual console log
  panelLine('          averageUtilization', '91;40'),
  panelLine(': 70', '91;40'),
  panelBlank(),
  '',
  'Apply:'.padEnd(80),
  '',
  panelBlank(),
  panelLine('kubectl apply -f k8s.yaml', '97;40'),
  panelBlank(),
  '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
].join('\r\n');

export const rawPodStatus = [
  '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
  "python /app/aks-agent.py ask 'what pods are running?'",
  '\x1b[?2004l',
  "Loaded models: ['gpt-4']",
  'Task List:',
  '+------+------------------+---------+',
  '| ID   | Description      | Status  |',
  '+------+------------------+---------+',
  '| t1   | Check pods       | [~] in_progress |',
  '+------+------------------+---------+',
  'AI: Here are the running pods in the `kube-system` namespace:',
  '',
  '| Pod Name | Status | Restarts |',
  '|----------|--------|----------|',
  '| coredns-7c6bf4f | Running | 0 |',
  '| kube-proxy-abc12 | Running | 0 |',
  '| metrics-server-xyz | Running | 2 |',
  '',
  'All pods are healthy.',
  'root@aks-agent-abc1234def-x9y8z:/app#',
].join('\n');

export const rawCrashDiagnosis = [
  '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
  "python /app/aks-agent.py ask 'why is my pod crashing?'",
  '\x1b[?2004l',
  "Loaded models: ['gpt-4']",
  '+------+-------------------+-------------------+',
  '| t1   | Check pod status  | [✓] completed     |',
  '| t2   | Get pod logs      | [✓] completed     |',
  '+------+-------------------+-------------------+',
  'AI: Your pod `web-app-6f8b9c4d7-x2k9p` is in a **CrashLoopBackOff** state. Here is what I found:',
  '',
  '## Root Cause',
  '',
  'The container is failing because it cannot connect to the database. The logs show:',
  '',
  '```',
  'Error: connect ECONNREFUSED 10.0.0.5:5432',
  '    at TCPConnectWrap.afterConnect [as oncomplete]',
  '```',
  '',
  '## Recommended Steps',
  '',
  '1. Check if the database pod is running: `kubectl get pods -l app=postgres`',
  '2. Verify the service endpoint: `kubectl get endpoints postgres-svc`',
  '3. Check network policies that might block traffic between namespaces',
  '',
  '> **Note**: The pod has restarted 15 times in the last hour.',
  'root@aks-agent-abc1234def-x9y8z:/app#',
].join('\n');

export const rawBestPractices = [
  '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
  "python /app/aks-agent.py ask 'IMPORTANT INSTRUCTIONS:",
  '\x1b[?2004l',
  '\x1b[?2004h>',
  '- When returning any YAML content, always wrap it inside a markdown code block using ```yaml ... ``` so it renders properly.',
  '\x1b[?2004l',
  '\x1b[?2004h>',
  '- The conversation history below shows all previously asked questions and your answers.',
  '\x1b[?2004l',
  '\x1b[?2004h>',
  'Now answer the following new question:',
  '\x1b[?2004l',
  '\x1b[?2004h>',
  "what best practices should I follow for AKS?'",
  '\x1b[?2004l',
  "Loaded models: ['gpt-4']",
  'AI: Here are the key best practices for AKS:',
  '',
  '- **Use managed identities** instead of service principals for authentication',
  '- **Enable Azure Policy** to enforce organizational standards',
  '- **Configure autoscaling** for both cluster and pods:',
  '  - Cluster Autoscaler for node pools',
  '  - Horizontal Pod Autoscaler (HPA) for workloads',
  '- **Use Azure CNI** networking for better integration with VNets',
  '- **Enable monitoring** with Container Insights and Prometheus',
  '- **Implement network policies** to control pod-to-pod traffic',
  '- **Use node pools** to separate system and user workloads',
  '',
  'For more details, see the [AKS best practices documentation](https://learn.microsoft.com/en-us/azure/aks/best-practices).',
  'root@aks-agent-abc1234def-x9y8z:/app#',
].join('\n');

export const rawMultiResource = [
  '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
  "python /app/aks-agent.py ask 'create a complete app with deployment and service'",
  '\x1b[?2004l',
  "Loaded models: ['gpt-4']",
  '| t1 | Create resources | [✓] completed |',
  'AI: Here is a complete application setup with a Deployment and Service:',
  '',
  '### Deployment',
  '',
  '```yaml',
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: web-app',
  '  labels:',
  '    app: web-app',
  'spec:',
  '  replicas: 2',
  '  selector:',
  '    matchLabels:',
  '      app: web-app',
  '  template:',
  '    metadata:',
  '      labels:',
  '        app: web-app',
  '    spec:',
  '      containers:',
  '      - name: web',
  '        image: myregistry.azurecr.io/web-app:latest',
  '        ports:',
  '        - containerPort: 3000',
  '        resources:',
  '          requests:',
  '            cpu: 100m',
  '            memory: 128Mi',
  '          limits:',
  '            cpu: 250m',
  '            memory: 256Mi',
  '```',
  '',
  '### Service',
  '',
  '```yaml',
  'apiVersion: v1',
  'kind: Service',
  'metadata:',
  '  name: web-app-svc',
  'spec:',
  '  type: LoadBalancer',
  '  selector:',
  '    app: web-app',
  '  ports:',
  '  - port: 80',
  '    targetPort: 3000',
  '```',
  '',
  'Apply both with: `kubectl apply -f app.yaml`',
  'root@aks-agent-abc1234def-x9y8z:/app#',
].join('\n');

export const rawBareYamlService = [
  '\x1b[?2004hroot@aks-agent-abc1234def-x9y8z:/app#',
  "python /app/aks-agent.py ask 'create a service'",
  '\x1b[?2004l',
  "\x1b[1mLoaded models:\x1b[0m [\x1b[32m'gpt-4'\x1b[0m]",
  '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓',
  '┃ Task List                       ┃',
  '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛',
  '| t1 | Create service | [✓] completed |',
  '\x1b[1mAI:\x1b[0m Here is a Service:',
  '',
  'apiVersion: v1',
  'kind: Service',
  'metadata:',
  '  name: my-service',
  '  namespace: default',
  'spec:',
  '  type: LoadBalancer',
  '  selector:',
  '    app: nginx',
  '  ports:',
  '  - protocol: TCP',
  '    port: 80',
  '    targetPort: 8080',
  '',
  'This Service exposes your application on port 80.',
  'root@aks-agent-abc1234def-x9y8z:/app#',
].join('\n');

export const rawPythonDeploymentAdvice = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-redacted:/app# ',
  '\x1b[?2004l',
  '',
  '\x1b[?2004h',
  '> ',
  '\x1b[?2004l',
  '',
  '\x1b[?2004h> ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-5.x']",
  '✅ Toolset core_investigation',
  '✅ Toolset internet',
  'Received session ID: mcp-session-REDACTED',
  'Negotiated protocol version: 2025-06-18',
  '✅ Toolset aks_mcp',
  'Using 3 datasources (toolsets). To refresh: use flag `--refresh-toolsets`',
  'NO ENABLED LOGGING TOOLSET',
  'Using model: azure/gpt-5.x (272,000 total tokens, 54,400 output tokens)',
  'This tool uses AI to generate responses and may not always be accurate.',
  'User: IMPORTANT INSTRUCTIONS:',
  '- When returning any YAML content, always wrap it inside a markdown code block',
  'using ```yaml ... ``` so it renders properly.',
  '- The conversation history below shows all previously asked questions and your',
  'answers. Keep that context in mind and answer accordingly — do not repeat',
  'information already provided unless the user explicitly asks for it.',
  'Now answer the following new question:',
  'How do I deploy a python application?',
  'The AI requested 1 tool call(s).',
  'Running tool #1 TodoWrite: Update investigation tasks',
  'Task List:',
  '+----+--------------------------------------+-----------------+',
  '| ID | Content                              | Status          |',
  '+----+--------------------------------------+-----------------+',
  '| 1  | Clarify deployment target           | [~] in_progress |',
  '| 2  | Provide deployment examples         | [ ] pending     |',
  '| 3  | Include runtime best practices      | [ ] pending     |',
  '| 4  | Final review                        | [ ] pending     |',
  '+----+--------------------------------------+-----------------+',
  'Finished #1 in 0.00s, output length: 787 characters (12 lines) - /show 1 to',
  'view contents',
  '',
  '\x1b[1;96mAI:\x1b[0m ',
  'Which deployment target do you mean?',
  '',
  '\x1b[1;33m 1 \x1b[0m\x1b[1mKubernetes (AKS)\x1b[0m (Deployment/Service/Ingress YAML)',
  '\x1b[1;33m 2 \x1b[0m\x1b[1mContainer on a VM\x1b[0m (Dockerfile + \x1b[1;36;40mdocker run\x1b[0m or compose)',
  '\x1b[1;33m 3 \x1b[0m\x1b[1mPaaS\x1b[0m (Azure App Service / Container Apps / Cloud Run / Heroku-like)',
  '\x1b[1;33m 4 \x1b[0m\x1b[1mBare VM\x1b[0m (systemd + nginx + venv)',
  '',
  'Reply with: \x1b[1mtarget + framework\x1b[0m (e.g., “AKS + FastAPI” or “Docker VM + Flask”)',
  'and \x1b[1mhow it should be exposed\x1b[0m (public HTTP, internal-only, background',
  'worker/cron).',
  '',
  'While you answer, here’s a solid default pattern that works almost everywhere:',
  '',
  '                 \x1b[1;4mPython web app deployment checklist (generic)\x1b[0m',
  '',
  '\x1b[1;33m • \x1b[0mCreate \x1b[1;36;40mrequirements.txt\x1b[0m (or \x1b[1;36;40mpyproject.toml\x1b[0m)',
  '\x1b[1;33m • \x1b[0mAdd a production server:',
  '\x1b[1;33m   \x1b[0m\x1b[1;33m • \x1b[0m\x1b[1mFlask/Django (WSGI):\x1b[0m \x1b[1;36;40mgunicorn\x1b[0m',
  '\x1b[1;33m   \x1b[0m\x1b[1;33m • \x1b[0m\x1b[1mFastAPI/Starlette (ASGI):\x1b[0m \x1b[1;36;40muvicorn\x1b[0m (often behind gunicorn worker)',
  '\x1b[1;33m • \x1b[0mRead config from \x1b[1menv vars\x1b[0m (no secrets in code)',
  '\x1b[1;33m • \x1b[0mAdd \x1b[1;36;40m/healthz\x1b[0m endpoint for health checks',
  '\x1b[1;33m • \x1b[0mPin Python version (e.g., \x1b[1;36;40mpython:3.12-slim\x1b[0m)',
  '',
  '          \x1b[1;4mExample: containerize (works for AKS, any container runtime)\x1b[0m',
  '',
  '\x1b[1mDockerfile (FastAPI example)\x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[96;40mFROM\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40mpython:3.12-slim\x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mWORKDIR\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m/app\x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mCOPY\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mrequirements.txt\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mRUN\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mpip install --no-cache-dir -r requirements.txt\x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mCOPY\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mEXPOSE\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m8000\x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mCMD\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m[\x1b[0m\x1b[93;40m"uvicorn"\x1b[0m\x1b[97;40m, "main:app", "--host", "0.0.0.0", "--port", "8000"]\x1b[0m',
  '',
  'Build + run:',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mdocker build -t myapp:latest .\x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40mdocker run --rm -p 8000:8000 myapp:latest\x1b[0m',
  '',
  'I can give you the exact \x1b[1mKubernetes YAML\x1b[0m (Deployment/Service/Ingress) or',
  '\x1b[1msystemd/nginx\x1b[0m setup once you confirm the target.',
  '\x1b[?2004hroot@aks-agent-redacted:/app# ',
].join('\n');

export const rawJavaDeployTerminal = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-846df6ffb-tz9xn:/app# ',
  '\x1b[?2004l',
  '',
  '\x1b[?2004h',
  '> ',
  '\x1b[?2004l',
  '',
  "Loaded models: \x1b[1m[\x1b[0m\x1b[32m'azure/gpt-5-2'\x1b[0m\x1b[1m]\x1b[0m",
  '\u2705 Toolset core_investigation',
  'Using \x1b[1;36m4\x1b[0m datasources',
  'NO ENABLED LOGGING TOOLSET',
  '\x1b[1;97mUser:\x1b[0m IMPORTANT INSTRUCTIONS:',
  'Now answer: Show me an example java application deploy on kubernetes?',
  'The AI requested \x1b[1;36m1\x1b[0m tool call.',
  'Running tool #1 TodoWrite: Update tasks',
  'Task List:',
  '+----+----------------------------+---------------+',
  '| ID | Content                    | Status        |',
  '+----+----------------------------+---------------+',
  '| t1 | Create K8s YAML            | completed     |',
  '+----+----------------------------+---------------+',
  '  Finished #1 in 0.00s',
  '\x1b[1;96mAI:\x1b[0m ',
  "Here's a minimal, production-ready example for deploying a Java (Spring Boot)   ",
  '',
  "app on Kubernetes. Adjust health probe paths if you don't use Spring Boot       ",
  '',
  'Actuator.                                                                       ',
  '',
  '',
  'Dockerfile (multi-stage build):                                                 ',
  '',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40m# syntax=docker/dockerfile:1\x1b[0m\x1b[40m                                                  \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mFROM maven:3.9-eclipse-temurin-17 AS build\x1b[0m\x1b[40m                                    \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mWORKDIR /src\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mCOPY pom.xml .\x1b[0m\x1b[40m                                                                \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mRUN mvn -B -q -DskipTests dependency:go-offline\x1b[0m\x1b[40m                               \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mCOPY src ./src\x1b[0m\x1b[40m                                                                \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mRUN mvn -B -q -DskipTests package\x1b[0m\x1b[40m                                             \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mFROM eclipse-temurin:17-jre\x1b[0m\x1b[40m                                                   \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mWORKDIR /app\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mCOPY --from=build /src/target/app.jar ./app.jar\x1b[0m\x1b[40m                               \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mEXPOSE 8080\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[97;40mCMD ["bash","-lc","java $JAVA_OPTS -jar app.jar"]\x1b[0m\x1b[40m                              \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  '',
  'Kubernetes manifests (Deployment + Service):                                    ',
  '',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mNamespace                                                               \x1b[0m\x1b[40m \x1b[0m',
  '',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mdemo                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mapps/v1                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mDeployment                                                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mjava-hello                                                            \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mspec\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mreplicas\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m2                                                                 \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mService                                                                 \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mjava-hello                                                            \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mspec\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mtype\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mClusterIP                                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mports\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                      \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m    \x1b[0m\x1b[40m-\x1b[0m\x1b[97;40m \x1b[0m\x1b[91;40mport\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m80                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m      \x1b[0m\x1b[91;40mtargetPort\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m8080                                                        \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  'Build/push and deploy:                                                          ',
  '',
  '\x1b[1;33m \u2022 \x1b[0mBuild: docker build -t ghcr.io/yourorg/java-hello:1.0.0 .                    ',
  '\x1b[1;33m \u2022 \x1b[0mPush: docker login ghcr.io; docker push ghcr.io/yourorg/java-hello:1.0.0     ',
  '\x1b[1;33m \u2022 \x1b[0mApply: kubectl apply -f k8s.yaml                                             ',
  '',
  'Notes:                                                                          ',
  '',
  '\x1b[1;33m \u2022 \x1b[0mFor HPA to work, install metrics-server in the cluster.                      ',
  '',
  '\x1b[?2004hroot@aks-agent-846df6ffb-tz9xn:/app# ',
].join('\r\n');

export const rawJavaDeployOptionAB = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
  '\x1b[?2004l',
  '',
  '\x1b[?2004h> ',
  '\x1b[?2004l',
  '',
  "Loaded models: \x1b[1m[\x1b[0m\x1b[32m'azure/gpt-5.2'\x1b[0m\x1b[1m]\x1b[0m",
  '\u2705 Toolset core_investigation',
  '\u2705 Toolset aks_mcp',
  'Using \x1b[1;36m3\x1b[0m datasources',
  'NO ENABLED LOGGING TOOLSET',
  '\x1b[1;97mUser:\x1b[0m IMPORTANT INSTRUCTIONS:',
  'Now answer the following new question:',
  'Show me how to deploy an example java application on kubernetes?',
  'The AI requested \x1b[1;36m1\x1b[0m tool call.',
  'Running tool #\x1b[1;36m1\x1b[0m \x1b[1mTodoWrite\x1b[0m: Update investigation tasks',
  'Task List:',
  '+----+----------+---------------+',
  '| ID | Content  | Status        |',
  '+----+----------+---------------+',
  '| 1  | Deploy   | completed     |',
  '+----+----------+---------------+',
  '  Finished #1 in 0.00s',
  '',
  '\x1b[1;96mAI:\x1b[0m ',
  '     \x1b[1mOption A (fastest): deploy a prebuilt example Java (Spring Boot) image\x1b[0m     ',
  '',
  'Apply this manifest:                                                            ',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mNamespace                                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mjava-demo                                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mapps/v1                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mDeployment                                                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mspring-boot-demo                                                      \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mnamespace\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mjava-demo                                                        \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mspec\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mreplicas\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m2                                                                 \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mselector\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m    \x1b[0m\x1b[91;40mmatchLabels\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m      \x1b[0m\x1b[91;40mapp\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mspring-boot-demo                                                   \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mService                                                                 \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mspring-boot-demo                                                      \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mspec\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mselector\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m    \x1b[0m\x1b[91;40mapp\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mspring-boot-demo                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mports\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                      \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m    \x1b[0m\x1b[40m-\x1b[0m\x1b[97;40m \x1b[0m\x1b[91;40mport\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m80                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m      \x1b[0m\x1b[91;40mtargetPort\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m8080                                                        \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mtype\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mClusterIP                                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  'Run:                                                                            ',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40mkubectl\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapply\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-f\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapp.yaml\x1b[0m\x1b[40m                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40mkubectl\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mget\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mpods\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-n\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mjava-demo\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-w\x1b[0m\x1b[40m                                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40mkubectl\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mport-forward\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-n\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mjava-demo\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40msvc/spring-boot-demo\x1b[0m\x1b[97;40m \x1b[0m\x1b[37;40m8080\x1b[0m\x1b[97;40m:80\x1b[0m\x1b[40m                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# then open http://localhost:8080\x1b[0m\x1b[40m                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  '',
  '\x1b[33m\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\x1b[0m',
  '            \x1b[1mOption B: build your own tiny Java app image + deploy it\x1b[0m            ',
  '',
  '\x1b[1m1) Minimal Spring Boot app + Dockerfile\x1b[0m                                         ',
  '',
  'Use Spring Initializr (Web dependency), then add a controller like:             ',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[92;40m@RestController\x1b[0m\x1b[40m                                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mclass\x1b[0m\x1b[97;40m \x1b[0m\x1b[92;40mHelloController\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m{\x1b[0m\x1b[40m                                                       \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[92;40m@GetMapping\x1b[0m\x1b[97;40m(\x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40m/\x1b[0m\x1b[93;40m"\x1b[0m\x1b[97;40m)\x1b[0m\x1b[40m                                                            \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[97;40mString\x1b[0m\x1b[97;40m \x1b[0m\x1b[92;40mhello\x1b[0m\x1b[97;40m(\x1b[0m\x1b[97;40m)\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m{\x1b[0m\x1b[97;40m \x1b[0m\x1b[96;40mreturn\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40mhello from k8s\x1b[0m\x1b[93;40m"\x1b[0m\x1b[97;40m;\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m}\x1b[0m\x1b[40m                                 \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m}\x1b[0m\x1b[40m                                                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  'Dockerfile (builds and runs jar):                                               ',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mFROM\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40meclipse-temurin:21-jdk\x1b[0m\x1b[97;40m \x1b[0m\x1b[96;40mAS\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40mbuild\x1b[0m\x1b[40m                                          \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mWORKDIR\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m/src\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mCOPY\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m\x1b[40m                                                                      \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mRUN\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m./mvnw\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-q\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-DskipTests\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mpackage\x1b[0m\x1b[40m                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[40m                                                                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mFROM\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40meclipse-temurin:21-jre\x1b[0m\x1b[40m                                                   \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mWORKDIR\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m/app\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mCOPY\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m--from\x1b[0m\x1b[91;40m=\x1b[0m\x1b[97;40mbuild\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m/src/target/*.jar\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m/app/app.jar\x1b[0m\x1b[40m                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mEXPOSE\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m8080\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[96;40mENTRYPOINT\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m[\x1b[0m\x1b[93;40m"java"\x1b[0m\x1b[97;40m,\x1b[0m\x1b[93;40m"-jar"\x1b[0m\x1b[97;40m,\x1b[0m\x1b[93;40m"/app/app.jar"\x1b[0m\x1b[97;40m]\x1b[0m\x1b[40m                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  '\x1b[1m2) Build + push\x1b[0m                                                                 ',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40mdocker\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mbuild\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-t\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m<your-registry>/<your-repo>/spring-boot-demo:1.0\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m.\x1b[0m\x1b[40m            \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40mdocker\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mpush\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m<your-registry>/<your-repo>/spring-boot-demo:1.0\x1b[0m\x1b[40m                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  '\x1b[1m3) Update Deployment image\x1b[0m In the Deployment above, set:                        ',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mimage\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m<your-registry>/<your-repo>/spring-boot-demo:1.0                       \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  'Then:                                                                           ',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40mkubectl\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapply\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40m-f\x1b[0m\x1b[97;40m \x1b[0m\x1b[97;40mapp.yaml\x1b[0m\x1b[40m                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
].join('\r\n');

export const rawK8sDeployWithCurl = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-pod:/app# ',
  '\x1b[?2004l\r',
  '\x1b[?2004h> ',
  '\x1b[?2004l\r',
  '\x1b[1;96mAI:\x1b[0m ',
  "Here's how to deploy an nginx web server and test it:",
  '',
  '```yaml',
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: nginx-demo',
  '  namespace: default',
  'spec:',
  '  replicas: 2',
  '  selector:',
  '    matchLabels:',
  '      app: nginx-demo',
  '  template:',
  '    metadata:',
  '      labels:',
  '        app: nginx-demo',
  '    spec:',
  '      containers:',
  '        - name: nginx',
  '          image: nginx:1.25-alpine',
  '          ports:',
  '            - containerPort: 80',
  '          resources:',
  '            requests:',
  '              cpu: 50m',
  '              memory: 64Mi',
  '            limits:',
  '              cpu: 200m',
  '              memory: 128Mi',
  '---',
  'apiVersion: v1',
  'kind: Service',
  'metadata:',
  '  name: nginx-demo',
  '  namespace: default',
  'spec:',
  '  selector:',
  '    app: nginx-demo',
  '  ports:',
  '    - port: 80',
  '      targetPort: 80',
  '  type: ClusterIP',
  '```',
  '',
  'Apply and verify:',
  '',
  'kubectl apply -f nginx-demo.yaml',
  'kubectl get pods -l app=nginx-demo -w',
  'kubectl port-forward svc/nginx-demo 8080:80',
  '',
  'Test the service:',
  '',
  'curl http://localhost:8080',
  'curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/healthz',
  '',
  'You should see the default nginx welcome page and a 200 status code.',
  '\x1b[?2004hroot@aks-agent-pod:/app# ',
].join('\r\n');

export const rawMicroserviceYaml = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
  '\x1b[?2004l\r',
  '\x1b[?2004h> ',
  '\x1b[?2004l\r',
  '\x1b[1;96mAI:\x1b[0m ',
  'Below is a single (large) multi-document YAML example for a "complicated"       ',
  'microservice setup: multiple namespaces, shared config, secrets, several        ',
  'microservices, HPAs, PDBs, NetworkPolicies, an Ingress, a CronJob, and a Job.   ',
  '',
  '\x1b[40m                                                                                \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# --------------------------------------------------------\x1b[0m\x1b[40m                    \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# Namespaces\x1b[0m\x1b[40m                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# --------------------------------------------------------\x1b[0m\x1b[40m                    \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mNamespace                                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mplatform                                                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mNamespace                                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mapps                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[40m                                                                              \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# --------------------------------------------------------\x1b[0m\x1b[40m                    \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# Shared config/secrets\x1b[0m\x1b[40m                                                       \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[37;40m# --------------------------------------------------------\x1b[0m\x1b[40m                    \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mConfigMap                                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mglobal-config                                                         \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mnamespace\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mapps                                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mdata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                         \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mLOG_LEVEL\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40minfo\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mOTEL_EXPORTER_OTLP_ENDPOINT\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40m                                               \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40mhttp://otel-collector.observability.svc.cluster.local:4317\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m---\x1b[0m\x1b[40m                                                                           \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mapiVersion\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mv1                                                                \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mkind\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mSecret                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mmetadata\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mname\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mdb-credentials                                                        \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mtype\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[40mOpaque                                                                  \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[91;40mstringData\x1b[0m\x1b[97;40m:\x1b[0m\x1b[40m                                                                   \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mPOSTGRES_USER\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40mappuser\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                                                     \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m \x1b[0m\x1b[97;40m  \x1b[0m\x1b[91;40mPOSTGRES_PASSWORD\x1b[0m\x1b[97;40m:\x1b[0m\x1b[97;40m \x1b[0m\x1b[93;40m"\x1b[0m\x1b[93;40mreplace-me\x1b[0m\x1b[93;40m"\x1b[0m\x1b[40m                                             \x1b[0m\x1b[40m \x1b[0m',
  '\x1b[40m                                                                                \x1b[0m',
  '',
  'If you want it even more "realistic complicated", tell me what stack you want   ',
  "included (Istio/Linkerd, Kafka, etc.) and I'll tailor the example.              ",
  '',
  '\x1b[?2004hroot@aks-agent-649f94dbb9-whtf8:/app# ',
].join('\r\n');

// ===========================================================================
// Synthetic edge-case fixtures (from syntheticFixtures.ts)
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. Go HTTP server — `:=`, `defer`, `go func`, `import (...)` block
// ---------------------------------------------------------------------------

export const syntheticGoHttpServer = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-abc123:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '✅ Toolset core_investigation',
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a minimal Go HTTP server deployed to Kubernetes.',
  '',
  '                           \x1b[1mmain.go\x1b[0m                                   ',
  '',
  panelBlank(),
  panelLine('package main'),
  panelLine(''),
  panelLine('import ('),
  panelLine('  "fmt"'),
  panelLine('  "log"'),
  panelLine('  "net/http"'),
  panelLine('  "os"'),
  panelLine(')'),
  panelLine(''),
  panelLine('func healthz(w http.ResponseWriter, r *http.Request) {'),
  panelLine('  w.WriteHeader(http.StatusOK)'),
  panelLine('  fmt.Fprintln(w, "ok")'),
  panelLine('}'),
  panelLine(''),
  panelLine('func main() {'),
  panelLine('  port := os.Getenv("PORT")'),
  panelLine('  if port == "" {'),
  panelLine('    port = "8080"'),
  panelLine('  }'),
  panelLine(''),
  panelLine('  mux := http.NewServeMux()'),
  panelLine('  mux.HandleFunc("/healthz", healthz)'),
  panelLine('  mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {'),
  panelLine('    fmt.Fprintln(w, "hello from go")'),
  panelLine('  })'),
  panelLine(''),
  panelLine('  srv := &http.Server{Addr: ":" + port, Handler: mux}'),
  panelLine('  go func() {'),
  panelLine('    log.Println("shutting down...")'),
  panelLine('  }()'),
  panelLine(''),
  panelLine('  log.Printf("listening on :%s\\n", port)'),
  panelLine('  if err := srv.ListenAndServe(); err != nil {'),
  panelLine('    log.Fatal(err)'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
  '',
  '                          \x1b[1mDockerfile\x1b[0m                                ',
  '',
  panelBlank(),
  panelLine('FROM golang:1.22-alpine AS builder'),
  panelLine('WORKDIR /app'),
  panelLine('COPY go.mod go.sum ./'),
  panelLine('RUN go mod download'),
  panelLine('COPY . .'),
  panelLine('RUN CGO_ENABLED=0 go build -o server .'),
  panelLine(''),
  panelLine('FROM gcr.io/distroless/static:nonroot'),
  panelLine('COPY --from=builder /app/server /server'),
  panelLine('EXPOSE 8080'),
  panelLine('ENTRYPOINT ["/server"]'),
  panelBlank(),
  '',
  'Build and deploy:',
  '',
  panelBlank(),
  panelLine('docker build -t myregistry/go-app:1.0 .'),
  panelLine('kubectl apply -f k8s.yaml'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-abc123:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 2. Node.js Express — `require()`, arrow functions, `async/await`
// ---------------------------------------------------------------------------

export const syntheticNodeExpressApp = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-def456:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '✅ Toolset core_investigation',
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a simple Express.js server:',
  '',
  '                        \x1b[1mpackage.json\x1b[0m                              ',
  '',
  panelBlank(),
  panelLine('{'),
  panelLine('  "name": "express-k8s-demo",'),
  panelLine('  "version": "1.0.0",'),
  panelLine('  "main": "index.js",'),
  panelLine('  "scripts": {'),
  panelLine('    "start": "node index.js"'),
  panelLine('  },'),
  panelLine('  "dependencies": {'),
  panelLine('    "express": "^4.18.2"'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
  '',
  '                         \x1b[1mindex.js\x1b[0m                                  ',
  '',
  panelBlank(),
  panelLine("const express = require('express');"),
  panelLine('const app = express();'),
  panelLine(''),
  panelLine('app.get("/healthz", (req, res) => {'),
  panelLine('  res.status(200).send("ok");'),
  panelLine('});'),
  panelLine(''),
  panelLine('app.get("/", async (req, res) => {'),
  panelLine('  const message = process.env.GREETING || "hello from node";'),
  panelLine('  res.json({ message });'),
  panelLine('});'),
  panelLine(''),
  panelLine('const PORT = process.env.PORT || 3000;'),
  panelLine('app.listen(PORT, () => {'),
  panelLine('  console.log(`Server running on port ${PORT}`);'),
  panelLine('});'),
  panelBlank(),
  '',
  '                         \x1b[1mDockerfile\x1b[0m                                ',
  '',
  panelBlank(),
  panelLine('FROM node:20-alpine'),
  panelLine('WORKDIR /app'),
  panelLine('COPY package*.json ./'),
  panelLine('RUN npm ci --production'),
  panelLine('COPY . .'),
  panelLine('EXPOSE 3000'),
  panelLine('USER node'),
  panelLine('CMD ["node", "index.js"]'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-def456:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 3. Helm values.yaml — anchors, nested maps, non-K8s YAML
// ---------------------------------------------------------------------------

export const syntheticHelmValuesYaml = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ghi789:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Helm values.yaml for your nginx-ingress deployment:',
  '',
  '## Custom values.yaml',
  '',
  'controller:',
  '  name: controller',
  '  replicaCount: 2',
  '  resources:',
  '    requests:',
  '      cpu: 100m',
  '      memory: 128Mi',
  '    limits:',
  '      cpu: 500m',
  '      memory: 512Mi',
  '  config:',
  '    proxy-body-size: "50m"',
  '    use-forwarded-headers: "true"',
  '  service:',
  '    type: LoadBalancer',
  '    annotations:',
  '      service.beta.kubernetes.io/azure-load-balancer-internal: "true"',
  '  metrics:',
  '    enabled: true',
  '    serviceMonitor:',
  '      enabled: true',
  '      namespace: monitoring',
  'defaultBackend:',
  '  enabled: true',
  '  replicaCount: 1',
  '',
  'Install with:',
  '',
  'helm install ingress-nginx ingress-nginx/ingress-nginx -f values.yaml -n ingress-system --create-namespace',
  '',
  '\x1b[?2004hroot@aks-agent-ghi789:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 4. C# / .NET — `using`, `namespace`, `var`, `async Task`
// ---------------------------------------------------------------------------

export const syntheticCSharpDotnetApp = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-jkl012:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '✅ Toolset core_investigation',
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a minimal ASP.NET Core web API:',
  '',
  '                        \x1b[1mProgram.cs\x1b[0m                                ',
  '',
  panelBlank(),
  panelLine('using Microsoft.AspNetCore.Builder;'),
  panelLine('using Microsoft.Extensions.Hosting;'),
  panelLine(''),
  panelLine('var builder = WebApplication.CreateBuilder(args);'),
  panelLine('var app = builder.Build();'),
  panelLine(''),
  panelLine('app.MapGet("/", () => "hello from dotnet");'),
  panelLine('app.MapGet("/healthz", () => Results.Ok("healthy"));'),
  panelLine(''),
  panelLine('app.Run();'),
  panelBlank(),
  '',
  '                         \x1b[1mDockerfile\x1b[0m                                ',
  '',
  panelBlank(),
  panelLine('FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build'),
  panelLine('WORKDIR /src'),
  panelLine('COPY *.csproj .'),
  panelLine('RUN dotnet restore'),
  panelLine('COPY . .'),
  panelLine('RUN dotnet publish -c Release -o /app'),
  panelLine(''),
  panelLine('FROM mcr.microsoft.com/dotnet/aspnet:8.0'),
  panelLine('WORKDIR /app'),
  panelLine('COPY --from=build /app .'),
  panelLine('EXPOSE 8080'),
  panelLine('ENTRYPOINT ["dotnet", "MyApi.dll"]'),
  panelBlank(),
  '',
  'Build and run:',
  '',
  panelBlank(),
  panelLine('dotnet publish -c Release'),
  panelLine('docker build -t myregistry/dotnet-api:1.0 .'),
  panelLine('kubectl apply -f k8s.yaml'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-jkl012:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 5. Terraform HCL — `resource`, `variable`, `output`, provider blocks
// ---------------------------------------------------------------------------

export const syntheticTerraformAksModule = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-mno345:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Terraform module to create an AKS cluster:',
  '',
  '### providers.tf',
  '',
  '```hcl',
  'terraform {',
  '  required_providers {',
  '    azurerm = {',
  '      source  = "hashicorp/azurerm"',
  '      version = "~> 3.80"',
  '    }',
  '  }',
  '}',
  '',
  'provider "azurerm" {',
  '  features {}',
  '}',
  '```',
  '',
  '### variables.tf',
  '',
  '```hcl',
  'variable "cluster_name" {',
  '  type    = string',
  '  default = "my-aks"',
  '}',
  '',
  'variable "node_count" {',
  '  type    = number',
  '  default = 2',
  '}',
  '',
  'variable "vm_size" {',
  '  type    = string',
  '  default = "Standard_B2s"',
  '}',
  '```',
  '',
  '### main.tf',
  '',
  '```hcl',
  'resource "azurerm_resource_group" "aks" {',
  '  name     = "${var.cluster_name}-rg"',
  '  location = "eastus"',
  '}',
  '',
  'resource "azurerm_kubernetes_cluster" "aks" {',
  '  name                = var.cluster_name',
  '  location            = azurerm_resource_group.aks.location',
  '  resource_group_name = azurerm_resource_group.aks.name',
  '  dns_prefix          = var.cluster_name',
  '',
  '  default_node_pool {',
  '    name       = "default"',
  '    node_count = var.node_count',
  '    vm_size    = var.vm_size',
  '  }',
  '',
  '  identity {',
  '    type = "SystemAssigned"',
  '  }',
  '}',
  '```',
  '',
  'Apply with:',
  '',
  '```bash',
  'terraform init',
  'terraform plan -out=tfplan',
  'terraform apply tfplan',
  '```',
  '',
  '\x1b[?2004hroot@aks-agent-mno345:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 6. Ruby Sinatra app — class, def, end, require, do…end blocks
// ---------------------------------------------------------------------------

export const syntheticRubyRailsApp = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-rby001:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a minimal Sinatra web app:',
  '',
  '                           \x1b[1mapp.rb\x1b[0m                                    ',
  '',
  panelBlank(),
  panelLine("require 'sinatra'"),
  panelLine("require 'json'"),
  panelLine(''),
  panelLine('class App < Sinatra::Base'),
  panelLine("  get '/healthz' do"),
  panelLine('    status 200'),
  panelLine("    'ok'"),
  panelLine('  end'),
  panelLine(''),
  panelLine("  get '/' do"),
  panelLine('    content_type :json'),
  panelLine("    { message: 'hello from ruby' }.to_json"),
  panelLine('  end'),
  panelLine('end'),
  panelBlank(),
  '',
  '                          \x1b[1mGemfile\x1b[0m                                   ',
  '',
  panelBlank(),
  panelLine("source 'https://rubygems.org'"),
  panelLine("gem 'sinatra'"),
  panelLine("gem 'puma'"),
  panelBlank(),
  '',
  '                         \x1b[1mDockerfile\x1b[0m                                ',
  '',
  panelBlank(),
  panelLine('FROM ruby:3.3-slim'),
  panelLine('WORKDIR /app'),
  panelLine('COPY Gemfile* ./'),
  panelLine('RUN bundle install'),
  panelLine('COPY . .'),
  panelLine('EXPOSE 4567'),
  panelLine('CMD ["ruby", "app.rb", "-o", "0.0.0.0"]'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-rby001:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 7. Python with triple-quotes, f-strings, raw strings
// ---------------------------------------------------------------------------

export const syntheticPythonMultilineStrings = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-py002:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Python config with multiline strings:',
  '',
  '                         \x1b[1mconfig.py\x1b[0m                                 ',
  '',
  panelBlank(),
  panelLine('"""Application configuration module."""'),
  panelLine(''),
  panelLine('import os'),
  panelLine('from pathlib import Path'),
  panelLine(''),
  panelLine('BASE_DIR = Path(__file__).parent'),
  panelLine(''),
  panelLine('HELP_TEXT = """'),
  panelLine('Usage: python app.py [OPTIONS]'),
  panelLine(''),
  panelLine('Options:'),
  panelLine('  --port PORT    Port to listen on'),
  panelLine('  --debug        Enable debug mode'),
  panelLine('"""'),
  panelLine(''),
  panelLine('def get_db_url():'),
  panelLine('    host = os.environ.get("DB_HOST", "localhost")'),
  panelLine('    return f"postgresql://{host}:5432/mydb"'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-py002:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 8. Bash script with here-document <<EOF…EOF
// ---------------------------------------------------------------------------

export const syntheticBashHeredoc = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-bash01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a setup script that creates a config file:',
  '',
  '                         \x1b[1msetup.sh\x1b[0m                                  ',
  '',
  panelBlank(),
  panelLine('#!/bin/bash'),
  panelLine('set -euo pipefail'),
  panelLine(''),
  panelLine('NAMESPACE="${1:-default}"'),
  panelLine(''),
  panelLine('cat <<EOF | kubectl apply -f -'),
  panelLine('apiVersion: v1'),
  panelLine('kind: ConfigMap'),
  panelLine('metadata:'),
  panelLine('  name: app-config'),
  panelLine('  namespace: $NAMESPACE'),
  panelLine('data:'),
  panelLine('  APP_ENV: "production"'),
  panelLine('  LOG_LEVEL: "info"'),
  panelLine('EOF'),
  panelLine(''),
  panelLine('echo "ConfigMap created in namespace $NAMESPACE"'),
  panelBlank(),
  '',
  'Run it:',
  '',
  panelBlank(),
  panelLine('chmod +x setup.sh'),
  panelLine('./setup.sh my-namespace'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-bash01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 9. Numbered steps with code between them
// ---------------------------------------------------------------------------

export const syntheticNumberedStepsWithCode = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-step01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Follow these steps to set up monitoring:',
  '',
  '\x1b[1m1) Create the namespace\x1b[0m',
  '',
  panelBlank(),
  panelLine('kubectl create namespace monitoring'),
  panelBlank(),
  '',
  '\x1b[1m2) Install Prometheus\x1b[0m',
  '',
  panelBlank(),
  panelLine(
    'helm repo add prometheus-community https://prometheus-community.github.io/helm-charts'
  ),
  panelLine('helm install prometheus prometheus-community/prometheus -n monitoring'),
  panelBlank(),
  '',
  '\x1b[1m3) Verify it is running\x1b[0m',
  '',
  panelBlank(),
  panelLine('kubectl get pods -n monitoring'),
  panelLine('kubectl port-forward -n monitoring svc/prometheus-server 9090:80'),
  panelBlank(),
  '',
  'Then open http://localhost:9090 in your browser.',
  '',
  '\x1b[?2004hroot@aks-agent-step01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 10. Makefile with targets, .PHONY, shell commands
// ---------------------------------------------------------------------------

export const syntheticMakefileWithTargets = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-make01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Makefile for building and deploying:',
  '',
  '                         \x1b[1mMakefile\x1b[0m                                  ',
  '',
  panelBlank(),
  panelLine('.PHONY: build test deploy clean'),
  panelLine(''),
  panelLine('IMAGE := myregistry/myapp'),
  panelLine('TAG   := $(shell git rev-parse --short HEAD)'),
  panelLine(''),
  panelLine('build:'),
  panelLine('\tdocker build -t $(IMAGE):$(TAG) .'),
  panelLine(''),
  panelLine('test:'),
  panelLine('\tgo test ./...'),
  panelLine(''),
  panelLine('deploy: build'),
  panelLine('\tkubectl set image deployment/myapp app=$(IMAGE):$(TAG)'),
  panelLine(''),
  panelLine('clean:'),
  panelLine('\tdocker rmi $(IMAGE):$(TAG) || true'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-make01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 11. Mixed markdown-fenced code AND bare terminal-formatted code
// ---------------------------------------------------------------------------

export const syntheticMixedFencedAndBare = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-mix01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'First, create the secret:',
  '',
  '```bash',
  'kubectl create secret generic db-creds \\',
  '  --from-literal=username=admin \\',
  '  --from-literal=password=s3cret',
  '```',
  '',
  'Then apply this deployment:',
  '',
  panelBlank(),
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: Deployment'),
  panelLine('metadata:'),
  panelLine('  name: web-app'),
  panelLine('spec:'),
  panelLine('  replicas: 1'),
  panelLine('  selector:'),
  panelLine('    matchLabels:'),
  panelLine('      app: web-app'),
  panelBlank(),
  '',
  'Verify with:',
  '',
  'kubectl get pods -l app=web-app',
  '',
  '\x1b[?2004hroot@aks-agent-mix01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 12. YAML with anchors (&), aliases (*), merge keys (<<:)
// ---------------------------------------------------------------------------

export const syntheticYamlWithAnchors = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-anch01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a K8s manifest using YAML anchors to avoid repetition:',
  '',
  '```yaml',
  'x-defaults: &defaults',
  '  resources:',
  '    requests:',
  '      cpu: 100m',
  '      memory: 128Mi',
  '    limits:',
  '      cpu: 500m',
  '      memory: 256Mi',
  '  securityContext:',
  '    runAsNonRoot: true',
  '    readOnlyRootFilesystem: true',
  '---',
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: frontend',
  'spec:',
  '  template:',
  '    spec:',
  '      containers:',
  '        - name: app',
  '          <<: *defaults',
  '          image: frontend:1.0',
  '---',
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: backend',
  'spec:',
  '  template:',
  '    spec:',
  '      containers:',
  '        - name: app',
  '          <<: *defaults',
  '          image: backend:2.0',
  '```',
  '',
  'Apply: `kubectl apply -f k8s.yaml`',
  '',
  '\x1b[?2004hroot@aks-agent-anch01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 13. 256-color and RGB ANSI codes
// ---------------------------------------------------------------------------

export const syntheticAnsi256ColorOutput = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-col01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is the deployment status:',
  '',
  '\x1b[38;5;82m✓\x1b[0m \x1b[38;5;255mdeployment/web-app\x1b[0m \x1b[38;5;245m2/2 ready\x1b[0m',
  '\x1b[38;5;82m✓\x1b[0m \x1b[38;5;255mservice/web-app\x1b[0m \x1b[38;5;245mClusterIP 10.0.0.5\x1b[0m',
  '\x1b[38;2;255;100;100m✗\x1b[0m \x1b[38;5;255mpod/web-app-abc123\x1b[0m \x1b[38;2;255;100;100mCrashLoopBackOff\x1b[0m',
  '',
  'The pod is crash-looping. Check logs:',
  '',
  'kubectl logs pod/web-app-abc123 --tail=50',
  '',
  '\x1b[?2004hroot@aks-agent-col01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 14. Deeply nested YAML (10+ levels)
// ---------------------------------------------------------------------------

export const syntheticDeepNestedYaml = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-deep01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is the Deployment with deep nesting:',
  '',
  panelBlank(),
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: Deployment'),
  panelLine('metadata:'),
  panelLine('  name: nested-app'),
  panelLine('spec:'),
  panelLine('  template:'),
  panelLine('    spec:'),
  panelLine('      containers:'),
  panelLine('        - name: app'),
  panelLine('          volumeMounts:'),
  panelLine('            - name: config'),
  panelLine('              mountPath: /etc/config'),
  panelLine('              subPath: application.yaml'),
  panelLine('          env:'),
  panelLine('            - name: SPRING_CONFIG_LOCATION'),
  panelLine('              value: /etc/config/'),
  panelLine('          livenessProbe:'),
  panelLine('            httpGet:'),
  panelLine('              path: /actuator/health/liveness'),
  panelLine('              port: 8080'),
  panelLine('            initialDelaySeconds: 30'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-deep01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 15. Multi-language comparison — Python, Go, Rust
// ---------------------------------------------------------------------------

export const syntheticMultiLanguageComparison = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-cmp01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is "Hello World" HTTP server in three languages:',
  '',
  '\x1b[1mPython (Flask):\x1b[0m',
  '',
  '```python',
  'from flask import Flask',
  'app = Flask(__name__)',
  '',
  '@app.route("/")',
  'def hello():',
  '    return "hello"',
  '```',
  '',
  '\x1b[1mGo:\x1b[0m',
  '',
  '```go',
  'package main',
  '',
  'import (',
  '    "fmt"',
  '    "net/http"',
  ')',
  '',
  'func main() {',
  '    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {',
  '        fmt.Fprintln(w, "hello")',
  '    })',
  '    http.ListenAndServe(":8080", nil)',
  '}',
  '```',
  '',
  '\x1b[1mRust (Axum):\x1b[0m',
  '',
  '```rust',
  'use axum::{Router, routing::get};',
  '',
  'async fn hello() -> &\'static str { "hello" }',
  '',
  '#[tokio::main]',
  'async fn main() {',
  '    let app = Router::new().route("/", get(hello));',
  '    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();',
  '    axum::serve(listener, app).await.unwrap();',
  '}',
  '```',
  '',
  'All three listen on port 8080.',
  '',
  '\x1b[?2004hroot@aks-agent-cmp01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 16. Cargo.toml + Rust bare lib — bold heading with workspace deps
// ---------------------------------------------------------------------------

export const syntheticCargoTomlWorkspace = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-cw01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is how to set up a Cargo workspace with two crates.',
  '',
  '\x1b[1mCargo.toml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('[workspace]'),
  panelLine('members = ["api", "core"]'),
  panelLine(''),
  panelLine('[workspace.dependencies]'),
  panelLine('serde = { version = "1", features = ["derive"] }'),
  panelLine('tokio = { version = "1", features = ["full"] }'),
  panelBlank(),
  '',
  '\x1b[1mapi/Cargo.toml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "api"'),
  panelLine('version = "0.1.0"'),
  panelLine('edition = "2021"'),
  panelLine(''),
  panelLine('[dependencies]'),
  panelLine('serde.workspace = true'),
  panelLine('tokio.workspace = true'),
  panelLine('axum = "0.7"'),
  panelBlank(),
  '',
  '\x1b[1mapi/src/main.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('use axum::{routing::get, Router};'),
  panelLine(''),
  panelLine('#[tokio::main]'),
  panelLine('async fn main() {'),
  panelLine('    let app = Router::new().route("/", get(|| async { "ok" }));'),
  panelLine('    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")'),
  panelLine('        .await'),
  panelLine('        .unwrap();'),
  panelLine('    axum::serve(listener, app).await.unwrap();'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-cw01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 17. Cargo.toml inline — response with shell commands then Cargo.toml
// ---------------------------------------------------------------------------

export const syntheticCargoNewProject = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-cn01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  "Let's create a new Rust project:",
  '',
  panelBlank(),
  panelLine('cargo new my-service --bin'),
  panelLine('cd my-service'),
  panelBlank(),
  '',
  'Add these dependencies to your Cargo.toml:',
  '',
  panelBlank(),
  panelLine('[dependencies]'),
  panelLine('actix-web = "4"'),
  panelLine('serde = { version = "1", features = ["derive"] }'),
  panelLine('serde_json = "1"'),
  panelLine('env_logger = "0.11"'),
  panelBlank(),
  '',
  'Then create the main server:',
  '',
  '\x1b[1msrc/main.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('use actix_web::{web, App, HttpServer, HttpResponse, middleware};'),
  panelLine('use serde::Deserialize;'),
  panelLine(''),
  panelLine('#[derive(Deserialize)]'),
  panelLine('struct Info {'),
  panelLine('    name: String,'),
  panelLine('}'),
  panelLine(''),
  panelLine('async fn greet(info: web::Query<Info>) -> HttpResponse {'),
  panelLine('    HttpResponse::Ok().json(serde_json::json!({'),
  panelLine('        "message": format!("Hello {}!", info.name)'),
  panelLine('    }))'),
  panelLine('}'),
  panelLine(''),
  panelLine('#[actix_web::main]'),
  panelLine('async fn main() -> std::io::Result<()> {'),
  panelLine('    env_logger::init();'),
  panelLine('    HttpServer::new(|| {'),
  panelLine('        App::new()'),
  panelLine('            .wrap(middleware::Logger::default())'),
  panelLine('            .route("/greet", web::get().to(greet))'),
  panelLine('    })'),
  panelLine('    .bind("0.0.0.0:8080")?'),
  panelLine('    .run()'),
  panelLine('    .await'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-cn01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 18. Cargo.toml with build.rs and feature flags — complex TOML
// ---------------------------------------------------------------------------

export const syntheticCargoTomlFeatures = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-cf01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Cargo.toml with feature flags and a build script:',
  '',
  '\x1b[1mCargo.toml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "my-k8s-operator"'),
  panelLine('version = "0.1.0"'),
  panelLine('edition = "2021"'),
  panelLine('build = "build.rs"'),
  panelLine(''),
  panelLine('[features]'),
  panelLine('default = ["opentelemetry"]'),
  panelLine('opentelemetry = ["dep:opentelemetry", "dep:tracing-opentelemetry"]'),
  panelLine(''),
  panelLine('[dependencies]'),
  panelLine('kube = { version = "0.88", features = ["runtime", "derive"] }'),
  panelLine('k8s-openapi = { version = "0.21", features = ["latest"] }'),
  panelLine('tokio = { version = "1", features = ["full"] }'),
  panelLine('tracing = "0.1"'),
  panelLine('tracing-subscriber = "0.3"'),
  panelLine(''),
  panelLine('[dependencies.opentelemetry]'),
  panelLine('version = "0.22"'),
  panelLine('optional = true'),
  panelLine(''),
  panelLine('[dev-dependencies]'),
  panelLine('assert_matches = "1.5"'),
  panelBlank(),
  '',
  '\x1b[1mbuild.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('fn main() {'),
  panelLine('    println!("cargo:rerun-if-changed=build.rs");'),
  panelLine('}'),
  panelBlank(),
  '',
  'Build with:',
  '',
  panelBlank(),
  panelLine('cargo build --release --features opentelemetry'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-cf01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 19. Java Spring Boot with pom.xml — Maven XML inside code panel
// ---------------------------------------------------------------------------

export const syntheticJavaSpringBoot = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-jv01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a minimal Spring Boot app:',
  '',
  '\x1b[1mpom.xml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('<?xml version="1.0" encoding="UTF-8"?>'),
  panelLine('<project xmlns="http://maven.apache.org/POM/4.0.0">'),
  panelLine('    <modelVersion>4.0.0</modelVersion>'),
  panelLine('    <groupId>com.example</groupId>'),
  panelLine('    <artifactId>demo</artifactId>'),
  panelLine('    <version>0.0.1</version>'),
  panelLine('    <parent>'),
  panelLine('        <groupId>org.springframework.boot</groupId>'),
  panelLine('        <artifactId>spring-boot-starter-parent</artifactId>'),
  panelLine('        <version>3.2.0</version>'),
  panelLine('    </parent>'),
  panelLine('    <dependencies>'),
  panelLine('        <dependency>'),
  panelLine('            <groupId>org.springframework.boot</groupId>'),
  panelLine('            <artifactId>spring-boot-starter-web</artifactId>'),
  panelLine('        </dependency>'),
  panelLine('    </dependencies>'),
  panelLine('</project>'),
  panelBlank(),
  '',
  '\x1b[1msrc/main/java/com/example/DemoApplication.java\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('package com.example;'),
  panelLine(''),
  panelLine('import org.springframework.boot.SpringApplication;'),
  panelLine('import org.springframework.boot.autoconfigure.SpringBootApplication;'),
  panelLine('import org.springframework.web.bind.annotation.*;'),
  panelLine(''),
  panelLine('@SpringBootApplication'),
  panelLine('@RestController'),
  panelLine('public class DemoApplication {'),
  panelLine('    public static void main(String[] args) {'),
  panelLine('        SpringApplication.run(DemoApplication.class, args);'),
  panelLine('    }'),
  panelLine(''),
  panelLine('    @GetMapping("/healthz")'),
  panelLine('    public String health() {'),
  panelLine('        return "ok";'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-jv01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 20. Rust with tests and cfg attributes — #[cfg(test)] blocks
// ---------------------------------------------------------------------------

export const syntheticRustWithTests = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-rt01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is an example with unit tests:',
  '',
  '\x1b[1mCargo.toml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "calculator"'),
  panelLine('version = "0.1.0"'),
  panelLine('edition = "2021"'),
  panelBlank(),
  '',
  '\x1b[1msrc/lib.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('pub fn add(a: i32, b: i32) -> i32 {'),
  panelLine('    a + b'),
  panelLine('}'),
  panelLine(''),
  panelLine('pub fn multiply(a: i32, b: i32) -> i32 {'),
  panelLine('    a * b'),
  panelLine('}'),
  panelLine(''),
  panelLine('#[cfg(test)]'),
  panelLine('mod tests {'),
  panelLine('    use super::*;'),
  panelLine(''),
  panelLine('    #[test]'),
  panelLine('    fn test_add() {'),
  panelLine('        assert_eq!(add(2, 3), 5);'),
  panelLine('    }'),
  panelLine(''),
  panelLine('    #[test]'),
  panelLine('    fn test_multiply() {'),
  panelLine('        assert_eq!(multiply(4, 5), 20);'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
  '',
  'Run the tests:',
  '',
  panelBlank(),
  panelLine('cargo test'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-rt01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 21. Go with go.mod — module file + multiple source files
// ---------------------------------------------------------------------------

export const syntheticGoModule = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-gm01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Go module with separate handler files:',
  '',
  '\x1b[1mgo.mod\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('module github.com/example/myapp'),
  panelLine(''),
  panelLine('go 1.22'),
  panelLine(''),
  panelLine('require ('),
  panelLine('    github.com/gorilla/mux v1.8.1'),
  panelLine('    github.com/sirupsen/logrus v1.9.3'),
  panelLine(')'),
  panelBlank(),
  '',
  '\x1b[1mmain.go\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('package main'),
  panelLine(''),
  panelLine('import ('),
  panelLine('    "net/http"'),
  panelLine('    log "github.com/sirupsen/logrus"'),
  panelLine('    "github.com/gorilla/mux"'),
  panelLine(')'),
  panelLine(''),
  panelLine('func main() {'),
  panelLine('    r := mux.NewRouter()'),
  panelLine('    r.HandleFunc("/healthz", healthHandler).Methods("GET")'),
  panelLine('    r.HandleFunc("/api/items", itemsHandler).Methods("GET", "POST")'),
  panelLine(''),
  panelLine('    log.Info("Starting server on :8080")'),
  panelLine('    if err := http.ListenAndServe(":8080", r); err != nil {'),
  panelLine('        log.Fatal(err)'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[1mhandlers.go\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('package main'),
  panelLine(''),
  panelLine('import ('),
  panelLine('    "encoding/json"'),
  panelLine('    "net/http"'),
  panelLine(')'),
  panelLine(''),
  panelLine('func healthHandler(w http.ResponseWriter, r *http.Request) {'),
  panelLine('    w.WriteHeader(http.StatusOK)'),
  panelLine('    w.Write([]byte(`{"status":"ok"}`))'),
  panelLine('}'),
  panelLine(''),
  panelLine('func itemsHandler(w http.ResponseWriter, r *http.Request) {'),
  panelLine('    switch r.Method {'),
  panelLine('    case "GET":'),
  panelLine('        items := []string{"item1", "item2"}'),
  panelLine('        json.NewEncoder(w).Encode(items)'),
  panelLine('    case "POST":'),
  panelLine('        w.WriteHeader(http.StatusCreated)'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-gm01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 22. TypeScript with tsconfig.json — config file + source
// ---------------------------------------------------------------------------

export const syntheticTypeScriptApp = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ts01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a TypeScript API with Fastify:',
  '',
  '\x1b[1mpackage.json\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('{'),
  panelLine('  "name": "ts-api",'),
  panelLine('  "scripts": {'),
  panelLine('    "build": "tsc",'),
  panelLine('    "start": "node dist/index.js",'),
  panelLine('    "dev": "tsx watch src/index.ts"'),
  panelLine('  },'),
  panelLine('  "dependencies": {'),
  panelLine('    "fastify": "^4.26.0"'),
  panelLine('  },'),
  panelLine('  "devDependencies": {'),
  panelLine('    "typescript": "^5.3.0",'),
  panelLine('    "tsx": "^4.7.0",'),
  panelLine('    "@types/node": "^20.11.0"'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[1mtsconfig.json\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('{'),
  panelLine('  "compilerOptions": {'),
  panelLine('    "target": "ES2022",'),
  panelLine('    "module": "NodeNext",'),
  panelLine('    "outDir": "dist",'),
  panelLine('    "strict": true'),
  panelLine('  },'),
  panelLine('  "include": ["src"]'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[1msrc/index.ts\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine("import Fastify from 'fastify';"),
  panelLine(''),
  panelLine('const server = Fastify({ logger: true });'),
  panelLine(''),
  panelLine("server.get('/healthz', async () => {"),
  panelLine("  return { status: 'ok' };"),
  panelLine('});'),
  panelLine(''),
  panelLine('server.listen({ port: 8080, host: "0.0.0.0" }, (err) => {'),
  panelLine('  if (err) { server.log.error(err); process.exit(1); }'),
  panelLine('});'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ts01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 23. Rust with Dockerfile and kubectl — full deploy pipeline
// ---------------------------------------------------------------------------

export const syntheticRustFullDeploy = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-rd01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is the full deploy pipeline for a Rust web service:',
  '',
  '                        \x1b[1;4m1) Application Code\x1b[0m                        ',
  '',
  '\x1b[1mCargo.toml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "web-svc"'),
  panelLine('version = "1.0.0"'),
  panelLine('edition = "2021"'),
  panelLine(''),
  panelLine('[dependencies]'),
  panelLine('axum = "0.7"'),
  panelLine('tokio = { version = "1", features = ["full"] }'),
  panelLine('tracing = "0.1"'),
  panelLine('tracing-subscriber = "0.3"'),
  panelBlank(),
  '',
  '\x1b[1msrc/main.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('use axum::{routing::get, Router};'),
  panelLine('use tracing_subscriber;'),
  panelLine(''),
  panelLine('async fn health() -> &\'static str { "ok" }'),
  panelLine(''),
  panelLine('#[tokio::main]'),
  panelLine('async fn main() {'),
  panelLine('    tracing_subscriber::init();'),
  panelLine('    let app = Router::new().route("/healthz", get(health));'),
  panelLine('    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")'),
  panelLine('        .await.unwrap();'),
  panelLine('    axum::serve(listener, app).await.unwrap();'),
  panelLine('}'),
  panelBlank(),
  '',
  '',
  '                       \x1b[1;4m2) Containerize\x1b[0m                        ',
  '',
  '\x1b[1mDockerfile\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('FROM rust:1.76-slim AS builder'),
  panelLine('WORKDIR /build'),
  panelLine('COPY Cargo.toml Cargo.lock ./'),
  panelLine('RUN mkdir src && echo "fn main(){}" > src/main.rs'),
  panelLine('RUN cargo build --release'),
  panelLine('COPY src ./src'),
  panelLine('RUN cargo build --release'),
  panelLine(''),
  panelLine('FROM debian:bookworm-slim'),
  panelLine('COPY --from=builder /build/target/release/web-svc /usr/local/bin/'),
  panelLine('EXPOSE 8080'),
  panelLine('CMD ["web-svc"]'),
  panelBlank(),
  '',
  '',
  '                       \x1b[1;4m3) Deploy to AKS\x1b[0m                        ',
  '',
  'Build and push:',
  '',
  panelBlank(),
  panelLine('docker build -t myacr.azurecr.io/web-svc:1.0 .'),
  panelLine('docker push myacr.azurecr.io/web-svc:1.0'),
  panelLine('kubectl apply -f k8s.yaml'),
  panelLine('kubectl rollout status deployment/web-svc -n default'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-rd01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 24. Python Django with requirements.txt — multiple files, manage.py
// ---------------------------------------------------------------------------

export const syntheticPythonDjango = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-dj01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a minimal Django app:',
  '',
  '\x1b[1mrequirements.txt\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('django>=4.2,<5.0'),
  panelLine('gunicorn>=21.2'),
  panelLine('psycopg2-binary>=2.9'),
  panelBlank(),
  '',
  '\x1b[1mmyapp/views.py\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('from django.http import JsonResponse'),
  panelLine(''),
  panelLine('def health_check(request):'),
  panelLine('    return JsonResponse({"status": "ok"})'),
  panelLine(''),
  panelLine('def index(request):'),
  panelLine('    return JsonResponse({'),
  panelLine('        "message": "hello from django",'),
  panelLine('        "version": "1.0",'),
  panelLine('    })'),
  panelBlank(),
  '',
  '\x1b[1mDockerfile\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('FROM python:3.12-slim'),
  panelLine('WORKDIR /app'),
  panelLine('COPY requirements.txt .'),
  panelLine('RUN pip install --no-cache-dir -r requirements.txt'),
  panelLine('COPY . .'),
  panelLine('EXPOSE 8000'),
  panelLine('CMD ["gunicorn", "myapp.wsgi:application", "--bind", "0.0.0.0:8000"]'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-dj01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 25. Cargo.toml with ANSI split across line boundary — edge case
// ---------------------------------------------------------------------------

export const syntheticCargoTomlAnsiSplit = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-as01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Add these dependencies:',
  '',
  // Bold heading with trailing ANSI artifacts (simulating split SGR)
  '\x1b[1mCargo.toml\x1b[0m' + ' '.repeat(65) + '\x1b[4',
  '0m',
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "split-test"'),
  panelLine('version = "0.1.0"'),
  panelLine('edition = "2021"'),
  panelLine(''),
  panelLine('[dependencies]'),
  panelLine('reqwest = { version = "0.12", features = ["json"] }'),
  panelLine('tokio = { version = "1", features = ["full"] }'),
  panelLine('anyhow = "1"'),
  panelBlank(),
  '',
  'Then run:',
  '',
  panelBlank(),
  panelLine('cargo build'),
  panelLine('cargo run'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-as01:/app# ',
].join('\n');

// ===========================================================================
// Kubernetes-focused synthetic fixtures (26-35)
// ===========================================================================

// ---------------------------------------------------------------------------
// 26. kubectl top output with CPU millicores — ensure 0m/25m/50m preserved
// ---------------------------------------------------------------------------

export const syntheticKubectlTopOutput = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-kt01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here are the pod resource metrics:',
  '',
  panelBlank(),
  panelLine('kubectl top pods -n production'),
  panelBlank(),
  '',
  panelBlank(),
  panelLine('NAME                        CPU(cores)   MEMORY(bytes)'),
  panelLine('api-server-6d4f8b-abcde     250m         128Mi'),
  panelLine('worker-7c9e2a-fghij         50m          64Mi'),
  panelLine('idle-pod-1a2b3c-klmno       0m           32Mi'),
  panelLine('cache-redis-4d5e6f-pqrst    25m          256Mi'),
  panelLine('gpu-trainer-8g9h0i-uvwxy    4000m        8Gi'),
  panelBlank(),
  '',
  'The `api-server` pod is consuming 250m (25% of 1 CPU core).',
  'The `idle-pod` shows 0m CPU which means essentially no CPU usage.',
  '',
  'To set resource limits:',
  '',
  '```yaml',
  'resources:',
  '  requests:',
  '    cpu: 100m',
  '    memory: 128Mi',
  '  limits:',
  '    cpu: 500m',
  '    memory: 512Mi',
  '```',
  '',
  '\x1b[?2004hroot@aks-agent-kt01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 27. Helm install + values override — shell commands + YAML values
// ---------------------------------------------------------------------------

export const syntheticHelmInstall = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-hi01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Install ingress-nginx with custom values:',
  '',
  panelBlank(),
  panelLine('helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx'),
  panelLine('helm repo update'),
  panelBlank(),
  '',
  'Create a values override file:',
  '',
  '\x1b[1mvalues-override.yaml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('controller:'),
  panelLine('  replicaCount: 2'),
  panelLine('  service:'),
  panelLine('    type: LoadBalancer'),
  panelLine('    annotations:'),
  panelLine('      service.beta.kubernetes.io/azure-load-balancer-internal: "true"'),
  panelLine('  resources:'),
  panelLine('    requests:'),
  panelLine('      cpu: 100m'),
  panelLine('      memory: 128Mi'),
  panelLine('    limits:'),
  panelLine('      cpu: 500m'),
  panelLine('      memory: 512Mi'),
  panelLine('  autoscaling:'),
  panelLine('    enabled: true'),
  panelLine('    minReplicas: 2'),
  panelLine('    maxReplicas: 10'),
  panelLine('    targetCPUUtilizationPercentage: 80'),
  panelBlank(),
  '',
  'Then install:',
  '',
  panelBlank(),
  panelLine('helm install ingress-nginx ingress-nginx/ingress-nginx \\'),
  panelLine('  --namespace ingress-nginx \\'),
  panelLine('  --create-namespace \\'),
  panelLine('  -f values-override.yaml'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-hi01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 28. Multi-document K8s YAML — Namespace + RBAC + ServiceAccount
// ---------------------------------------------------------------------------

export const syntheticK8sRbacSetup = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-rb01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is the RBAC setup for your application:',
  '',
  'Save as `rbac.yaml`:',
  '',
  '```yaml',
  'apiVersion: v1',
  'kind: Namespace',
  'metadata:',
  '  name: myapp',
  '---',
  'apiVersion: v1',
  'kind: ServiceAccount',
  'metadata:',
  '  name: myapp-sa',
  '  namespace: myapp',
  '---',
  'apiVersion: rbac.authorization.k8s.io/v1',
  'kind: Role',
  'metadata:',
  '  name: myapp-role',
  '  namespace: myapp',
  'rules:',
  '  - apiGroups: [""]',
  '    resources: ["pods", "services", "configmaps"]',
  '    verbs: ["get", "list", "watch"]',
  '  - apiGroups: ["apps"]',
  '    resources: ["deployments"]',
  '    verbs: ["get", "list", "watch", "create", "update", "patch"]',
  '---',
  'apiVersion: rbac.authorization.k8s.io/v1',
  'kind: RoleBinding',
  'metadata:',
  '  name: myapp-binding',
  '  namespace: myapp',
  'subjects:',
  '  - kind: ServiceAccount',
  '    name: myapp-sa',
  '    namespace: myapp',
  'roleRef:',
  '  kind: Role',
  '  name: myapp-role',
  '  apiGroup: rbac.authorization.k8s.io',
  '```',
  '',
  'Apply and verify:',
  '',
  panelBlank(),
  panelLine('kubectl apply -f rbac.yaml'),
  panelLine('kubectl get sa -n myapp'),
  panelLine('kubectl get roles,rolebindings -n myapp'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-rb01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 29. kubectl describe pod output — mixed prose + structured fields
// ---------------------------------------------------------------------------

export const syntheticKubectlDescribePod = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-dp01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  "I ran `kubectl describe pod` and here's the relevant output:",
  '',
  panelBlank(),
  panelLine('Name:             api-server-6d4f8b7c9e-x2k4m'),
  panelLine('Namespace:        production'),
  panelLine('Status:           Running'),
  panelLine('IP:               10.244.2.15'),
  panelLine('Containers:'),
  panelLine('  api:'),
  panelLine('    Image:          myacr.azurecr.io/api:v1.2.3'),
  panelLine('    Port:           8080/TCP'),
  panelLine('    State:          Running'),
  panelLine('      Started:      Wed, 12 Mar 2026 10:23:45 +0000'),
  panelLine('    Ready:          True'),
  panelLine('    Requests:'),
  panelLine('      cpu:      100m'),
  panelLine('      memory:   128Mi'),
  panelLine('    Limits:'),
  panelLine('      cpu:      500m'),
  panelLine('      memory:   512Mi'),
  panelLine('    Liveness:       http-get http://:8080/healthz delay=10s'),
  panelLine('    Readiness:      http-get http://:8080/readyz delay=5s'),
  panelLine('Events:'),
  panelLine('  Type    Reason   Age   From     Message'),
  panelLine('  ----    ------   ---   ----     -------'),
  panelLine('  Normal  Pulled   5m    kubelet  Container image already present'),
  panelLine('  Normal  Created  5m    kubelet  Created container api'),
  panelLine('  Normal  Started  5m    kubelet  Started container api'),
  panelBlank(),
  '',
  'The pod is running normally. CPU request is 100m (10% of a core) with a 500m limit.',
  '',
  '\x1b[?2004hroot@aks-agent-dp01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 30. AKS cluster creation — az CLI + kubectl commands
// ---------------------------------------------------------------------------

export const syntheticAksClusterCreate = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ac01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is how to create an AKS cluster with best practices:',
  '',
  '**1. Create the resource group and cluster:**',
  '',
  panelBlank(),
  panelLine('az group create --name myapp-rg --location eastus'),
  panelLine(''),
  panelLine('az aks create \\'),
  panelLine('  --resource-group myapp-rg \\'),
  panelLine('  --name myapp-aks \\'),
  panelLine('  --node-count 3 \\'),
  panelLine('  --node-vm-size Standard_D4s_v3 \\'),
  panelLine('  --enable-managed-identity \\'),
  panelLine('  --enable-addons monitoring \\'),
  panelLine('  --network-plugin azure \\'),
  panelLine('  --generate-ssh-keys'),
  panelBlank(),
  '',
  '**2. Get credentials and verify:**',
  '',
  panelBlank(),
  panelLine('az aks get-credentials --resource-group myapp-rg --name myapp-aks'),
  panelLine('kubectl get nodes'),
  panelLine('kubectl cluster-info'),
  panelBlank(),
  '',
  '**3. Enable autoscaling:**',
  '',
  panelBlank(),
  panelLine('az aks nodepool update \\'),
  panelLine('  --resource-group myapp-rg \\'),
  panelLine('  --cluster-name myapp-aks \\'),
  panelLine('  --name nodepool1 \\'),
  panelLine('  --enable-cluster-autoscaler \\'),
  panelLine('  --min-count 2 \\'),
  panelLine('  --max-count 10'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ac01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 31. Kustomize overlay — base + overlay directory structure
// ---------------------------------------------------------------------------

export const syntheticKustomizeOverlay = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ko01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Kustomize overlay structure:',
  '',
  '\x1b[1mbase/kustomization.yaml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('apiVersion: kustomize.config.k8s.io/v1beta1'),
  panelLine('kind: Kustomization'),
  panelLine('resources:'),
  panelLine('  - deployment.yaml'),
  panelLine('  - service.yaml'),
  panelLine('commonLabels:'),
  panelLine('  app: myapp'),
  panelBlank(),
  '',
  '\x1b[1mbase/deployment.yaml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: Deployment'),
  panelLine('metadata:'),
  panelLine('  name: myapp'),
  panelLine('spec:'),
  panelLine('  replicas: 1'),
  panelLine('  selector:'),
  panelLine('    matchLabels:'),
  panelLine('      app: myapp'),
  panelLine('  template:'),
  panelLine('    metadata:'),
  panelLine('      labels:'),
  panelLine('        app: myapp'),
  panelLine('    spec:'),
  panelLine('      containers:'),
  panelLine('        - name: myapp'),
  panelLine('          image: myapp:latest'),
  panelLine('          ports:'),
  panelLine('            - containerPort: 8080'),
  panelBlank(),
  '',
  '\x1b[1moverlays/production/kustomization.yaml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('apiVersion: kustomize.config.k8s.io/v1beta1'),
  panelLine('kind: Kustomization'),
  panelLine('bases:'),
  panelLine('  - ../../base'),
  panelLine('patchesStrategicMerge:'),
  panelLine('  - deployment-patch.yaml'),
  panelLine('namespace: production'),
  panelBlank(),
  '',
  'Apply the overlay:',
  '',
  panelBlank(),
  panelLine('kubectl apply -k overlays/production/'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ko01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 32. CronJob + ConfigMap with embedded script — literal block scalar
// ---------------------------------------------------------------------------

export const syntheticK8sCronJobScript = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-cj01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a CronJob with a ConfigMap-based backup script:',
  '',
  '```yaml',
  'apiVersion: v1',
  'kind: ConfigMap',
  'metadata:',
  '  name: backup-script',
  '  namespace: production',
  'data:',
  '  backup.sh: |',
  '    #!/bin/bash',
  '    set -euo pipefail',
  '    echo "Starting backup at $(date)"',
  '    pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /backups/$(date +%Y%m%d).sql.gz',
  '    echo "Backup complete"',
  '    # Clean up backups older than 30 days',
  '    find /backups -name "*.sql.gz" -mtime +30 -delete',
  '---',
  'apiVersion: batch/v1',
  'kind: CronJob',
  'metadata:',
  '  name: db-backup',
  '  namespace: production',
  'spec:',
  '  schedule: "0 2 * * *"',
  '  concurrencyPolicy: Forbid',
  '  jobTemplate:',
  '    spec:',
  '      template:',
  '        spec:',
  '          containers:',
  '            - name: backup',
  '              image: postgres:16-alpine',
  '              command: ["/bin/bash", "/scripts/backup.sh"]',
  '              env:',
  '                - name: DB_HOST',
  '                  valueFrom:',
  '                    secretKeyRef:',
  '                      name: db-credentials',
  '                      key: host',
  '              volumeMounts:',
  '                - name: script-volume',
  '                  mountPath: /scripts',
  '                - name: backup-volume',
  '                  mountPath: /backups',
  '          volumes:',
  '            - name: script-volume',
  '              configMap:',
  '                name: backup-script',
  '                defaultMode: 0755',
  '            - name: backup-volume',
  '              persistentVolumeClaim:',
  '                claimName: backup-pvc',
  '          restartPolicy: OnFailure',
  '```',
  '',
  'Apply and check:',
  '',
  panelBlank(),
  panelLine('kubectl apply -f backup-cronjob.yaml'),
  panelLine('kubectl get cronjobs -n production'),
  panelLine('kubectl get jobs -n production --watch'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-cj01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 33. Troubleshooting — kubectl logs + events + describe mixed output
// ---------------------------------------------------------------------------

export const syntheticK8sTroubleshooting = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ts01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  "I've investigated the failing pod. Here's what I found:",
  '',
  '**Pod logs:**',
  '',
  panelBlank(),
  panelLine('kubectl logs api-server-6d4f8b-x2k4m -n production --tail=20'),
  panelBlank(),
  '',
  panelBlank(),
  panelLine('2026-03-12T10:23:45Z INFO  Starting server on :8080'),
  panelLine('2026-03-12T10:23:46Z INFO  Connected to database'),
  panelLine('2026-03-12T10:24:01Z ERROR Connection refused: dial tcp 10.0.0.5:5432'),
  panelLine('2026-03-12T10:24:01Z ERROR Health check failed: database unreachable'),
  panelLine('2026-03-12T10:24:06Z WARN  Retrying database connection (attempt 2/5)'),
  panelLine('2026-03-12T10:24:11Z ERROR Connection refused: dial tcp 10.0.0.5:5432'),
  panelLine('2026-03-12T10:24:16Z FATAL Max retries exceeded, shutting down'),
  panelBlank(),
  '',
  '**Recent events:**',
  '',
  panelBlank(),
  panelLine('kubectl get events -n production --sort-by=.lastTimestamp | tail -5'),
  panelBlank(),
  '',
  panelBlank(),
  panelLine('LAST SEEN   TYPE      REASON              OBJECT                          MESSAGE'),
  panelLine(
    '2m          Warning   Unhealthy           pod/api-server-6d4f8b-x2k4m     Readiness probe failed'
  ),
  panelLine(
    '2m          Warning   BackOff             pod/api-server-6d4f8b-x2k4m     Back-off restarting failed'
  ),
  panelLine(
    '5m          Normal    Pulled              pod/api-server-6d4f8b-x2k4m     Container image already present'
  ),
  panelLine(
    '5m          Normal    Created             pod/api-server-6d4f8b-x2k4m     Created container api'
  ),
  panelBlank(),
  '',
  '## Root Cause',
  '',
  'The database at `10.0.0.5:5432` is unreachable. Check:',
  '',
  panelBlank(),
  panelLine('kubectl get svc -n production | grep postgres'),
  panelLine('kubectl get endpoints postgres-svc -n production'),
  panelLine('kubectl exec -it api-server-6d4f8b-x2k4m -n production -- nc -zv 10.0.0.5 5432'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ts01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 34. NetworkPolicy + Ingress — bare YAML with annotations
// ---------------------------------------------------------------------------

export const syntheticK8sNetworkPolicy = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-np01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here are the NetworkPolicy and Ingress resources:',
  '',
  '```yaml',
  'apiVersion: networking.k8s.io/v1',
  'kind: NetworkPolicy',
  'metadata:',
  '  name: api-netpol',
  '  namespace: production',
  'spec:',
  '  podSelector:',
  '    matchLabels:',
  '      app: api-server',
  '  policyTypes:',
  '    - Ingress',
  '    - Egress',
  '  ingress:',
  '    - from:',
  '        - namespaceSelector:',
  '            matchLabels:',
  '              name: ingress-nginx',
  '      ports:',
  '        - protocol: TCP',
  '          port: 8080',
  '  egress:',
  '    - to:',
  '        - podSelector:',
  '            matchLabels:',
  '              app: postgres',
  '      ports:',
  '        - protocol: TCP',
  '          port: 5432',
  '    - to:',
  '        - namespaceSelector: {}',
  '      ports:',
  '        - protocol: UDP',
  '          port: 53',
  '---',
  'apiVersion: networking.k8s.io/v1',
  'kind: Ingress',
  'metadata:',
  '  name: api-ingress',
  '  namespace: production',
  '  annotations:',
  '    nginx.ingress.kubernetes.io/rewrite-target: /',
  '    nginx.ingress.kubernetes.io/ssl-redirect: "true"',
  '    cert-manager.io/cluster-issuer: letsencrypt-prod',
  'spec:',
  '  ingressClassName: nginx',
  '  tls:',
  '    - hosts:',
  '        - api.example.com',
  '      secretName: api-tls',
  '  rules:',
  '    - host: api.example.com',
  '      http:',
  '        paths:',
  '          - path: /',
  '            pathType: Prefix',
  '            backend:',
  '              service:',
  '                name: api-server',
  '                port:',
  '                  number: 8080',
  '```',
  '',
  'Apply:',
  '',
  panelBlank(),
  panelLine('kubectl apply -f network-policy.yaml'),
  panelLine('kubectl get networkpolicy,ingress -n production'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-np01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 35. HPA + PDB + resource quotas — multiple K8s resource types
// ---------------------------------------------------------------------------

export const syntheticK8sHpaPdb = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-hp01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here are the autoscaling and disruption budget resources:',
  '',
  '```yaml',
  'apiVersion: autoscaling/v2',
  'kind: HorizontalPodAutoscaler',
  'metadata:',
  '  name: api-hpa',
  '  namespace: production',
  'spec:',
  '  scaleTargetRef:',
  '    apiVersion: apps/v1',
  '    kind: Deployment',
  '    name: api-server',
  '  minReplicas: 2',
  '  maxReplicas: 20',
  '  metrics:',
  '    - type: Resource',
  '      resource:',
  '        name: cpu',
  '        target:',
  '          type: Utilization',
  '          averageUtilization: 70',
  '    - type: Resource',
  '      resource:',
  '        name: memory',
  '        target:',
  '          type: Utilization',
  '          averageUtilization: 80',
  '  behavior:',
  '    scaleDown:',
  '      stabilizationWindowSeconds: 300',
  '      policies:',
  '        - type: Percent',
  '          value: 10',
  '          periodSeconds: 60',
  '---',
  'apiVersion: policy/v1',
  'kind: PodDisruptionBudget',
  'metadata:',
  '  name: api-pdb',
  '  namespace: production',
  'spec:',
  '  minAvailable: 1',
  '  selector:',
  '    matchLabels:',
  '      app: api-server',
  '```',
  '',
  'Check status:',
  '',
  panelBlank(),
  panelLine('kubectl get hpa -n production'),
  panelLine('kubectl get pdb -n production'),
  panelLine('kubectl describe hpa api-hpa -n production'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-hp01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 36. Cargo.toml with cargo add workflow — shell commands interleaved with TOML
// ---------------------------------------------------------------------------

export const syntheticCargoAddWorkflow = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ca01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'First, create the project and add dependencies:',
  '',
  panelBlank(),
  panelLine('cargo new my-api'),
  panelLine('cd my-api'),
  panelLine('cargo add axum --features macros'),
  panelLine('cargo add tokio --features full'),
  panelLine('cargo add serde --features derive'),
  panelLine('cargo add serde_json'),
  panelBlank(),
  '',
  'Your Cargo.toml should look like this:',
  '',
  '\x1b[1mCargo.toml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "my-api"'),
  panelLine('version = "0.1.0"'),
  panelLine('edition = "2021"'),
  panelLine(''),
  panelLine('[dependencies]'),
  panelLine('axum = { version = "0.7", features = ["macros"] }'),
  panelLine('tokio = { version = "1", features = ["full"] }'),
  panelLine('serde = { version = "1", features = ["derive"] }'),
  panelLine('serde_json = "1"'),
  panelBlank(),
  '',
  'Then build and run:',
  '',
  panelBlank(),
  panelLine('cargo build'),
  panelLine('cargo run'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ca01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 37. Cargo.toml with build profiles and target-specific deps
// ---------------------------------------------------------------------------

export const syntheticCargoBuildProfiles = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-bp01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is an optimized Cargo.toml with build profiles:',
  '',
  '\x1b[1mCargo.toml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "k8s-operator"'),
  panelLine('version = "0.1.0"'),
  panelLine('edition = "2021"'),
  panelLine(''),
  panelLine('[dependencies]'),
  panelLine('kube = { version = "0.88", features = ["runtime", "derive"] }'),
  panelLine('k8s-openapi = { version = "0.21", features = ["latest"] }'),
  panelLine('tokio = { version = "1", features = ["full"] }'),
  panelLine('tracing = "0.1"'),
  panelLine('tracing-subscriber = "0.3"'),
  panelLine(''),
  panelLine('[profile.release]'),
  panelLine('opt-level = 3'),
  panelLine('lto = true'),
  panelLine('codegen-units = 1'),
  panelLine('strip = true'),
  panelLine(''),
  panelLine('[profile.dev]'),
  panelLine('opt-level = 0'),
  panelLine('debug = true'),
  panelBlank(),
  '',
  '\x1b[1msrc/main.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('use kube::{Api, Client};'),
  panelLine('use k8s_openapi::api::core::v1::Pod;'),
  panelLine(''),
  panelLine('#[tokio::main]'),
  panelLine('async fn main() -> anyhow::Result<()> {'),
  panelLine('    let client = Client::try_default().await?;'),
  panelLine('    let pods: Api<Pod> = Api::default_namespaced(client);'),
  panelLine('    for p in pods.list(&Default::default()).await? {'),
  panelLine('        println!("Found pod: {}", p.metadata.name.unwrap_or_default());'),
  panelLine('    }'),
  panelLine('    Ok(())'),
  panelLine('}'),
  panelBlank(),
  '',
  'Build the release binary:',
  '',
  panelBlank(),
  panelLine('cargo build --release'),
  panelLine('ls -la target/release/k8s-operator'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-bp01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 38. Cargo.toml inline table + multi-line TOML array (edge case)
// ---------------------------------------------------------------------------

export const syntheticCargoInlineTables = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-it01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'For your microservice, use these dependencies:',
  '',
  '\x1b[1mCargo.toml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "my-svc"'),
  panelLine('version = "0.1.0"'),
  panelLine('edition = "2021"'),
  panelLine('authors = ["dev@example.com"]'),
  panelLine(''),
  panelLine('[[bin]]'),
  panelLine('name = "server"'),
  panelLine('path = "src/server.rs"'),
  panelLine(''),
  panelLine('[[bin]]'),
  panelLine('name = "worker"'),
  panelLine('path = "src/worker.rs"'),
  panelLine(''),
  panelLine('[dependencies]'),
  panelLine('actix-web = "4"'),
  panelLine('sqlx = { version = "0.7", features = ['),
  panelLine('    "runtime-tokio",'),
  panelLine('    "postgres",'),
  panelLine('    "migrate",'),
  panelLine('] }'),
  panelLine(''),
  panelLine('[dev-dependencies]'),
  panelLine('reqwest = { version = "0.11", features = ["json"] }'),
  panelLine('testcontainers = "0.15"'),
  panelBlank(),
  '',
  'Run the server binary:',
  '',
  panelBlank(),
  panelLine('cargo run --bin server'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-it01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 39. Rust lib + bin split crate with tests
// ---------------------------------------------------------------------------

export const syntheticRustLibBinSplit = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-lb01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Split your code into a library and a binary:',
  '',
  '\x1b[1msrc/lib.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('pub mod handlers;'),
  panelLine('pub mod models;'),
  panelLine(''),
  panelLine('pub fn configure_routes(cfg: &mut actix_web::web::ServiceConfig) {'),
  panelLine('    cfg.service(handlers::health_check);'),
  panelLine('    cfg.service(handlers::get_items);'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[1msrc/main.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('use my_svc::configure_routes;'),
  panelLine('use actix_web::{App, HttpServer};'),
  panelLine(''),
  panelLine('#[actix_web::main]'),
  panelLine('async fn main() -> std::io::Result<()> {'),
  panelLine('    HttpServer::new(|| {'),
  panelLine('        App::new().configure(configure_routes)'),
  panelLine('    })'),
  panelLine('    .bind("0.0.0.0:8080")?'),
  panelLine('    .run()'),
  panelLine('    .await'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[1msrc/handlers.rs\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('use actix_web::{get, HttpResponse, Responder};'),
  panelLine(''),
  panelLine('#[get("/healthz")]'),
  panelLine('pub async fn health_check() -> impl Responder {'),
  panelLine('    HttpResponse::Ok().body("ok")'),
  panelLine('}'),
  panelLine(''),
  panelLine('#[get("/items")]'),
  panelLine('pub async fn get_items() -> impl Responder {'),
  panelLine('    HttpResponse::Ok().json(vec!["item1", "item2"])'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-lb01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 40. K8s Deployment with init containers and volume mounts
// ---------------------------------------------------------------------------

export const syntheticK8sInitContainers = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ic01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Deployment with init containers for database migration:',
  '',
  '```yaml',
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: api-server',
  '  namespace: production',
  'spec:',
  '  replicas: 3',
  '  selector:',
  '    matchLabels:',
  '      app: api-server',
  '  template:',
  '    metadata:',
  '      labels:',
  '        app: api-server',
  '    spec:',
  '      initContainers:',
  '        - name: db-migrate',
  '          image: myregistry.azurecr.io/api-migrate:latest',
  '          command: ["./migrate", "--up"]',
  '          env:',
  '            - name: DATABASE_URL',
  '              valueFrom:',
  '                secretKeyRef:',
  '                  name: db-credentials',
  '                  key: url',
  '          volumeMounts:',
  '            - name: config-volume',
  '              mountPath: /etc/config',
  '              readOnly: true',
  '      containers:',
  '        - name: api',
  '          image: myregistry.azurecr.io/api-server:v1.2.3',
  '          ports:',
  '            - containerPort: 8080',
  '              protocol: TCP',
  '          livenessProbe:',
  '            httpGet:',
  '              path: /healthz',
  '              port: 8080',
  '            initialDelaySeconds: 15',
  '            periodSeconds: 10',
  '          readinessProbe:',
  '            httpGet:',
  '              path: /ready',
  '              port: 8080',
  '            initialDelaySeconds: 5',
  '            periodSeconds: 5',
  '          resources:',
  '            requests:',
  '              cpu: 250m',
  '              memory: 256Mi',
  '            limits:',
  '              cpu: "1"',
  '              memory: 512Mi',
  '          volumeMounts:',
  '            - name: config-volume',
  '              mountPath: /etc/config',
  '              readOnly: true',
  '      volumes:',
  '        - name: config-volume',
  '          configMap:',
  '            name: api-config',
  '```',
  '',
  'Apply it:',
  '',
  panelBlank(),
  panelLine('kubectl apply -f deployment.yaml'),
  panelLine('kubectl rollout status deployment/api-server -n production'),
  panelLine('kubectl get pods -n production -l app=api-server'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ic01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 41. K8s ConfigMap from file + kubectl create configmap
// ---------------------------------------------------------------------------

export const syntheticK8sConfigMapFromFile = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-cm01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Create a ConfigMap from a config file:',
  '',
  '\x1b[1mconfig.yaml\x1b[0m'.padEnd(80),
  '',
  panelBlank(),
  panelLine('server:'),
  panelLine('  host: 0.0.0.0'),
  panelLine('  port: 8080'),
  panelLine('  read_timeout: 30s'),
  panelLine('  write_timeout: 30s'),
  panelLine(''),
  panelLine('database:'),
  panelLine('  host: postgres-svc.production.svc.cluster.local'),
  panelLine('  port: 5432'),
  panelLine('  max_connections: 20'),
  panelLine(''),
  panelLine('logging:'),
  panelLine('  level: info'),
  panelLine('  format: json'),
  panelBlank(),
  '',
  'Create the ConfigMap and verify:',
  '',
  panelBlank(),
  panelLine('kubectl create configmap api-config \\'),
  panelLine('  --from-file=config.yaml \\'),
  panelLine('  -n production'),
  panelLine(''),
  panelLine('kubectl get configmap api-config -n production -o yaml'),
  panelBlank(),
  '',
  'Then reference it in your Deployment:',
  '',
  '```yaml',
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: api-server',
  'spec:',
  '  template:',
  '    spec:',
  '      containers:',
  '        - name: api',
  '          volumeMounts:',
  '            - name: config',
  '              mountPath: /etc/app/config.yaml',
  '              subPath: config.yaml',
  '      volumes:',
  '        - name: config',
  '          configMap:',
  '            name: api-config',
  '```',
  '',
  '\x1b[?2004hroot@aks-agent-cm01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 42. K8s Secret + External Secrets Operator workflow
// ---------------------------------------------------------------------------

export const syntheticK8sSecretsWorkflow = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-sw01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'For secrets management, use External Secrets Operator with Azure Key Vault.',
  '',
  '1. Install the operator:',
  '',
  panelBlank(),
  panelLine('helm repo add external-secrets https://charts.external-secrets.io'),
  panelLine('helm install external-secrets external-secrets/external-secrets \\'),
  panelLine('  -n external-secrets \\'),
  panelLine('  --create-namespace'),
  panelBlank(),
  '',
  '2. Create a SecretStore pointing to Azure Key Vault:',
  '',
  '```yaml',
  'apiVersion: external-secrets.io/v1beta1',
  'kind: SecretStore',
  'metadata:',
  '  name: azure-kv',
  '  namespace: production',
  'spec:',
  '  provider:',
  '    azurekv:',
  '      vaultUrl: "https://my-keyvault.vault.azure.net"',
  '      authType: ManagedIdentity',
  '```',
  '',
  '3. Create an ExternalSecret:',
  '',
  '```yaml',
  'apiVersion: external-secrets.io/v1beta1',
  'kind: ExternalSecret',
  'metadata:',
  '  name: db-credentials',
  '  namespace: production',
  'spec:',
  '  refreshInterval: 1h',
  '  secretStoreRef:',
  '    name: azure-kv',
  '    kind: SecretStore',
  '  target:',
  '    name: db-credentials',
  '  data:',
  '    - secretKey: url',
  '      remoteRef:',
  '        key: database-url',
  '    - secretKey: password',
  '      remoteRef:',
  '        key: database-password',
  '```',
  '',
  'Verify sync status:',
  '',
  panelBlank(),
  panelLine('kubectl get externalsecret -n production'),
  panelLine('kubectl get secret db-credentials -n production -o yaml'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-sw01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 43. K8s Istio VirtualService + Gateway
// ---------------------------------------------------------------------------

export const syntheticK8sIstioRouting = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-is01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Set up Istio traffic routing with canary deployment:',
  '',
  '```yaml',
  'apiVersion: networking.istio.io/v1beta1',
  'kind: Gateway',
  'metadata:',
  '  name: api-gateway',
  '  namespace: production',
  'spec:',
  '  selector:',
  '    istio: ingressgateway',
  '  servers:',
  '    - port:',
  '        number: 443',
  '        name: https',
  '        protocol: HTTPS',
  '      tls:',
  '        mode: SIMPLE',
  '        credentialName: api-tls',
  '      hosts:',
  '        - api.example.com',
  '---',
  'apiVersion: networking.istio.io/v1beta1',
  'kind: VirtualService',
  'metadata:',
  '  name: api-routing',
  '  namespace: production',
  'spec:',
  '  hosts:',
  '    - api.example.com',
  '  gateways:',
  '    - api-gateway',
  '  http:',
  '    - match:',
  '        - headers:',
  '            x-canary:',
  '              exact: "true"',
  '      route:',
  '        - destination:',
  '            host: api-server-canary',
  '            port:',
  '              number: 8080',
  '    - route:',
  '        - destination:',
  '            host: api-server',
  '            port:',
  '              number: 8080',
  '          weight: 90',
  '        - destination:',
  '            host: api-server-canary',
  '            port:',
  '              number: 8080',
  '          weight: 10',
  '```',
  '',
  'Verify the routing:',
  '',
  panelBlank(),
  panelLine('kubectl get virtualservice -n production'),
  panelLine('kubectl get gateway -n production'),
  panelLine('istioctl analyze -n production'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-is01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 44. K8s StatefulSet with PVC for database
// ---------------------------------------------------------------------------

export const syntheticK8sStatefulSet = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ss01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a StatefulSet for PostgreSQL with persistent storage on AKS:',
  '',
  '```yaml',
  'apiVersion: v1',
  'kind: Service',
  'metadata:',
  '  name: postgres-headless',
  '  namespace: production',
  'spec:',
  '  clusterIP: None',
  '  selector:',
  '    app: postgres',
  '  ports:',
  '    - port: 5432',
  '      targetPort: 5432',
  '---',
  'apiVersion: apps/v1',
  'kind: StatefulSet',
  'metadata:',
  '  name: postgres',
  '  namespace: production',
  'spec:',
  '  serviceName: postgres-headless',
  '  replicas: 1',
  '  selector:',
  '    matchLabels:',
  '      app: postgres',
  '  template:',
  '    metadata:',
  '      labels:',
  '        app: postgres',
  '    spec:',
  '      containers:',
  '        - name: postgres',
  '          image: postgres:16-alpine',
  '          ports:',
  '            - containerPort: 5432',
  '          env:',
  '            - name: POSTGRES_DB',
  '              value: myapp',
  '            - name: POSTGRES_USER',
  '              valueFrom:',
  '                secretKeyRef:',
  '                  name: postgres-credentials',
  '                  key: username',
  '            - name: POSTGRES_PASSWORD',
  '              valueFrom:',
  '                secretKeyRef:',
  '                  name: postgres-credentials',
  '                  key: password',
  '          volumeMounts:',
  '            - name: postgres-data',
  '              mountPath: /var/lib/postgresql/data',
  '          resources:',
  '            requests:',
  '              cpu: 500m',
  '              memory: 1Gi',
  '            limits:',
  '              cpu: "2"',
  '              memory: 4Gi',
  '  volumeClaimTemplates:',
  '    - metadata:',
  '        name: postgres-data',
  '      spec:',
  '        accessModes: ["ReadWriteOnce"]',
  '        storageClassName: managed-premium',
  '        resources:',
  '          requests:',
  '            storage: 50Gi',
  '```',
  '',
  'Check the StatefulSet and PVC:',
  '',
  panelBlank(),
  panelLine('kubectl get statefulset -n production'),
  panelLine('kubectl get pvc -n production'),
  panelLine('kubectl logs postgres-0 -n production'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ss01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 45. K8s multi-context + kubeconfig workflow
// ---------------------------------------------------------------------------

export const syntheticK8sMultiCluster = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-mc01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'To manage multiple AKS clusters, use kubeconfig contexts:',
  '',
  panelBlank(),
  panelLine('# Get credentials for both clusters'),
  panelLine('az aks get-credentials --resource-group rg-dev \\'),
  panelLine('  --name aks-dev --context dev-cluster'),
  panelLine(''),
  panelLine('az aks get-credentials --resource-group rg-prod \\'),
  panelLine('  --name aks-prod --context prod-cluster'),
  panelLine(''),
  panelLine('# List contexts'),
  panelLine('kubectl config get-contexts'),
  panelLine(''),
  panelLine('# Switch to dev'),
  panelLine('kubectl config use-context dev-cluster'),
  panelLine('kubectl get nodes'),
  panelLine(''),
  panelLine('# Switch to prod'),
  panelLine('kubectl config use-context prod-cluster'),
  panelLine('kubectl get nodes'),
  panelBlank(),
  '',
  'Or use `--context` flag without switching:',
  '',
  panelBlank(),
  panelLine('kubectl --context=dev-cluster get pods -A'),
  panelLine('kubectl --context=prod-cluster get pods -A'),
  panelBlank(),
  '',
  'To deploy to both clusters:',
  '',
  panelBlank(),
  panelLine('for ctx in dev-cluster prod-cluster; do'),
  panelLine('  echo "Deploying to $ctx"'),
  panelLine('  kubectl --context=$ctx apply -f k8s/'),
  panelLine('done'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-mc01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 46. K8s DaemonSet — bare YAML with CPU millicores (panelLine only)
// ---------------------------------------------------------------------------

export const syntheticK8sDaemonSet = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ds01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a DaemonSet for log collection:',
  '',
  panelBlank(),
  panelLine('---'),
  panelLine('apiVersion: v1'),
  panelLine('kind: Namespace'),
  panelLine('metadata:'),
  panelLine('  name: logging'),
  panelLine('---'),
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: DaemonSet'),
  panelLine('metadata:'),
  panelLine('  name: fluentd-logger'),
  panelLine('  namespace: logging'),
  panelLine('spec:'),
  panelLine('  selector:'),
  panelLine('    matchLabels:'),
  panelLine('      app: fluentd'),
  panelLine('  template:'),
  panelLine('    metadata:'),
  panelLine('      labels:'),
  panelLine('        app: fluentd'),
  panelLine('    spec:'),
  panelLine('      tolerations:'),
  panelLine('      - key: node-role.kubernetes.io/control-plane'),
  panelLine('        operator: Exists'),
  panelLine('        effect: NoSchedule'),
  panelLine('      containers:'),
  panelLine('      - name: fluentd'),
  panelLine('        image: fluent/fluentd-kubernetes-daemonset:v1.16'),
  panelLine('        resources:'),
  panelLine('          limits:'),
  panelLine('            cpu: 200m'),
  panelLine('            memory: 200Mi'),
  panelLine('          requests:'),
  panelLine('            cpu: 100m'),
  panelLine('            memory: 100Mi'),
  panelLine('        volumeMounts:'),
  panelLine('        - name: varlog'),
  panelLine('          mountPath: /var/log'),
  panelLine('      priorityClassName: system-node-critical'),
  panelLine('      terminationGracePeriodSeconds: 30'),
  panelLine('      volumes:'),
  panelLine('      - name: varlog'),
  panelLine('        hostPath:'),
  panelLine('          path: /var/log'),
  panelBlank(),
  '',
  'Apply and verify the DaemonSet:',
  '',
  panelBlank(),
  panelLine('kubectl apply -f daemonset.yaml'),
  panelLine('kubectl get ds -n logging'),
  panelLine('kubectl rollout status ds/fluentd-logger -n logging'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ds01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 47. K8s Pod Security — unindented bare kubectl + panelLine YAML mix
// ---------------------------------------------------------------------------

export const syntheticK8sPodSecurity = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ps01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'First, check your namespace labels:',
  '',
  'kubectl get ns --show-labels',
  '',
  panelBlank(),
  panelLine('NAME              STATUS   AGE   LABELS'),
  panelLine('default           Active   45d   kubernetes.io/metadata.name=default'),
  panelLine('kube-system       Active   45d   kubernetes.io/metadata.name=kube-system'),
  panelLine('production        Active   10d   pod-security.kubernetes.io/enforce=restricted'),
  panelBlank(),
  '',
  'Then apply this Pod with a hardened securityContext:',
  '',
  panelBlank(),
  panelLine('apiVersion: v1'),
  panelLine('kind: Pod'),
  panelLine('metadata:'),
  panelLine('  name: secure-app'),
  panelLine('  namespace: production'),
  panelLine('spec:'),
  panelLine('  securityContext:'),
  panelLine('    runAsNonRoot: true'),
  panelLine('    runAsUser: 1000'),
  panelLine('    fsGroup: 2000'),
  panelLine('  containers:'),
  panelLine('  - name: app'),
  panelLine('    image: myregistry.azurecr.io/secure-app:v1.2'),
  panelLine('    securityContext:'),
  panelLine('      allowPrivilegeEscalation: false'),
  panelLine('      readOnlyRootFilesystem: true'),
  panelLine('      capabilities:'),
  panelLine('        drop:'),
  panelLine('        - ALL'),
  panelLine('      seccompProfile:'),
  panelLine('        type: RuntimeDefault'),
  panelLine('    resources:'),
  panelLine('      limits:'),
  panelLine('        cpu: 500m'),
  panelLine('        memory: 128Mi'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ps01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 48. K8s Job Patterns — literal block scalar with shell script
// ---------------------------------------------------------------------------

export const syntheticK8sJobPatterns = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-jp01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a CronJob that runs a nightly database backup:',
  '',
  panelBlank(),
  panelLine('apiVersion: batch/v1'),
  panelLine('kind: CronJob'),
  panelLine('metadata:'),
  panelLine('  name: db-backup'),
  panelLine('  namespace: production'),
  panelLine('spec:'),
  panelLine('  schedule: "0 2 * * *"'),
  panelLine('  jobTemplate:'),
  panelLine('    spec:'),
  panelLine('      template:'),
  panelLine('        spec:'),
  panelLine('          containers:'),
  panelLine('          - name: backup'),
  panelLine('            image: postgres:15'),
  panelLine('            command:'),
  panelLine('            - /bin/bash'),
  panelLine('            - -c'),
  panelLine('            - |'),
  panelLine('              set -euo pipefail'),
  panelLine('              echo "Starting backup at $(date)"'),
  panelLine(''),
  panelLine('              pg_dump \\'),
  panelLine('                --host=$PGHOST \\'),
  panelLine('                --port=5432 \\'),
  panelLine('                --username=$PGUSER \\'),
  panelLine('                --dbname=$PGDATABASE \\'),
  panelLine('                --format=custom \\'),
  panelLine('                --compress=9 | gzip > /backups/db-$(date +%Y%m%d).sql.gz'),
  panelLine(''),
  panelLine('              echo "Backup completed successfully"'),
  panelLine('              echo "File size: $(du -h /backups/db-$(date +%Y%m%d).sql.gz)"'),
  panelLine('            env:'),
  panelLine('            - name: PGHOST'),
  panelLine('              valueFrom:'),
  panelLine('                secretKeyRef:'),
  panelLine('                  name: db-credentials'),
  panelLine('                  key: host'),
  panelLine('            - name: PGUSER'),
  panelLine('              valueFrom:'),
  panelLine('                secretKeyRef:'),
  panelLine('                  name: db-credentials'),
  panelLine('                  key: username'),
  panelLine('            - name: PGDATABASE'),
  panelLine('              value: appdb'),
  panelLine('          restartPolicy: OnFailure'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-jp01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 49. K8s Linkerd — terminal-wrapped long YAML value split across lines
// ---------------------------------------------------------------------------

export const syntheticK8sLinkerd = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-lk01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Configure the Service with internal load balancer annotations:',
  '',
  panelBlank(),
  panelLine('apiVersion: v1'),
  panelLine('kind: Service'),
  panelLine('metadata:'),
  panelLine('  name: internal-api'),
  panelLine('  namespace: production'),
  panelLine('  annotations:'),
  panelLine('    service.beta.kubernetes.io/azure-load-balancer-internal: "true"'),
  panelLine('    service.beta.kubernetes.io/azure-load-balancer-internal-'),
  panelLine('subnet: "internal-subnet"'),
  panelLine('    linkerd.io/inject: enabled'),
  panelLine('spec:'),
  panelLine('  type: LoadBalancer'),
  panelLine('  ports:'),
  panelLine('  - port: 443'),
  panelLine('    targetPort: 8443'),
  panelLine('  selector:'),
  panelLine('    app: internal-api'),
  panelLine('---'),
  panelLine('apiVersion: split.smi-spec.io/v1alpha2'),
  panelLine('kind: TrafficSplit'),
  panelLine('metadata:'),
  panelLine('  name: api-canary'),
  panelLine('  namespace: production'),
  panelLine('spec:'),
  panelLine('  service: internal-api'),
  panelLine('  backends:'),
  panelLine('  - service: internal-api-stable'),
  panelLine('    weight: 900m'),
  panelLine('  - service: internal-api-canary'),
  panelLine('    weight: 100m'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-lk01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 50. K8s Resource Quota — Helm values style YAML without apiVersion/kind
// ---------------------------------------------------------------------------

export const syntheticK8sResourceQuota = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-rq01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a sample Helm values file:',
  '',
  panelBlank(),
  panelLine('replicaCount: 3'),
  panelLine(''),
  panelLine('image:'),
  panelLine('  repository: nginx'),
  panelLine('  tag: "1.25"'),
  panelLine('  pullPolicy: IfNotPresent'),
  panelLine(''),
  panelLine('resources:'),
  panelLine('  limits:'),
  panelLine('    cpu: 500m'),
  panelLine('    memory: 256Mi'),
  panelLine('  requests:'),
  panelLine('    cpu: 100m'),
  panelLine('    memory: 128Mi'),
  panelLine(''),
  panelLine('service:'),
  panelLine('  type: ClusterIP'),
  panelLine('  port: 80'),
  panelLine(''),
  panelLine('ingress:'),
  panelLine('  enabled: true'),
  panelLine('  className: nginx'),
  panelLine('  hosts:'),
  panelLine('  - host: app.example.com'),
  panelLine('    paths:'),
  panelLine('    - path: /'),
  panelLine('      pathType: Prefix'),
  panelLine(''),
  panelLine('autoscaling:'),
  panelLine('  enabled: true'),
  panelLine('  minReplicas: 2'),
  panelLine('  maxReplicas: 10'),
  panelLine('  targetCPUUtilizationPercentage: 80'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-rq01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 51. K8s Cert Manager — bold file headings + panelLine YAML
// ---------------------------------------------------------------------------

export const syntheticK8sCertManager = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-cm01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Create the following configuration files:',
  '',
  '                        \x1b[1mvalues.yaml\x1b[0m                                   ',
  panelBlank(),
  panelLine('installCRDs: true'),
  panelLine('replicaCount: 2'),
  panelLine(''),
  panelLine('prometheus:'),
  panelLine('  enabled: true'),
  panelLine('  servicemonitor:'),
  panelLine('    enabled: true'),
  panelLine(''),
  panelLine('webhook:'),
  panelLine('  replicaCount: 2'),
  panelLine('  timeoutSeconds: 10'),
  panelBlank(),
  '',
  '                      \x1b[1mcluster-issuer.yaml\x1b[0m                              ',
  panelBlank(),
  panelLine('apiVersion: cert-manager.io/v1'),
  panelLine('kind: ClusterIssuer'),
  panelLine('metadata:'),
  panelLine('  name: letsencrypt-prod'),
  panelLine('spec:'),
  panelLine('  acme:'),
  panelLine('    server: https://acme-v02.api.letsencrypt.org/directory'),
  panelLine('    email: admin@example.com'),
  panelLine('    privateKeySecretRef:'),
  panelLine('      name: letsencrypt-prod-key'),
  panelLine('    solvers:'),
  panelLine('    - http01:'),
  panelLine('        ingress:'),
  panelLine('          class: nginx'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-cm01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 52. K8s Velero Backup — multiple bold file heading transitions
// ---------------------------------------------------------------------------

export const syntheticK8sVeleroBackup = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-vb01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Set up Velero backup with these files:',
  '',
  '                      \x1b[1mbackup-schedule.yaml\x1b[0m                              ',
  panelBlank(),
  panelLine('apiVersion: velero.io/v1'),
  panelLine('kind: Schedule'),
  panelLine('metadata:'),
  panelLine('  name: daily-backup'),
  panelLine('  namespace: velero'),
  panelLine('spec:'),
  panelLine('  schedule: "0 1 * * *"'),
  panelLine('  template:'),
  panelLine('    includedNamespaces:'),
  panelLine('    - production'),
  panelLine('    - staging'),
  panelLine('    ttl: 720h0m0s'),
  panelLine('    storageLocation: azure-default'),
  panelLine('    volumeSnapshotLocations:'),
  panelLine('    - azure-default'),
  panelBlank(),
  '',
  '                          \x1b[1mrestore.sh\x1b[0m                                    ',
  panelBlank(),
  panelLine('#!/usr/bin/env bash'),
  panelLine('set -euo pipefail'),
  panelLine(''),
  panelLine('BACKUP_NAME=$(velero backup get -o json | jq -r \\'),
  panelLine("  '.items | sort_by(.metadata.creationTimestamp) | last | .metadata.name')"),
  panelLine(''),
  panelLine('echo "Restoring from backup: $BACKUP_NAME"'),
  panelLine('velero restore create --from-backup "$BACKUP_NAME" \\'),
  panelLine('  --include-namespaces production'),
  panelLine(''),
  panelLine('velero restore describe "$BACKUP_NAME" --details'),
  panelBlank(),
  '',
  '                          \x1b[1mverify.sh\x1b[0m                                     ',
  panelBlank(),
  panelLine('#!/usr/bin/env bash'),
  panelLine('set -euo pipefail'),
  panelLine(''),
  panelLine('echo "Verifying restored resources..."'),
  panelLine('kubectl get pods -n production'),
  panelLine('kubectl get pvc -n production'),
  panelLine('kubectl get svc -n production'),
  panelLine(''),
  panelLine('echo "All resources verified successfully"'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-vb01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 53. kubectl get wide — tabular output with aligned columns
// ---------------------------------------------------------------------------

export const syntheticKubectlGetWide = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-kw01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Current pod status across all nodes:',
  '',
  panelBlank(),
  panelLine('NAME                    READY   STATUS    RESTARTS   AGE   IP           NODE'),
  panelLine(
    'web-0m                  1/1     Running   0          3d    10.244.0.5   aks-pool1-12345'
  ),
  panelLine(
    'api-250m                2/2     Running   1          2d    10.244.0.6   aks-pool1-12345'
  ),
  panelLine(
    'worker-batch-7b9f4     1/1     Running   0          12h   10.244.1.3   aks-pool2-67890'
  ),
  panelLine(
    'cache-redis-0           1/1     Running   0          5d    10.244.1.4   aks-pool2-67890'
  ),
  panelLine(
    'ingress-nginx-ct9l2    1/1     Running   2          7d    10.244.2.8   aks-pool3-24680'
  ),
  panelLine(
    'monitor-prom-0          3/3     Running   0          1d    10.244.2.9   aks-pool3-24680'
  ),
  panelBlank(),
  '',
  'To get more detail on a specific pod:',
  '',
  panelBlank(),
  panelLine('kubectl describe pod web-0m'),
  panelLine('kubectl logs api-250m -c primary --tail=100'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-kw01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 54. K8s AGIC — prose word threshold boundary test
// ---------------------------------------------------------------------------

export const syntheticK8sAgic = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ag01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Deploy the AGIC ingress resource:',
  '',
  panelBlank(),
  panelLine('apiVersion: networking.k8s.io/v1'),
  panelLine('kind: Ingress'),
  panelLine('metadata:'),
  panelLine('  name: agic-ingress'),
  panelLine('  namespace: production'),
  panelLine('  annotations:'),
  panelLine('    kubernetes.io/ingress.class: azure/application-gateway'),
  panelLine('    appgw.ingress.kubernetes.io/ssl-redirect: "true"'),
  panelLine('spec:'),
  panelLine('  rules:'),
  panelLine('  - host: api.example.com'),
  panelLine('    http:'),
  panelLine('      paths:'),
  panelLine('      - path: /'),
  panelLine('        pathType: Prefix'),
  panelLine('        backend:'),
  panelLine('          service:'),
  panelLine('            name: api-service'),
  panelLine('            port:'),
  panelLine('              number: 80'),
  panelBlank(),
  '',
  'Next configure the DNS',
  '',
  panelBlank(),
  panelLine('az network dns record-set a add-record \\'),
  panelLine('  --resource-group myRG \\'),
  panelLine('  --zone-name example.com \\'),
  panelLine('  --record-set-name api \\'),
  panelLine(
    '  --ipv4-address $(kubectl get ingress agic-ingress -o jsonpath="{.status.loadBalancer.ingress[0].ip}")'
  ),
  panelBlank(),
  '',
  'Verify the AGIC ingress is operational now:',
  '',
  panelBlank(),
  panelLine('kubectl get ingress agic-ingress -n production'),
  panelLine('curl -sS https://api.example.com/health'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ag01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 55. K8s Prometheus Monitoring — file header comments splitting code blocks
// ---------------------------------------------------------------------------

export const syntheticK8sPrometheusMonitoring = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-pm01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Create these monitoring manifests:',
  '',
  panelBlank(),
  panelLine('# deployment.yaml'),
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: Deployment'),
  panelLine('metadata:'),
  panelLine('  name: prometheus-server'),
  panelLine('  namespace: monitoring'),
  panelLine('spec:'),
  panelLine('  replicas: 1'),
  panelLine('  selector:'),
  panelLine('    matchLabels:'),
  panelLine('      app: prometheus'),
  panelLine('  template:'),
  panelLine('    metadata:'),
  panelLine('      labels:'),
  panelLine('        app: prometheus'),
  panelLine('    spec:'),
  panelLine('      containers:'),
  panelLine('      - name: prometheus'),
  panelLine('        image: prom/prometheus:v2.47.0'),
  panelLine('        ports:'),
  panelLine('        - containerPort: 9090'),
  panelLine('        resources:'),
  panelLine('          requests:'),
  panelLine('            cpu: 250m'),
  panelLine('            memory: 512Mi'),
  panelLine(''),
  panelLine('# service.yaml'),
  panelLine('apiVersion: v1'),
  panelLine('kind: Service'),
  panelLine('metadata:'),
  panelLine('  name: prometheus-server'),
  panelLine('  namespace: monitoring'),
  panelLine('spec:'),
  panelLine('  type: ClusterIP'),
  panelLine('  ports:'),
  panelLine('  - port: 9090'),
  panelLine('    targetPort: 9090'),
  panelLine('  selector:'),
  panelLine('    app: prometheus'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-pm01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 56. K8s Workload Identity — Go code with control flow patterns
// ---------------------------------------------------------------------------

export const syntheticK8sWorkloadIdentity = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-wi01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Go service that uses workload identity to access Azure resources:',
  '',
  panelBlank(),
  panelLine('package main'),
  panelLine(''),
  panelLine('import ('),
  panelLine('"context"'),
  panelLine('"fmt"'),
  panelLine('"log"'),
  panelLine('"os"'),
  panelLine(')'),
  panelLine(''),
  panelLine('func main() {'),
  panelLine('ctx := context.Background()'),
  panelLine('items := []string{"vault-secret-1", "vault-secret-2"}'),
  panelLine(''),
  panelLine('cred, err := NewDefaultAzureCredential()'),
  panelLine('if err != nil {'),
  panelLine('log.Fatalf("failed to get credential: %v", err)'),
  panelLine('}'),
  panelLine(''),
  panelLine('for _, item := range items {'),
  panelLine('secret, err := getSecret(ctx, cred, item)'),
  panelLine('if err != nil {'),
  panelLine('log.Printf("warning: %v", err)'),
  panelLine('continue'),
  panelLine('}'),
  panelLine('fmt.Printf("Secret %s = %s\\n", item, secret)'),
  panelLine('}'),
  panelLine(''),
  panelLine('defer func() {'),
  panelLine('fmt.Println("cleanup complete")'),
  panelLine('}()'),
  panelLine(''),
  panelLine('go func() {'),
  panelLine('ticker := time.NewTicker(30 * time.Second)'),
  panelLine('defer ticker.Stop()'),
  panelLine('for range ticker.C {'),
  panelLine('refreshTokens(ctx, cred)'),
  panelLine('}'),
  panelLine('}()'),
  panelLine(''),
  panelLine('port := os.Getenv("PORT")'),
  panelLine('if port == "" {'),
  panelLine('port = "8080"'),
  panelLine('}'),
  panelLine('log.Printf("listening on :%s", port)'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-wi01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 57. K8s Argo CD — Rust code with method chains and closures
// ---------------------------------------------------------------------------

export const syntheticK8sArgoCD = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ar01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Rust Actix Web server for the ArgoCD webhook handler:',
  '',
  panelBlank(),
  panelLine('use actix_web::{web, App, HttpServer, HttpResponse};'),
  panelLine('use serde::Deserialize;'),
  panelLine('use std::sync::Mutex;'),
  panelLine(''),
  panelLine('#[derive(Deserialize)]'),
  panelLine('struct WebhookPayload {'),
  panelLine('    app_name: String,'),
  panelLine('    revision: String,'),
  panelLine('}'),
  panelLine(''),
  panelLine('struct AppState {'),
  panelLine('    sync_count: Mutex<u64>,'),
  panelLine('}'),
  panelLine(''),
  panelLine('#[actix_web::main]'),
  panelLine('async fn main() -> std::io::Result<()> {'),
  panelLine('    let state = web::Data::new(AppState {'),
  panelLine('        sync_count: Mutex::new(0),'),
  panelLine('    });'),
  panelLine(''),
  panelLine('    HttpServer::new(move || {'),
  panelLine('        App::new()'),
  panelLine('            .app_data(state.clone())'),
  panelLine('            .route("/", web::get().to(index))'),
  panelLine('            .route("/api", web::get().to(api))'),
  panelLine('            .route("/webhook", web::post().to(handle_webhook))'),
  panelLine('    })'),
  panelLine('    .bind("0.0.0.0:8080")?'),
  panelLine('    .run()'),
  panelLine('    .await'),
  panelLine('}'),
  panelLine(''),
  panelLine('async fn handle_webhook('),
  panelLine('    payload: web::Json<WebhookPayload>,'),
  panelLine('    state: web::Data<AppState>,'),
  panelLine(') -> HttpResponse {'),
  panelLine('    let mut count = state.sync_count.lock().unwrap();'),
  panelLine('    *count += 1;'),
  panelLine('    println!("Sync #{} for {}", count, payload.app_name);'),
  panelLine('    HttpResponse::Ok().json(serde_json::json!({'),
  panelLine('        "status": "synced",'),
  panelLine('        "revision": payload.revision'),
  panelLine('    }))'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ar01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 58. Cargo Workspace Deps — Cargo.toml with [section] headers
// ---------------------------------------------------------------------------

export const syntheticCargoWorkspaceDeps = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-cw01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Set up the Cargo project with these files:',
  '',
  '                         \x1b[1mCargo.toml\x1b[0m                                    ',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "myapp"'),
  panelLine('version = "0.1.0"'),
  panelLine('edition = "2021"'),
  panelLine(''),
  panelLine('[dependencies]'),
  panelLine('actix-web = "4"'),
  panelLine('serde = { version = "1", features = ["derive"] }'),
  panelLine('tokio = { version = "1", features = ["full"] }'),
  panelLine('tracing = "0.1"'),
  panelLine('tracing-subscriber = "0.3"'),
  panelLine(''),
  panelLine('[features]'),
  panelLine('default = ["tls"]'),
  panelLine('tls = ["actix-web/openssl"]'),
  panelLine(''),
  panelLine('[profile.release]'),
  panelLine('opt-level = 3'),
  panelLine('lto = true'),
  panelBlank(),
  '',
  '                        \x1b[1msrc/main.rs\x1b[0m                                   ',
  panelBlank(),
  panelLine('use actix_web::{web, App, HttpServer, middleware};'),
  panelLine('use tracing_subscriber;'),
  panelLine(''),
  panelLine('#[actix_web::main]'),
  panelLine('async fn main() -> std::io::Result<()> {'),
  panelLine('    tracing_subscriber::init();'),
  panelLine('    HttpServer::new(|| {'),
  panelLine('        App::new()'),
  panelLine('            .wrap(middleware::Logger::default())'),
  panelLine('            .route("/health", web::get().to(|| async { "OK" }))'),
  panelLine('    })'),
  panelLine('    .bind("0.0.0.0:8080")?'),
  panelLine('    .run()'),
  panelLine('    .await'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-cw01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 59. K8s HPA Custom Metrics — mixed content types
// ---------------------------------------------------------------------------

export const syntheticK8sHpaCustomMetrics = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-hc01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Check the current HPA status:',
  '',
  panelBlank(),
  panelLine('NAME       REFERENCE             TARGETS         MINPODS   MAXPODS   REPLICAS'),
  panelLine('web-app    Deployment/web-app     45%/80%, 200m   2         10        3'),
  panelLine('api-svc    Deployment/api-svc     72%/70%, 500m   3         20        8'),
  panelBlank(),
  '',
  'Apply the following HPA configuration:',
  '',
  panelBlank(),
  panelLine('apiVersion: autoscaling/v2'),
  panelLine('kind: HorizontalPodAutoscaler'),
  panelLine('metadata:'),
  panelLine('  name: web-app'),
  panelLine('  namespace: production'),
  panelLine('spec:'),
  panelLine('  scaleTargetRef:'),
  panelLine('    apiVersion: apps/v1'),
  panelLine('    kind: Deployment'),
  panelLine('    name: web-app'),
  panelLine('  minReplicas: 2'),
  panelLine('  maxReplicas: 10'),
  panelLine('  metrics:'),
  panelLine('  - type: Resource'),
  panelLine('    resource:'),
  panelLine('      name: cpu'),
  panelLine('      target:'),
  panelLine('        type: Utilization'),
  panelLine('        averageUtilization: 80'),
  panelLine('  - type: Resource'),
  panelLine('    resource:'),
  panelLine('      name: memory'),
  panelLine('      target:'),
  panelLine('        type: AverageValue'),
  panelLine('        averageValue: 200m'),
  panelLine('  behavior:'),
  panelLine('    scaleDown:'),
  panelLine('      stabilizationWindowSeconds: 300'),
  panelBlank(),
  '',
  'Then verify:',
  '',
  panelBlank(),
  panelLine('kubectl apply -f hpa.yaml'),
  panelLine('kubectl get hpa -w'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-hc01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 60. AKS Node Pools — az CLI with backslash line continuations
// ---------------------------------------------------------------------------

export const syntheticAksNodePools = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-np01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Add specialized node pools to your AKS cluster:',
  '',
  panelBlank(),
  panelLine('az aks nodepool add --resource-group myRG --cluster-name myAKS \\'),
  panelLine('  --name gpupool --node-count 3 --node-vm-size Standard_NC6s_v3 \\'),
  panelLine('  --labels workload=gpu environment=production \\'),
  panelLine('  --taints sku=gpu:NoSchedule --max-pods 30'),
  panelLine(''),
  panelLine('az aks nodepool add --resource-group myRG --cluster-name myAKS \\'),
  panelLine('  --name spotpool --node-count 5 --priority Spot \\'),
  panelLine('  --eviction-policy Delete --spot-max-price -1 \\'),
  panelLine('  --node-vm-size Standard_D4s_v3 --labels workload=batch \\'),
  panelLine('  --max-pods 50 --enable-cluster-autoscaler \\'),
  panelLine('  --min-count 0 --max-count 20'),
  panelLine(''),
  panelLine('az aks nodepool add --resource-group myRG --cluster-name myAKS \\'),
  panelLine('  --name armpool --node-count 2 \\'),
  panelLine('  --node-vm-size Standard_D4ps_v5 \\'),
  panelLine('  --labels architecture=arm64 --max-pods 30'),
  panelBlank(),
  '',
  'Verify node pools:',
  '',
  panelBlank(),
  panelLine('az aks nodepool list --resource-group myRG \\'),
  panelLine('  --cluster-name myAKS -o table'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-np01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 61. K8s Rolling Update — kubectl describe with Events table
// ---------------------------------------------------------------------------

export const syntheticK8sRollingUpdate = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-ru01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is the pod status from kubectl describe:',
  '',
  panelBlank(),
  panelLine('Name:         web-app-5d4f8c9b7-x2k9j'),
  panelLine('Namespace:    production'),
  panelLine('Priority:     0'),
  panelLine('Node:         aks-pool1-12345678-vmss000002/10.240.0.6'),
  panelLine('Status:       Running'),
  panelLine('IP:           10.244.0.15'),
  panelLine('Containers:'),
  panelLine('  web-app:'),
  panelLine('    Image:          myregistry.azurecr.io/web-app:v2.3.1'),
  panelLine('    Port:           8080/TCP'),
  panelLine('    State:          Running'),
  panelLine('      Started:      Mon, 15 Jan 2024 10:30:00 +0000'),
  panelLine('    Ready:          True'),
  panelLine('    Limits:'),
  panelLine('      cpu:     500m'),
  panelLine('      memory:  256Mi'),
  panelLine('    Requests:'),
  panelLine('      cpu:     200m'),
  panelLine('      memory:  128Mi'),
  panelLine('Conditions:'),
  panelLine('  Type              Status'),
  panelLine('  Initialized       True'),
  panelLine('  Ready             True'),
  panelLine('  ContainersReady   True'),
  panelLine('  PodScheduled      True'),
  panelLine('Events:'),
  panelLine('  Type    Reason     Age   From               Message'),
  panelLine('  ----    ------     ----  ----               -------'),
  panelLine(
    '  Normal  Scheduled  2m    default-scheduler  Successfully assigned production/web-app'
  ),
  panelLine('  Normal  Pulled     90s   kubelet            Container image pulled'),
  panelLine('  Normal  Created    89s   kubelet            Created container web-app'),
  panelLine('  Normal  Started    88s   kubelet            Started container web-app'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-ru01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 62. K8s Key Vault CSI — ANSI split across line boundary
// ---------------------------------------------------------------------------

export const syntheticK8sKeyVaultCsi = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-kv01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is the SecretProviderClass configuration\x1b[4',
  '0m for Azure Key Vault:',
  '',
  panelBlank(),
  panelLine('apiVersion: secrets-store.csi.x-k8s.io/v1'),
  panelLine('kind: SecretProviderClass'),
  panelLine('metadata:'),
  panelLine('  name: azure-kv-secrets'),
  panelLine('  namespace: production'),
  panelLine('spec:'),
  panelLine('  provider: azure'),
  panelLine('  parameters:'),
  panelLine('    usePodIdentity: "false"'),
  panelLine('    useVMManagedIdentity: "true"'),
  panelLine('    userAssignedIdentityID: "<client-id>"'),
  panelLine('    keyvaultName: my-keyvault'),
  panelLine('    objects: |'),
  panelLine('      array:'),
  panelLine('        - |'),
  panelLine('          objectName: db-password'),
  panelLine('          objectType: secret'),
  panelLine('        - |'),
  panelLine('          objectName: api-key'),
  panelLine('          objectType: secret'),
  panelLine('    tenantId: "<tenant-id>"'),
  panelLine('---'),
  panelLine('apiVersion: v1'),
  panelLine('kind: Pod'),
  panelLine('metadata:'),
  panelLine('  name: kv-consumer'),
  panelLine('spec:'),
  panelLine('  containers:'),
  panelLine('  - name: app'),
  panelLine('    image: myregistry.azurecr.io/app:latest'),
  panelLine('    resources:'),
  panelLine('      requests:'),
  panelLine('        cpu: 250m'),
  panelLine('        memory: 64Mi'),
  panelLine('    volumeMounts:'),
  panelLine('    - name: secrets-store'),
  panelLine('      mountPath: /mnt/secrets'),
  panelLine('      readOnly: true'),
  panelLine('  volumes:'),
  panelLine('  - name: secrets-store'),
  panelLine('    csi:'),
  panelLine('      driver: secrets-store.csi.k8s.io'),
  panelLine('      readOnly: true'),
  panelLine('      volumeAttributes:'),
  panelLine('        secretProviderClass: azure-kv-secrets'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-kv01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 63. K8s Flux CD — Python with __name__ and __init__
// ---------------------------------------------------------------------------

export const syntheticK8sFluxCD = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-fc01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is a Python reconciler for Flux CD custom resources:',
  '',
  panelBlank(),
  panelLine('import subprocess'),
  panelLine('import json'),
  panelLine('from typing import List, Dict'),
  panelLine(''),
  panelLine(''),
  panelLine('class FluxReconciler:'),
  panelLine('    """Reconcile Flux CD resources across namespaces."""'),
  panelLine(''),
  panelLine('    def __init__(self, namespace: str):'),
  panelLine('        self.namespace = namespace'),
  panelLine('        self.items: List[Dict] = []'),
  panelLine('        self._synced = False'),
  panelLine(''),
  panelLine('    def discover(self) -> None:'),
  panelLine('        result = subprocess.run('),
  panelLine('            ["flux", "get", "all", "-n", self.namespace, "-o", "json"],'),
  panelLine('            capture_output=True, text=True'),
  panelLine('        )'),
  panelLine('        self.items = json.loads(result.stdout)'),
  panelLine(''),
  panelLine('    def reconcile(self) -> None:'),
  panelLine('        for item in self.items:'),
  panelLine('            name = item["metadata"]["name"]'),
  panelLine('            kind = item["kind"]'),
  panelLine('            print(f"Reconciling {kind}/{name}")'),
  panelLine('            subprocess.run('),
  panelLine('                ["flux", "reconcile", kind.lower(), name,'),
  panelLine('                 "-n", self.namespace],'),
  panelLine('                check=True'),
  panelLine('            )'),
  panelLine('        self._synced = True'),
  panelLine(''),
  panelLine(''),
  panelLine('if __name__ == "__main__":'),
  panelLine('    reconciler = FluxReconciler(namespace="flux-system")'),
  panelLine('    reconciler.discover()'),
  panelLine('    reconciler.reconcile()'),
  panelLine('    print(f"Synced: {reconciler._synced}")'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-fc01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 64. K8s Network Debug — bare JSON kubectl output
// ---------------------------------------------------------------------------

export const syntheticK8sNetworkDebug = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-nd01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Here is the pod definition for network debugging:',
  '',
  panelBlank(),
  panelLine('{'),
  panelLine('  "apiVersion": "v1",'),
  panelLine('  "kind": "Pod",'),
  panelLine('  "metadata": {'),
  panelLine('    "name": "debug-pod",'),
  panelLine('    "namespace": "default",'),
  panelLine('    "labels": {'),
  panelLine('      "app": "debug",'),
  panelLine('      "version": "v1"'),
  panelLine('    }'),
  panelLine('  },'),
  panelLine('  "spec": {'),
  panelLine('    "containers": ['),
  panelLine('      {'),
  panelLine('        "name": "netshoot",'),
  panelLine('        "image": "nicolaka/netshoot:latest",'),
  panelLine('        "command": ['),
  panelLine('          "/bin/bash",'),
  panelLine('          "-c",'),
  panelLine('          "sleep 3600"'),
  panelLine('        ],'),
  panelLine('        "resources": {'),
  panelLine('          "requests": {'),
  panelLine('            "cpu": "100m",'),
  panelLine('            "memory": "64Mi"'),
  panelLine('          },'),
  panelLine('          "limits": {'),
  panelLine('            "cpu": "200m",'),
  panelLine('            "memory": "128Mi"'),
  panelLine('          }'),
  panelLine('        }'),
  panelLine('      }'),
  panelLine('    ],'),
  panelLine('    "restartPolicy": "Never"'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
  '',
  'Run network diagnostics:',
  '',
  panelBlank(),
  panelLine('kubectl apply -f debug-pod.json'),
  panelLine('kubectl exec -it debug-pod -- nslookup kubernetes.default'),
  panelLine('kubectl exec -it debug-pod -- curl -sS http://api-service.production:80/health'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-nd01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// 65. Rust Actix Web — centered heading breaking Dockerfile code
// ---------------------------------------------------------------------------

export const syntheticRustActixWeb = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent-rw01:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  'Build the container image with this Dockerfile:',
  '',
  panelBlank(),
  panelLine('FROM rust:1.74-slim AS builder'),
  panelLine('WORKDIR /app'),
  panelLine('COPY Cargo.toml Cargo.lock ./'),
  panelLine('RUN mkdir src && echo "fn main() {}" > src/main.rs'),
  panelLine('RUN cargo build --release'),
  panelLine('COPY src/ src/'),
  panelLine('RUN touch src/main.rs && cargo build --release'),
  panelLine(''),
  panelLine('FROM debian:bookworm-slim'),
  panelLine(
    'RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*'
  ),
  panelLine('COPY --from=builder /app/target/release/myapp /usr/local/bin/'),
  panelLine('EXPOSE 8080'),
  panelLine('CMD ["myapp"]'),
  panelBlank(),
  '',
  '        \x1b[1mKubernetes manifests for deployment and service configuration\x1b[0m',
  '',
  panelBlank(),
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: Deployment'),
  panelLine('metadata:'),
  panelLine('  name: rust-web'),
  panelLine('  namespace: production'),
  panelLine('spec:'),
  panelLine('  replicas: 3'),
  panelLine('  selector:'),
  panelLine('    matchLabels:'),
  panelLine('      app: rust-web'),
  panelLine('  template:'),
  panelLine('    metadata:'),
  panelLine('      labels:'),
  panelLine('        app: rust-web'),
  panelLine('    spec:'),
  panelLine('      containers:'),
  panelLine('      - name: web'),
  panelLine('        image: myregistry.azurecr.io/rust-web:latest'),
  panelLine('        ports:'),
  panelLine('        - containerPort: 8080'),
  panelLine('        resources:'),
  panelLine('          requests:'),
  panelLine('            cpu: 100m'),
  panelLine('            memory: 64Mi'),
  panelLine('          limits:'),
  panelLine('            cpu: 500m'),
  panelLine('            memory: 256Mi'),
  panelLine('---'),
  panelLine('apiVersion: v1'),
  panelLine('kind: Service'),
  panelLine('metadata:'),
  panelLine('  name: rust-web'),
  panelLine('  namespace: production'),
  panelLine('spec:'),
  panelLine('  type: ClusterIP'),
  panelLine('  ports:'),
  panelLine('  - port: 80'),
  panelLine('    targetPort: 8080'),
  panelLine('  selector:'),
  panelLine('    app: rust-web'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent-rw01:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 66 — Bold file heading splitting: Cargo.toml → src/main.rs
// Tests that a second bold file heading inside the same panel run properly
// splits the code block, instead of merging both files into one block.
// ---------------------------------------------------------------------------
export const syntheticBoldHeadingSplit = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  '  \x1b[1mCargo.toml\x1b[0m',
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "rust-k8s-example"'),
  panelLine('version = "0.1.0"'),
  panelLine('[dependencies]'),
  panelLine('axum = "0.7"'),
  panelBlank(),
  '',
  '  \x1b[1msrc/main.rs\x1b[0m',
  '',
  panelBlank(),
  panelLine('use axum::{routing::get, Router};'),
  panelLine('async fn root() -> &\'static str { "hello" }'),
  panelLine('#[tokio::main]'),
  panelLine('async fn main() {'),
  panelLine('    let app = Router::new().route("/", get(root));'),
  panelLine('    axum::serve(listener, app).await.unwrap();'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 67 — Prose with colon + bullet list NOT miscategorized as YAML
// "Example: Node.js (JavaScript) HTTP app ..." is prose, not a YAML key.
// The " - GET /healthz → 200" bullet items are prose, not YAML list items.
// ---------------------------------------------------------------------------
export const syntheticProseNotYaml = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Example: Node.js (JavaScript) HTTP app listening on 0.0.0.0:8080 with:',
  '',
  ' - GET /healthz \u2192 200',
  ' - GET /readyz \u2192 200',
  '',
  'Containerize (Dockerfile)',
  '',
  panelBlank(),
  panelLine('FROM node:20-alpine'),
  panelLine('WORKDIR /app'),
  panelLine('ENV NODE_ENV=production'),
  panelLine('COPY package*.json ./'),
  panelLine('RUN npm ci --omit=dev'),
  panelLine('COPY . .'),
  panelLine('EXPOSE 8080'),
  panelLine('USER node'),
  panelLine('CMD ["node", "server.js"]'),
  panelBlank(),
  '',
  'Build + push:',
  '',
  panelBlank(),
  panelLine('docker build -t <registry>/myapp:1.0.0 .'),
  panelLine('docker push <registry>/myapp:1.0.0'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 68: Centered colon title heading absorbed into YAML code block
// "Optional: Ingress" matches looksLikeYaml() because "Optional:" looks
// like a YAML key, so the bold-file-heading handler fails to break.
// ---------------------------------------------------------------------------
export const syntheticCenteredColonTitle = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  '  \x1b[1mk8s.yaml\x1b[0m',
  '',
  panelBlank(),
  panelLine('apiVersion: v1'),
  panelLine('kind: Service'),
  panelLine('metadata:'),
  panelLine('  name: myapp'),
  panelLine('spec:'),
  panelLine('  type: ClusterIP'),
  panelLine('  ports:'),
  panelLine('    - port: 80'),
  panelLine('      targetPort: 8080'),
  panelLine('  selector:'),
  panelLine('    app: myapp'),
  panelBlank(),
  '',
  '                           \x1b[1mOptional: Ingress\x1b[0m',
  '',
  '(Requires an Ingress controller installed, e.g., nginx)',
  '',
  panelBlank(),
  panelLine('apiVersion: networking.k8s.io/v1'),
  panelLine('kind: Ingress'),
  panelLine('metadata:'),
  panelLine('  name: myapp-ingress'),
  panelLine('spec:'),
  panelLine('  rules:'),
  panelLine('    - host: myapp.example.com'),
  panelLine('      http:'),
  panelLine('        paths:'),
  panelLine('          - path: /'),
  panelLine('            pathType: Prefix'),
  panelLine('            backend:'),
  panelLine('              service:'),
  panelLine('                name: myapp'),
  panelLine('                port:'),
  panelLine('                  number: 80'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 69: ANSI escape split creating orphan bracket and 0m: in YAML
// Terminal wraps "\x1b[" across a line boundary, producing "metadata["
// then "0m:" after ANSI stripping.
// ---------------------------------------------------------------------------
export const syntheticAnsiSplitYamlKey = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Create cobol-k8s.yaml (replace image:):',
  '',
  panelBlank(),
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: Deployment'),
  ' metadata\x1b[',
  '0m:',
  panelLine('  name: cobol-cgi'),
  panelLine('  labels:'),
  panelLine('    app: cobol-cgi'),
  panelLine('spec:'),
  panelLine('  replicas: 2'),
  panelLine('---'),
  panelLine('apiVersion: v1'),
  panelLine('kind: Service'),
  panelLine('metadata:'),
  panelLine('  name: cobol-cgi'),
  panelLine('spec:'),
  panelLine('  type: ClusterIP'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 70: Prose heading after Dockerfile absorbed into code block
// Bold headings like "Build + push (example with Docker Hub):" are prose,
// not filenames, and should break the preceding Dockerfile code block.
// ---------------------------------------------------------------------------
export const syntheticProseHeadingAfterDockerfile = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  '  \x1b[1mDockerfile\x1b[0m',
  '',
  panelBlank(),
  panelLine('FROM node:20-alpine'),
  panelLine('WORKDIR /app'),
  panelLine('COPY . .'),
  panelLine('EXPOSE 8080'),
  panelLine('CMD ["node", "server.js"]'),
  panelBlank(),
  '',
  '  \x1b[1mBuild + push (example with Docker Hub):\x1b[0m',
  '',
  panelBlank(),
  panelLine('docker build -t registry/myapp:1.0 .'),
  panelLine('docker push registry/myapp:1.0'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 71: Centered numbered step heading absorbed into code block
// "2) Containerize it (multi-stage Dockerfile)" with deep indent (6+)
// should break the preceding Cargo.toml code block.
// ---------------------------------------------------------------------------
export const syntheticCenteredStepHeading = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  '  \x1b[1m1. Create a tiny Rust HTTP app\x1b[0m',
  '',
  '  \x1b[1mCargo.toml\x1b[0m',
  '',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "myapp"'),
  panelLine('version = "0.1.0"'),
  panelLine('[dependencies]'),
  panelLine('axum = "0.7"'),
  panelBlank(),
  '',
  '                   \x1b[1m2) Containerize it (multi-stage Dockerfile)\x1b[0m',
  '',
  '  \x1b[1mDockerfile\x1b[0m',
  '',
  panelBlank(),
  panelLine('FROM rust:1.76 AS builder'),
  panelLine('WORKDIR /app'),
  panelLine('COPY Cargo.toml Cargo.lock ./'),
  panelLine('RUN cargo build --release'),
  panelLine('FROM gcr.io/distroless/cc-debian12:nonroot'),
  panelLine('COPY --from=builder /app/target/release/myapp /app/myapp'),
  panelLine('EXPOSE 8080'),
  panelLine('ENTRYPOINT ["/app/myapp"]'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 72: Fortran + Dockerfile multi-file bold headings
// Tests that gfortran commands are detected as code and Fortran/Dockerfile
// are split into separate code blocks.
// ---------------------------------------------------------------------------
export const syntheticFortranDockerfile = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  '  \x1b[1mhello.f90\x1b[0m',
  '',
  panelBlank(),
  panelLine('PROGRAM HELLO'),
  panelLine('  IMPLICIT NONE'),
  panelLine('  PRINT *, "Hello, World!"'),
  panelLine('END PROGRAM HELLO'),
  panelBlank(),
  '',
  '  \x1b[1mDockerfile\x1b[0m',
  '',
  panelBlank(),
  panelLine('FROM gcc:latest'),
  panelLine('COPY hello.f90 .'),
  panelLine('RUN gfortran -o hello hello.f90'),
  panelLine('CMD ["./hello"]'),
  panelBlank(),
  '',
  'Compile and deploy:',
  '',
  panelBlank(),
  panelLine('gfortran -o hello hello.f90'),
  panelLine('docker build -t registry/fortran-app:1.0 .'),
  panelLine('docker push registry/fortran-app:1.0'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 73: COBOL + PHP + C multi-language K8s deployment
// Tests detection of diverse languages in Rich terminal panels.
// ---------------------------------------------------------------------------
export const syntheticMultiLangK8sDeploy = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  '  \x1b[1mhello.cob\x1b[0m',
  '',
  panelBlank(),
  panelLine('       IDENTIFICATION DIVISION.'),
  panelLine('       PROGRAM-ID. HELLO.'),
  panelLine('       PROCEDURE DIVISION.'),
  panelLine('           DISPLAY "Hello, World!".'),
  panelLine('           STOP RUN.'),
  panelBlank(),
  '',
  '  \x1b[1mindex.php\x1b[0m',
  '',
  panelBlank(),
  panelLine('<?php'),
  panelLine('echo "Hello from PHP";'),
  panelLine('?>'),
  panelBlank(),
  '',
  '  \x1b[1mmain.c\x1b[0m',
  '',
  panelBlank(),
  panelLine('#include <stdio.h>'),
  panelLine('int main() {'),
  panelLine('    printf("Hello\\n");'),
  panelLine('    return 0;'),
  panelLine('}'),
  panelBlank(),
  '',
  '  \x1b[1mDockerfile\x1b[0m',
  '',
  panelBlank(),
  panelLine('FROM gcc:12 AS builder'),
  panelLine('COPY main.c .'),
  panelLine('RUN gcc -o app main.c'),
  panelLine('FROM debian:bookworm-slim'),
  panelLine('COPY --from=builder /app /usr/local/bin/'),
  panelLine('EXPOSE 8080'),
  panelLine('CMD ["app"]'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 74: Kotlin — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticKotlinApp = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the Kotlin code:',
  '',
  '  \x1b[1mApp.kt\x1b[0m',
  '',
  panelBlank(),
  panelLine('fun main(args: Array<String>) {'),
  panelLine('    val greeting = "Hello from Kotlin"'),
  panelLine('    println(greeting)'),
  panelLine('    val numbers = listOf(1, 2, 3, 4, 5)'),
  panelLine('    numbers.filter { it % 2 == 0 }'),
  panelLine('        .forEach { println("Even: $it") }'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 75: Scala — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticScalaApp = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the Scala code:',
  '',
  '  \x1b[1mMain.scala\x1b[0m',
  '',
  panelBlank(),
  panelLine('object Main {'),
  panelLine('  def main(args: Array[String]): Unit = {'),
  panelLine('    val message = "Hello from Scala"'),
  panelLine('    println(message)'),
  panelLine('    val squares = (1 to 5).map(x => x * x)'),
  panelLine('    squares.foreach(println)'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 76: Perl — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticPerlScript = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the Perl code:',
  '',
  '  \x1b[1mapp.pl\x1b[0m',
  '',
  panelBlank(),
  panelLine('#!/usr/bin/perl'),
  panelLine('use strict;'),
  panelLine('use warnings;'),
  panelLine(''),
  panelLine('my $name = "World";'),
  panelLine('print "Hello, $name!\\n";'),
  panelLine(''),
  panelLine('my @items = (1, 2, 3, 4, 5);'),
  panelLine('foreach my $item (@items) {'),
  panelLine('    print "Item: $item\\n";'),
  panelLine('}'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 77: Lua — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticLuaModule = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the Lua code:',
  '',
  '  \x1b[1minit.lua\x1b[0m',
  '',
  panelBlank(),
  panelLine('local M = {}'),
  panelLine(''),
  panelLine('function M.greet(name)'),
  panelLine('    print("Hello, " .. name)'),
  panelLine('end'),
  panelLine(''),
  panelLine('function M.add(a, b)'),
  panelLine('    return a + b'),
  panelLine('end'),
  panelLine(''),
  panelLine('return M'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 78: Haskell — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticHaskellApp = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the Haskell code:',
  '',
  '  \x1b[1mMain.hs\x1b[0m',
  '',
  panelBlank(),
  panelLine('module Main where'),
  panelLine(''),
  panelLine('import System.IO (hFlush, stdout)'),
  panelLine(''),
  panelLine('greet :: String -> IO ()'),
  panelLine('greet name = putStrLn ("Hello, " ++ name)'),
  panelLine(''),
  panelLine('main :: IO ()'),
  panelLine('main = do'),
  panelLine('    greet "World"'),
  panelLine('    hFlush stdout'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 79: Swift — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticSwiftApp = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the Swift code:',
  '',
  '  \x1b[1mmain.swift\x1b[0m',
  '',
  panelBlank(),
  panelLine('import Foundation'),
  panelLine(''),
  panelLine('struct Greeter {'),
  panelLine('    let name: String'),
  panelLine('    func greet() -> String {'),
  panelLine('        return "Hello, \\(name)!"'),
  panelLine('    }'),
  panelLine('}'),
  panelLine(''),
  panelLine('let greeter = Greeter(name: "Swift")'),
  panelLine('print(greeter.greet())'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 80: Elixir — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticElixirModule = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the Elixir code:',
  '',
  '  \x1b[1mapp.ex\x1b[0m',
  '',
  panelBlank(),
  panelLine('defmodule App do'),
  panelLine('  def hello(name) do'),
  panelLine('    IO.puts("Hello, #{name}!")'),
  panelLine('  end'),
  panelLine(''),
  panelLine('  def run do'),
  panelLine('    Enum.each(1..5, fn x ->'),
  panelLine('      IO.puts("Number: #{x}")'),
  panelLine('    end)'),
  panelLine('  end'),
  panelLine('end'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 81: Clojure — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticClojureApp = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the Clojure code:',
  '',
  '  \x1b[1mcore.clj\x1b[0m',
  '',
  panelBlank(),
  panelLine('(ns myapp.core)'),
  panelLine(''),
  panelLine('(defn greet [name]'),
  panelLine('  (println (str "Hello, " name "!")))'),
  panelLine(''),
  panelLine('(defn -main [& args]'),
  panelLine('  (greet "Clojure")'),
  panelLine('  (doseq [n (range 1 6)]'),
  panelLine('    (println "Number:" n)))'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 82: R — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticRAnalysis = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the R code:',
  '',
  '  \x1b[1manalysis.R\x1b[0m',
  '',
  panelBlank(),
  panelLine('library(dplyr)'),
  panelLine('library(ggplot2)'),
  panelLine(''),
  panelLine('df <- data.frame('),
  panelLine('  name = c("Alice", "Bob", "Charlie"),'),
  panelLine('  score = c(95, 87, 92)'),
  panelLine(')'),
  panelLine(''),
  panelLine('result <- df %>% filter(score > 90)'),
  panelLine('print(result)'),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ---------------------------------------------------------------------------
// Fixture 83: SQL — bold file heading with panel code
// ---------------------------------------------------------------------------
export const syntheticSqlSchema = [
  'stty -echo',
  '\x1b[?2004l',
  '\x1b[?2004hroot@aks-agent:/app# ',
  '\x1b[?2004l',
  '',
  "Loaded models: ['azure/gpt-4']",
  '\x1b[1;96mAI:\x1b[0m ',
  '',
  'Here is the SQL code:',
  '',
  '  \x1b[1mschema.sql\x1b[0m',
  '',
  panelBlank(),
  panelLine('CREATE TABLE users ('),
  panelLine('    id SERIAL PRIMARY KEY,'),
  panelLine('    username VARCHAR(50) NOT NULL,'),
  panelLine('    email VARCHAR(100) UNIQUE,'),
  panelLine('    created_at TIMESTAMP DEFAULT NOW()'),
  panelLine(');'),
  panelLine(''),
  panelLine("INSERT INTO users (username, email) VALUES ('admin', 'admin@example.com');"),
  panelLine("INSERT INTO users (username, email) VALUES ('guest', 'guest@example.com');"),
  panelBlank(),
  '',
  '\x1b[?2004hroot@aks-agent:/app# ',
].join('\n');

// ===========================================================================
// Bug-hunt regression fixtures (from findbugFixtures.ts)
// ===========================================================================

// ===========================================================================
// Round 1 – findbugs.test.ts
// ===========================================================================

/** Two file headings with no blank line between panels */
export const fb1_twoFileHeadings = makeRaw([
  panelBlank(),
  '                             Cargo.toml',
  panelBlank(),
  panelLine('[package]'),
  panelLine('name = "myapp"'),
  '                             src/main.rs',
  panelBlank(),
  panelLine('fn main() {'),
  panelLine('    println!("hello");'),
  panelLine('}'),
]);

/** File heading with extension-only name .env */
export const fb1_dotEnvHeading = makeRaw([
  panelBlank(),
  '                             .env',
  panelBlank(),
  panelLine('DB_HOST=localhost'),
  panelLine('DB_PORT=5432'),
]);

/** File heading with deep path src/handlers/auth.rs */
export const fb1_deepPathHeading = makeRaw([
  panelBlank(),
  '                             src/handlers/auth.rs',
  panelBlank(),
  panelLine('pub fn authenticate(req: &Request) -> bool {'),
  panelLine('    true'),
  panelLine('}'),
]);

/** Prose with 4 words should NOT break file-header block */
export const fb1_fourWordProse = makeRaw([
  panelBlank(),
  '                             config.yaml',
  panelBlank(),
  panelLine('apiVersion: v1'),
  panelLine('kind: ConfigMap'),
  panelLine('good luck with this'),
  panelLine('data:'),
  panelLine('  key: value'),
]);

/** Prose with 5 words SHOULD break file-header block */
export const fb1_fiveWordProse = makeRaw([
  panelBlank(),
  '                             config.yaml',
  panelBlank(),
  panelLine('apiVersion: v1'),
  panelLine('kind: ConfigMap'),
  panelLine('This creates the main application'),
  panelLine('data:'),
  panelLine('  key: value'),
]);

/** YAML annotation with pipe literal block scalar */
export const fb1_yamlPipeLiteral = makeRaw([
  'apiVersion: networking.k8s.io/v1',
  'kind: Ingress',
  'metadata:',
  '  annotations:',
  '    nginx.ingress.kubernetes.io/configuration-snippet: |',
  '      more_set_headers "X-Frame-Options: DENY";',
  '      more_set_headers "X-XSS-Protection: 1";',
  'spec:',
  '  rules: []',
]);

/** Bare YAML with 2 lines should NOT be wrapped */
export const fb1_bareYaml2Lines = makeRaw([
  'Here is the config:',
  '',
  'name: myapp',
  'version: "1.0"',
]);

/** Bare YAML with 3 lines SHOULD be wrapped */
export const fb1_bareYaml3Lines = makeRaw([
  'Here is the config:',
  '',
  'name: myapp',
  'version: "1.0"',
  'description: "A test"',
]);

/** Dockerfile heading with deeply indented continuation lines */
export const fb1_dockerfileContinuation = makeRaw([
  panelBlank(),
  '                             Dockerfile',
  panelBlank(),
  panelLine('FROM ubuntu:22.04'),
  panelLine('RUN apt-get update && \\'),
  panelLine('    apt-get install -y \\'),
  panelLine('    curl \\'),
  panelLine('    wget'),
]);

/** docker-compose.yml bold heading */
export const fb1_dockerCompose = makeRaw([
  panelBlank(),
  '                             docker-compose.yml',
  panelBlank(),
  panelLine('version: "3.8"'),
  panelLine('services:'),
  panelLine('  web:'),
  panelLine('    image: nginx:latest'),
]);

/** Panel code starting with port number */
export const fb1_portNumber = makeRaw([
  panelBlank(),
  '                             server.conf',
  panelBlank(),
  panelLine('3000'),
  panelLine('listen_address: 0.0.0.0'),
]);

/** ANSI 256-color code fully stripped */
export const fb1_ansi256Color = makeRaw([
  '\x1b[38;5;208mWarning: resource limit exceeded\x1b[0m',
  'Please adjust your quota.',
]);

/** Go interface{} type should not cause issues */
export const fb1_goInterface = makeRaw([
  panelBlank(),
  '                             main.go',
  panelBlank(),
  panelLine('package main'),
  panelLine(''),
  panelLine('var result interface{}'),
  panelLine(''),
  panelLine('func main() {'),
  panelLine('    result = "hello"'),
  panelLine('}'),
]);

/** Two YAML blocks separated by prose */
export const fb1_twoYamlBlocks = makeRaw([
  'First, create the namespace:',
  '',
  'apiVersion: v1',
  'kind: Namespace',
  'metadata:',
  '  name: production',
  '',
  'Then create the deployment:',
  '',
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: web',
]);

/** Shell backtick substitution at column 0 */
export const fb1_shellBacktick = makeRaw([
  'Run this command:',
  '',
  'PODS=`kubectl get pods -o name`',
  'echo $PODS',
]);

/** Makefile heading with tab-indented content */
export const fb1_makefileTab = makeRaw([
  panelBlank(),
  '                             Makefile',
  panelBlank(),
  panelLine('build:'),
  panelLine('\t@echo "Building..."'),
  panelLine('\tgo build -o app .'),
]);

/** YAML folded scalar with > indicator */
export const fb1_yamlFoldedScalar = makeRaw([
  panelBlank(),
  '                             values.yaml',
  panelBlank(),
  panelLine('app:'),
  panelLine('  description: >'),
  panelLine('    This is a long description'),
  panelLine('    that spans multiple lines'),
  panelLine('  port: 8080'),
]);

/** Indented code after numbered list item */
export const fb1_indentedCodeAfterList = makeRaw([
  '1. Create the deployment file:',
  '',
  panelLine('kubectl apply -f deployment.yaml'),
  panelLine('kubectl rollout status deployment/web'),
]);

/** requirements.txt with pip freeze output */
export const fb1_requirementsTxt = makeRaw([
  panelBlank(),
  '                             requirements.txt',
  panelBlank(),
  panelLine('flask==2.3.0'),
  panelLine('requests==2.31.0'),
  panelLine('gunicorn==21.2.0'),
]);

/** Bare code followed by bare YAML creates 2 blocks */
export const fb1_bareCodeThenYaml = makeRaw([
  'First, run:',
  '',
  'kubectl create namespace production',
  'kubectl config set-context --current --namespace=production',
  '',
  'Then apply this manifest:',
  '',
  'apiVersion: v1',
  'kind: Service',
  'metadata:',
  '  name: web',
]);

/** Hyphenated filename my-app.yaml */
export const fb1_hyphenatedFilename = makeRaw([
  panelBlank(),
  '                             my-app.yaml',
  panelBlank(),
  panelLine('apiVersion: v1'),
  panelLine('kind: Pod'),
]);

/** ANSI code split across line boundary */
export const fb1_ansiSplitLine = makeRaw([
  'The config is:\x1b[',
  '97;40m This is the value\x1b[0m',
  'End of output.',
]);

/** Windows-style paths in panel content */
export const fb1_windowsPaths = makeRaw([
  panelBlank(),
  '                             config.yaml',
  panelBlank(),
  panelLine('source: C:\\Users\\app\\config.yaml'),
  panelLine('dest: C:\\Program Files\\app\\out'),
]);

/** Very long line in panel exceeding 78 chars */
export const fb1_longPanelLine = makeRaw([
  panelBlank(),
  '                             Dockerfile',
  panelBlank(),
  panelLine('FROM ubuntu:22.04'),
  panelLine(
    'RUN apt-get update && apt-get install -y curl wget git build-essential libssl-dev pkg-config'
  ),
]);

/** Dockerfile.prod compound extension heading */
export const fb1_dockerfileProd = makeRaw([
  panelBlank(),
  '                             Dockerfile.prod',
  panelBlank(),
  panelLine('FROM node:20-slim AS builder'),
  panelLine('WORKDIR /app'),
]);

/** YAML flow-style mapping */
export const fb1_yamlFlowMapping = makeRaw([
  'apiVersion: v1',
  'kind: ConfigMap',
  'metadata:',
  '  name: test',
  '  labels: { app: web, env: prod }',
  'data:',
  '  key: value',
]);

/** kubectl command with tabular output */
export const fb1_kubectlTabular = makeRaw([
  'Check pod status:',
  '',
  'kubectl get pods',
  'NAME          STATUS    RESTARTS   AGE',
  'web-abc123    Running   0          5m',
  'api-def456    Running   1          3m',
]);

/** Panel code containing triple backticks */
export const fb1_panelTripleBacktick = makeRaw([
  panelBlank(),
  '                             README.md',
  panelBlank(),
  panelLine('# My App'),
  panelLine(''),
  panelLine('```bash'),
  panelLine('npm install'),
  panelLine('```'),
]);

/** tsconfig.json with JSON content */
export const fb1_tsconfigJson = makeRaw([
  panelBlank(),
  '                             tsconfig.json',
  panelBlank(),
  panelLine('{'),
  panelLine('  "compilerOptions": {'),
  panelLine('    "target": "ES2020",'),
  panelLine('    "module": "commonjs"'),
  panelLine('  }'),
  panelLine('}'),
]);

/** Indented line with flags should not be treated as prose */
export const fb1_flagsNotProse = makeRaw([
  panelBlank(),
  '                             deploy.sh',
  panelBlank(),
  panelLine('#!/bin/bash'),
  panelLine('kubectl apply -f manifest.yaml'),
  panelLine('  --namespace production --replicas 3 --dry-run client'),
]);

// ===========================================================================
// Round 2 – findbugs2.test.ts
// ===========================================================================

/** Non-K8s YAML ending with prose line containing colon */
export const fb2_nonK8sYamlProse = makeRaw([
  'name: my-app',
  'version: "1.0"',
  'description: short',
  'Note: you can also use Helm to install this chart',
]);

/** Bold file heading .gitignore */
export const fb2_gitignoreHeading = makeRaw([
  panelBlank(),
  '                             .gitignore',
  panelBlank(),
  panelLine('node_modules/'),
  panelLine('dist/'),
  panelLine('.env'),
]);

/** Bold file heading .dockerignore */
export const fb2_dockerignoreHeading = makeRaw([
  panelBlank(),
  '                             .dockerignore',
  panelBlank(),
  panelLine('node_modules'),
  panelLine('.git'),
  panelLine('Dockerfile'),
]);

/** YAML with --- separator between two documents */
export const fb2_yamlDocSeparator = makeRaw([
  'apiVersion: v1',
  'kind: Namespace',
  'metadata:',
  '  name: test',
  '---',
  'apiVersion: v1',
  'kind: Service',
  'metadata:',
  '  name: my-svc',
]);

/** Shell heredoc at column 0 with YAML-like body */
export const fb2_shellHeredoc = makeRaw(['cat <<EOF', 'apiVersion: v1', 'kind: Pod', 'EOF']);

/** Ordered list items with code panels after each (space-prefixed numbers match original terminal output) */
export const fb2_orderedListPanels = makeRaw([
  ' 1 Create the namespace:',
  panelBlank(),
  panelLine('kubectl create namespace test'),
  panelBlank(),
  ' 2 Apply the deployment:',
  panelBlank(),
  panelLine('kubectl apply -f deploy.yaml'),
  panelBlank(),
  ' 3 Check the status:',
  panelBlank(),
  panelLine('kubectl get pods'),
]);

/** Bold file heading with unicode naïve.py */
export const fb2_unicodeFilename = makeRaw([
  panelBlank(),
  '                             naïve.py',
  panelBlank(),
  panelLine('def hello():'),
  panelLine('    print("hello")'),
]);

/** Panel content exactly 78 chars */
export const fb2_exact78Chars = makeRaw([panelBlank(), panelLine('x'.repeat(78)), panelBlank()]);

/** Bare non-K8s YAML starting with name: */
export const fb2_bareNonK8sYaml = makeRaw([
  'name: my-app',
  'version: "1.0"',
  'description: short',
  'author: someone',
]);

/** --- separator between two non-K8s YAML sections */
export const fb2_nonK8sYamlSeparator = makeRaw([
  'name: app1',
  'version: "1.0"',
  'port: 8080',
  '---',
  'name: app2',
  'version: "2.0"',
  'port: 9090',
]);

/** Panel content with nested ANSI reset mid-line — manually built (not via panelLine) to embed \x1b[0m inside content */
export const fb2_nestedAnsiReset = makeRaw([
  panelBlank(),
  `\x1b[40m \x1b[0m\x1b[97;40m${'echo \x1b[0m"hello world"'.padEnd(78)}\x1b[0m\x1b[40m \x1b[0m`,
  panelBlank(),
]);

/** Bold file heading Cargo.lock followed by TOML */
export const fb2_cargoLockToml = makeRaw([
  panelBlank(),
  '                             Cargo.lock',
  panelBlank(),
  panelLine('[[package]]'),
  panelLine('name = "serde"'),
  panelLine('version = "1.0.197"'),
]);

/** Prose with period should not be file heading */
export const fb2_proseNotHeading = makeRaw(['Hello world.', '', 'This is a paragraph.']);

/** Markdown ## heading after code panel */
export const fb2_markdownHeadingAfterCode = makeRaw([
  panelBlank(),
  panelLine('kubectl get pods'),
  panelBlank(),
  '',
  '## Next Steps',
  '',
  'Do something else.',
]);

/** Python f-string with colon not confused as YAML */
export const fb2_pythonFString = makeRaw(['print(f"Hello: {name}")']);

/** Panel content with tab characters */
export const fb2_makefileTabChars = makeRaw([
  panelBlank(),
  panelLine('build:'),
  panelLine('\tgo build -o app .'),
  panelLine('test:'),
  panelLine('\tgo test ./...'),
  panelBlank(),
]);

/** Deeply nested YAML stays in one block */
export const fb2_deeplyNestedYaml = makeRaw([
  'apiVersion: v1',
  'kind: ConfigMap',
  'metadata:',
  '  name: deep',
  'data:',
  '  config: |',
  '    level1:',
  '      level2:',
  '        level3:',
  '          level4:',
  '            level5:',
  '              level6: value',
]);

/** Bold heading then blank line then YAML panel */
export const fb2_headingBlankLinePanel = makeRaw([
  panelBlank(),
  '                             values.yaml',
  panelBlank(),
  '',
  panelLine('replicaCount: 3'),
  panelLine('image:'),
  panelLine('  repository: nginx'),
]);

/** Closing brace at column 0 after code block */
export const fb2_closingBrace = makeRaw(['fn main() {', '    println!("Hello, world!");', '}']);

/** Consecutive blank panel lines */
export const fb2_consecutiveBlanks = makeRaw([
  panelBlank(),
  panelLine('line one'),
  panelBlank(),
  panelBlank(),
  panelBlank(),
  panelLine('line two'),
  panelBlank(),
]);

/** README.md heading with markdown content in panels */
export const fb2_readmeMdContent = makeRaw([
  panelBlank(),
  '                             README.md',
  panelBlank(),
  panelLine('# My Project'),
  panelLine(''),
  panelLine('This is a readme.'),
]);

/** ANSI bold inside panel content — manually built (not via panelLine) to embed \x1b[1m bold inside content */
export const fb2_ansiBoldPanel = makeRaw([
  panelBlank(),
  `\x1b[40m \x1b[0m\x1b[97;40m${'\x1b[1mImportant\x1b[0m: Run this command'.padEnd(
    78
  )}\x1b[0m\x1b[40m \x1b[0m`,
  panelBlank(),
]);

/** Two bare apiVersion blocks with no separator */
export const fb2_twoApiVersionBlocks = makeRaw([
  'apiVersion: v1',
  'kind: Namespace',
  'metadata:',
  '  name: ns1',
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: deploy1',
]);

/** File heading path with double slash */
export const fb2_doubleSlashPath = makeRaw([
  panelBlank(),
  '                             src//main.rs',
  panelBlank(),
  panelLine('fn main() {}'),
]);

/** Panel content starting with bullet dash item */
export const fb2_panelDashList = makeRaw([
  panelBlank(),
  panelLine('- name: nginx'),
  panelLine('  image: nginx:latest'),
  panelLine('- name: redis'),
  panelLine('  image: redis:7'),
  panelBlank(),
]);

/** Bare python import at column 0 */
export const fb2_pythonImport = makeRaw(['import os', 'import sys', 'from pathlib import Path']);

/** Prose lines with word-colon pattern and many words */
export const fb2_proseWordColon = makeRaw([
  'Here: is a sentence that has lots of words after the colon.',
  'Another: sentence also has a very long tail with many words.',
  'Third: this one likewise has a very long sequence of words.',
]);

/** File heading with spaces in path */
export const fb2_spacesInPath = makeRaw(['My App/config.yaml', '', 'Edit the config file above.']);

/** Literal backslash-x1b text in panel content */
export const fb2_literalEscapeText = makeRaw([
  panelBlank(),
  panelLine('Use \\x1b[31m for red text'),
  panelBlank(),
]);

/** YAML key split across lines by terminal wrapping */
export const fb2_yamlKeySplit = makeRaw([
  'apiVersion: autoscaling/v2',
  'kind: HorizontalPodAutoscaler',
  'spec:',
  '  metrics:',
  '    - type: Resource',
  '      resource:',
  '        name: cpu',
  '        target:',
  '          type: Utilization',
  '          averageUtilization',
  ': 70',
]);

// ===========================================================================
// Round 3 – findbugs3.test.ts
// ===========================================================================

/** Heredoc with quoted delimiter <<'YAML' */
export const fb3_heredocQuotedDelim = makeRaw([
  "cat <<'YAML'",
  'apiVersion: v1',
  'kind: Service',
  'YAML',
]);

/** Bare YAML list with nested keys at column 0 */
export const fb3_bareYamlList = makeRaw([
  '- name: nginx',
  '  image: nginx:latest',
  '  ports:',
  '    - containerPort: 80',
  '- name: redis',
  '  image: redis:7',
]);

/** Numbered list with periods and interleaved code panels */
export const fb3_numberedListPanels = makeRaw([
  '1. Create the file:',
  panelBlank(),
  panelLine('touch app.yaml'),
  panelBlank(),
  '2. Edit it:',
  panelBlank(),
  panelLine('vim app.yaml'),
  panelBlank(),
]);

/** Makefile with .PHONY and multiple targets */
export const fb3_makefilePhony = makeRaw([
  panelBlank(),
  panelLine('.PHONY: build test clean'),
  panelBlank(),
  panelLine('build:'),
  panelLine('\tgo build -o app .'),
  panelBlank(),
  panelLine('test:'),
  panelLine('\tgo test ./...'),
  panelBlank(),
  panelLine('clean:'),
  panelLine('\trm -f app'),
  panelBlank(),
]);

/** tee heredoc for K8s manifest creation */
export const fb3_teeHeredoc = makeRaw([
  'kubectl apply -f - <<EOF',
  'apiVersion: v1',
  'kind: Namespace',
  'metadata:',
  '  name: test',
  'EOF',
]);

/** CSS code in panel should be wrapped */
export const fb3_cssPanel = makeRaw([
  panelBlank(),
  panelLine('body {'),
  panelLine('  margin: 0;'),
  panelLine('  padding: 0;'),
  panelLine('}'),
  panelBlank(),
]);

/** SQL query in panel should be wrapped */
export const fb3_sqlPanel = makeRaw([
  panelBlank(),
  panelLine('SELECT name, age'),
  panelLine('FROM users'),
  panelLine('WHERE age > 18'),
  panelLine('ORDER BY name;'),
  panelBlank(),
]);

/** Prose between two code panels stays as prose */
export const fb3_proseBetweenPanels = makeRaw([
  panelBlank(),
  panelLine('kubectl get pods'),
  panelBlank(),
  'Then check the logs with this command:',
  panelBlank(),
  panelLine('kubectl logs pod-name'),
  panelBlank(),
]);

/** Bare JSON array output wrapped in code block */
export const fb3_bareJsonArray = makeRaw([
  '[',
  '  {',
  '    "name": "pod-1",',
  '    "status": "Running"',
  '  },',
  '  {',
  '    "name": "pod-2",',
  '    "status": "Pending"',
  '  }',
  ']',
]);

/** Multiple heredocs in one response */
export const fb3_multipleHeredocs = makeRaw([
  'cat > namespace.yaml <<EOF',
  'apiVersion: v1',
  'kind: Namespace',
  'metadata:',
  '  name: test',
  'EOF',
  '',
  'cat > deployment.yaml <<EOF',
  'apiVersion: apps/v1',
  'kind: Deployment',
  'metadata:',
  '  name: web',
  'EOF',
]);

// ===========================================================================
// Round 4 – findbugs4.test.ts
// ===========================================================================

/** Shell heredoc with <<-EOF keeps YAML body in same block */
export const fb4_heredocDashEof = makeRaw([
  'cat <<-EOF',
  'apiVersion: v1',
  'kind: ConfigMap',
  'EOF',
]);

/** YAML merge-key line <<: *defaults stays inside yaml block */
export const fb4_yamlMergeKey = makeRaw([
  panelBlank(),
  panelLine('defaults: &defaults'),
  panelLine('  image: nginx'),
  panelLine('deployment:'),
  panelLine('  <<: *defaults'),
  panelBlank(),
]);

/** Makefile .PHONY and dependency targets stay in one code block */
export const fb4_makefilePhonyDeps = makeRaw([
  panelBlank(),
  panelLine('.PHONY: build deps clean'),
  panelLine('build: deps'),
  panelLine('\tgo build ./...'),
  panelLine('deps:'),
  panelLine('\tgo mod download'),
  panelBlank(),
]);

/** Lowercase SQL panel content stays in one code block */
export const fb4_lowercaseSql = makeRaw([
  panelBlank(),
  panelLine('select name, age'),
  panelLine('from users'),
  panelLine('where age > 18'),
  panelBlank(),
]);

/** Dockerfile panel with image tag keeps following lines in same block */
export const fb4_dockerfileImageTag = makeRaw([
  panelBlank(),
  panelLine('FROM gcr.io/distroless/cc-debian12:nonroot'),
  panelLine('WORKDIR /app'),
  panelLine('COPY --from=builder /app/bin /app/bin'),
  panelBlank(),
]);

// ===========================================================================
// Round 5 – findbugs5.test.ts
// ===========================================================================

/** C/C++ #include headers stay in one code block */
export const fb5_cIncludeHeaders = makeRaw([
  panelBlank(),
  panelLine('#include <stdio.h>'),
  panelLine('#include <stdlib.h>'),
  panelLine(''),
  panelLine('int main() {'),
  panelLine('    printf("Hello\\n");'),
  panelLine('    return 0;'),
  panelLine('}'),
  panelBlank(),
]);

/** Rust match arms with => are not converted to ordered lists */
export const fb5_rustMatchArms = makeRaw([
  panelBlank(),
  panelLine('match status {'),
  panelLine('    200 => println!("ok"),'),
  panelLine('    404 => println!("not found"),'),
  panelLine('    500 => println!("error"),'),
  panelLine('    _ => println!("unknown"),'),
  panelLine('}'),
  panelBlank(),
]);

/** Shell backslash continuation stays in one code block */
export const fb5_shellBackslashContinuation = makeRaw([
  panelBlank(),
  panelLine('docker run \\'),
  panelLine('  --name mycontainer \\'),
  panelLine('  -p 8080:80 \\'),
  panelLine('  -d nginx:latest'),
  panelBlank(),
]);

/** TypeScript interface is not split by YAML detection */
export const fb5_tsInterface = makeRaw([
  panelBlank(),
  panelLine('interface User {'),
  panelLine('  name: string;'),
  panelLine('  age: number;'),
  panelLine('  email: string;'),
  panelLine('}'),
  panelBlank(),
]);

/** JSON object in Rich panel keeps all content in code blocks */
export const fb5_jsonObject = makeRaw([
  panelBlank(),
  panelLine('{'),
  panelLine('  "apiVersion": "v1",'),
  panelLine('  "kind": "Pod",'),
  panelLine('  "metadata": {'),
  panelLine('    "name": "test-pod"'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
]);

/** Python triple-quote string with YAML-like content stays in one block */
export const fb5_pythonTripleQuoteYaml = makeRaw([
  panelBlank(),
  panelLine('yaml_template = """'),
  panelLine('apiVersion: v1'),
  panelLine('kind: ConfigMap'),
  panelLine('metadata:'),
  panelLine('  name: my-config'),
  panelLine('"""'),
  panelBlank(),
]);

/** Go struct with JSON tags stays in one code block */
export const fb5_goStructJsonTags = makeRaw([
  panelBlank(),
  panelLine('type Pod struct {'),
  panelLine('    Name      string `json:"name"`'),
  panelLine('    Namespace string `json:"namespace"`'),
  panelLine('    Status    string `json:"status"`'),
  panelLine('}'),
  panelBlank(),
]);

/** kubectl get pods output stays in one code block */
export const fb5_kubectlGetPods = makeRaw([
  panelBlank(),
  panelLine('NAME                          READY   STATUS    RESTARTS   AGE'),
  panelLine('nginx-deployment-abc123-xyz   1/1     Running   0          5d'),
  panelLine('nginx-deployment-abc123-def   1/1     Running   0          5d'),
  panelLine('redis-master-0                1/1     Running   0          10d'),
  panelBlank(),
]);

/** Prose with panel code gets first code block wrapped */
export const fb5_proseWithPanelCode = makeRaw([
  'First, install the dependencies:',
  '',
  panelBlank(),
  panelLine('npm install express'),
  panelBlank(),
  '',
  'Then create the server:',
  '',
  panelBlank(),
  panelLine('const app = require("express")();'),
  panelLine('app.listen(3000);'),
  panelBlank(),
]);

/** YAML with boolean and numeric values stays in one block */
export const fb5_yamlBooleanValues = makeRaw([
  panelBlank(),
  panelLine('apiVersion: v1'),
  panelLine('kind: ConfigMap'),
  panelLine('data:'),
  panelLine('  debug: "true"'),
  panelLine('  maxRetries: "3"'),
  panelLine('  verbose: "false"'),
  panelBlank(),
]);

/** Shell case statement stays in one code block */
export const fb5_shellCaseStatement = makeRaw([
  panelBlank(),
  panelLine('case "$1" in'),
  panelLine('  start)'),
  panelLine('    echo "Starting..."'),
  panelLine('    ;;'),
  panelLine('  stop)'),
  panelLine('    echo "Stopping..."'),
  panelLine('    ;;'),
  panelLine('esac'),
  panelBlank(),
]);

/** Terraform HCL resource block stays in one code block */
export const fb5_terraformHcl = makeRaw([
  panelBlank(),
  panelLine('resource "azurerm_kubernetes_cluster" "aks" {'),
  panelLine('  name                = "myAKSCluster"'),
  panelLine('  location            = azurerm_resource_group.rg.location'),
  panelLine('  resource_group_name = azurerm_resource_group.rg.name'),
  panelLine('  dns_prefix          = "myaks"'),
  panelLine('}'),
  panelBlank(),
]);

/** Docker Compose YAML stays in one block */
export const fb5_dockerComposeYaml = makeRaw([
  panelBlank(),
  panelLine('version: "3.8"'),
  panelLine('services:'),
  panelLine('  web:'),
  panelLine('    image: nginx:latest'),
  panelLine('    ports:'),
  panelLine('      - "8080:80"'),
  panelLine('  db:'),
  panelLine('    image: postgres:15'),
  panelLine('    environment:'),
  panelLine('      POSTGRES_PASSWORD: secret'),
  panelBlank(),
]);

/** Rust with lifetime annotations has code in blocks */
export const fb5_rustLifetimes = makeRaw([
  panelBlank(),
  panelLine("fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {"),
  panelLine('    if x.len() > y.len() {'),
  panelLine('        x'),
  panelLine('    } else {'),
  panelLine('        y'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
]);

/** Numbered steps with shell commands render correctly */
export const fb5_numberedStepsShell = makeRaw([
  '1. Create the namespace:',
  '',
  panelBlank(),
  panelLine('kubectl create namespace prod'),
  panelBlank(),
  '',
  '2. Deploy the application:',
  '',
  panelBlank(),
  panelLine('kubectl apply -f deployment.yaml -n prod'),
  panelBlank(),
  '',
  '3. Check status:',
  '',
  panelBlank(),
  panelLine('kubectl get pods -n prod'),
  panelBlank(),
]);

// ===========================================================================
// Round 6 – findbugs6.test.ts
// ===========================================================================

/** Java try-catch-finally stays in one code block */
export const fb6_javaTryCatchFinally = makeRaw([
  'Here is the error handling:',
  '',
  panelLine('try {'),
  panelLine('    String result = fetchData();'),
  panelLine('    process(result);'),
  panelLine('} catch (IOException e) {'),
  panelLine('    log.error("Failed", e);'),
  panelLine('} finally {'),
  panelLine('    cleanup();'),
  panelLine('}'),
  panelBlank(),
]);

/** Print/log statements detected as code */
export const fb6_printLogStatements = makeRaw([
  'Debug the output:',
  '',
  panelLine('console.log("hello world");'),
  panelLine('fmt.Println("hello from Go")'),
  panelLine('println!("hello from Rust");'),
  panelLine('print("hello from Python")'),
  panelBlank(),
]);

/** Arrow functions and modern JS syntax in code block */
export const fb6_arrowFunctions = makeRaw([
  'Create the handler:',
  '',
  panelLine('const handler = async (req, res) => {'),
  panelLine('  const data = await fetchData(req.params.id);'),
  panelLine('  res.json({ status: "ok", data });'),
  panelLine('};'),
  panelBlank(),
]);

/** TypeScript interface with colon-typed members stays in code block */
export const fb6_tsInterfaceColonMembers = makeRaw([
  'Define the interface:',
  '',
  panelLine('interface PodStatus {'),
  panelLine('  name: string;'),
  panelLine('  namespace: string;'),
  panelLine('  ready: boolean;'),
  panelLine('  restartCount: number;'),
  panelLine('}'),
  panelBlank(),
]);

/** Shell until loop stays in one code block */
export const fb6_shellUntilLoop = makeRaw([
  'Wait for the pod:',
  '',
  panelLine('until kubectl get pod myapp -o jsonpath="{.status.phase}" | grep -q Running; do'),
  panelLine('  echo "Waiting for pod..."'),
  panelLine('  sleep 5'),
  panelLine('done'),
  panelBlank(),
]);

/** Prose between two code blocks keeps them separate */
export const fb6_proseBetweenCodeBlocks = makeRaw([
  'First, create the namespace:',
  '',
  panelLine('kubectl create namespace production'),
  panelBlank(),
  '',
  'Then deploy the application:',
  '',
  panelLine('kubectl apply -f deployment.yaml -n production'),
  panelBlank(),
]);

/** Python f-string with braces stays in code block */
export const fb6_pythonFStringBraces = makeRaw([
  'Log the request:',
  '',
  panelLine('logger.info(f"Request to {endpoint} returned {status_code}")'),
  panelLine('logger.debug(f"Headers: {dict(response.headers)}")'),
  panelLine('logger.error(f"Failed after {retries} retries: {str(err)}")'),
  panelBlank(),
]);

/** K8s YAML with anchors and aliases stays in one block */
export const fb6_yamlAnchorsAliases = makeRaw([
  'Use YAML anchors for shared config:',
  '',
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: Deployment'),
  panelLine('metadata:'),
  panelLine('  name: myapp'),
  panelLine('spec:'),
  panelLine('  template:'),
  panelLine('    spec:'),
  panelLine('      containers:'),
  panelLine('        - name: app'),
  panelLine('          resources: &default_resources'),
  panelLine('            requests:'),
  panelLine('              cpu: 100m'),
  panelLine('              memory: 128Mi'),
  panelLine('            limits:'),
  panelLine('              cpu: 500m'),
  panelLine('              memory: 512Mi'),
  panelBlank(),
]);

/** Rust enum with derive and variants stays in one block */
export const fb6_rustEnumDerive = makeRaw([
  'Define the error type:',
  '',
  panelLine('#[derive(Debug, thiserror::Error)]'),
  panelLine('pub enum AppError {'),
  panelLine('    #[error("not found: {0}")]'),
  panelLine('    NotFound(String),'),
  panelLine('    #[error("unauthorized")]'),
  panelLine('    Unauthorized,'),
  panelLine('    #[error("internal: {0}")]'),
  panelLine('    Internal(#[from] anyhow::Error),'),
  panelLine('}'),
  panelBlank(),
]);

/** Shell if/elif/else/fi stays in one block */
export const fb6_shellIfElifElse = makeRaw([
  'Check the cluster status:',
  '',
  panelLine('if kubectl cluster-info &>/dev/null; then'),
  panelLine('  echo "Cluster is running"'),
  panelLine('elif az aks show -g mygroup -n mycluster &>/dev/null; then'),
  panelLine('  echo "AKS exists but not configured"'),
  panelLine('else'),
  panelLine('  echo "No cluster found"'),
  panelLine('  exit 1'),
  panelLine('fi'),
  panelBlank(),
]);

/** Go goroutine with channel stays in code block */
export const fb6_goGoroutineChannel = makeRaw([
  'Run background worker:',
  '',
  panelLine('func worker(jobs <-chan int, results chan<- int) {'),
  panelLine('    for j := range jobs {'),
  panelLine('        fmt.Println("processing job", j)'),
  panelLine('        time.Sleep(time.Second)'),
  panelLine('        results <- j * 2'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
]);

/** Docker run with backslash continuation stays together */
export const fb6_dockerRunBackslash = makeRaw([
  'Run the container:',
  '',
  panelLine('docker run -d \\'),
  panelLine('  --name myapp \\'),
  panelLine('  --restart unless-stopped \\'),
  panelLine('  -p 8080:8080 \\'),
  panelLine('  -e DATABASE_URL="postgres://localhost/db" \\'),
  panelLine('  -v /data:/app/data \\'),
  panelLine('  myimage:latest'),
  panelBlank(),
]);

/** Java annotations and class stay in one block */
export const fb6_javaAnnotationsClass = makeRaw([
  'Create the controller:',
  '',
  panelLine('@RestController'),
  panelLine('@RequestMapping("/api/users")'),
  panelLine('public class UserController {'),
  panelLine('    @Autowired'),
  panelLine('    private UserService userService;'),
  panelLine(''),
  panelLine('    @GetMapping("/{id}")'),
  panelLine('    public ResponseEntity<User> getUser(@PathVariable Long id) {'),
  panelLine('        return ResponseEntity.ok(userService.findById(id));'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
]);

/** kubectl patch with inline JSON stays in one block */
export const fb6_kubectlPatchJson = makeRaw([
  'Scale the deployment:',
  '',
  panelLine('kubectl patch deployment myapp -p \'{"spec":{"replicas":5}}\''),
  panelLine('kubectl rollout status deployment/myapp'),
  panelLine('kubectl get pods -l app=myapp -o wide'),
  panelBlank(),
]);

/** YAML and shell blocks separated by prose */
export const fb6_yamlShellProseSeparated = makeRaw([
  'Save this as service.yaml:',
  '',
  panelLine('apiVersion: v1'),
  panelLine('kind: Service'),
  panelLine('metadata:'),
  panelLine('  name: myapp-svc'),
  panelLine('spec:'),
  panelLine('  type: LoadBalancer'),
  panelLine('  ports:'),
  panelLine('    - port: 80'),
  panelLine('      targetPort: 8080'),
  panelBlank(),
  '',
  'Then apply it:',
  '',
  panelLine('kubectl apply -f service.yaml'),
  panelLine('kubectl get svc myapp-svc'),
  panelBlank(),
]);

// ===========================================================================
// Round 7 – findbugs7.test.ts
// ===========================================================================

/** Lua code with local and function detected as code */
export const fb7_luaLocalFunction = makeRaw([
  'Create the Lua module:',
  '',
  panelLine('local M = {}'),
  panelLine(''),
  panelLine('function M.setup(opts)'),
  panelLine('  opts = opts or {}'),
  panelLine('  M.debug = opts.debug or false'),
  panelLine('  return M'),
  panelLine('end'),
  panelBlank(),
]);

/** Export environment variables detected as shell code */
export const fb7_exportEnvVars = makeRaw([
  'Set environment variables:',
  '',
  panelLine('export KUBECONFIG=~/.kube/config'),
  panelLine('export CLUSTER_NAME=my-aks-cluster'),
  panelLine('export RESOURCE_GROUP=my-rg'),
  panelLine('export REGISTRY=myacr.azurecr.io'),
  panelBlank(),
]);

/** awk and sed commands detected as code */
export const fb7_awkSedCommands = makeRaw([
  'Parse the logs:',
  '',
  panelLine("kubectl logs myapp | awk '{print $1, $NF}'"),
  panelLine("kubectl get pods -o json | jq '.items[].metadata.name'"),
  panelLine("sed -i 's/replicas: 1/replicas: 3/g' deployment.yaml"),
  panelBlank(),
]);

/** CSS rules detected as code block */
export const fb7_cssRules = makeRaw([
  'Add these styles:',
  '',
  panelLine('.container {'),
  panelLine('  display: flex;'),
  panelLine('  justify-content: center;'),
  panelLine('  align-items: center;'),
  panelLine('  min-height: 100vh;'),
  panelLine('}'),
  panelBlank(),
]);

/** Protobuf message definition detected as code */
export const fb7_protobufMessage = makeRaw([
  'Define the protobuf message:',
  '',
  panelLine('syntax = "proto3";'),
  panelLine(''),
  panelLine('message PodMetrics {'),
  panelLine('  string name = 1;'),
  panelLine('  string namespace = 2;'),
  panelLine('  repeated ContainerMetrics containers = 3;'),
  panelLine('}'),
  panelBlank(),
]);

/** Systemd unit file stays in one block */
export const fb7_systemdUnitFile = makeRaw([
  'Create the service file:',
  '',
  panelLine('[Unit]'),
  panelLine('Description=My Application'),
  panelLine('After=network.target'),
  panelLine(''),
  panelLine('[Service]'),
  panelLine('Type=simple'),
  panelLine('ExecStart=/usr/bin/myapp'),
  panelLine('Restart=always'),
  panelLine(''),
  panelLine('[Install]'),
  panelLine('WantedBy=multi-user.target'),
  panelBlank(),
]);

/** Shell pipe chain with line continuations stays together */
export const fb7_shellPipeChain = makeRaw([
  'Find the top pods:',
  '',
  panelLine('kubectl get pods --all-namespaces -o json \\'),
  panelLine("  | jq '.items[] | {name: .metadata.name, cpu: .spec.containers[].resources}' \\"),
  panelLine('  | sort -k2 -rn \\'),
  panelLine('  | head -10'),
  panelBlank(),
]);

/** Shell script with variables and commands stays together */
export const fb7_shellScriptVarsCommands = makeRaw([
  'Run the deploy script:',
  '',
  panelLine('#!/bin/bash'),
  panelLine('set -euo pipefail'),
  panelLine(''),
  panelLine('IMAGE="${REGISTRY}/${APP_NAME}:${VERSION}"'),
  panelLine('docker build -t "$IMAGE" .'),
  panelLine('docker push "$IMAGE"'),
  panelLine('kubectl set image deployment/${APP_NAME} app="$IMAGE"'),
  panelBlank(),
]);

/** JSON configuration object stays in one block */
export const fb7_jsonConfigObject = makeRaw([
  'Add this to package.json scripts:',
  '',
  panelLine('{'),
  panelLine('  "scripts": {'),
  panelLine('    "start": "node server.js",'),
  panelLine('    "build": "tsc && npm run bundle",'),
  panelLine('    "test": "vitest run",'),
  panelLine('    "lint": "eslint src/"'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
]);

/** Ruby class with methods stays in one block */
export const fb7_rubyClassMethods = makeRaw([
  'Create the Ruby model:',
  '',
  panelLine('class KubernetesClient'),
  panelLine('  def initialize(config)'),
  panelLine('    @config = config'),
  panelLine('    @client = Kubeclient::Client.new(config.api_endpoint)'),
  panelLine('  end'),
  panelLine(''),
  panelLine('  def get_pods(namespace)'),
  panelLine('    @client.get_pods(namespace: namespace)'),
  panelLine('  end'),
  panelLine('end'),
  panelBlank(),
]);

/** Kotlin data class detected as code */
export const fb7_kotlinDataClass = makeRaw([
  'Define the data class:',
  '',
  panelLine('data class PodInfo('),
  panelLine('    val name: String,'),
  panelLine('    val namespace: String,'),
  panelLine('    val status: String,'),
  panelLine('    val restarts: Int = 0'),
  panelLine(')'),
  panelBlank(),
]);

/** C struct typedef stays in one code block */
export const fb7_cStructTypedef = makeRaw([
  'Define the struct:',
  '',
  panelLine('typedef struct {'),
  panelLine('    char name[256];'),
  panelLine('    int port;'),
  panelLine('    int replicas;'),
  panelLine('    bool ready;'),
  panelLine('} ServiceConfig;'),
  panelBlank(),
]);

/** az CLI commands with JMESPath queries stay in one block */
export const fb7_azCliJmesPath = makeRaw([
  'Query the AKS cluster:',
  '',
  panelLine('az aks show \\'),
  panelLine('  --resource-group mygroup \\'),
  panelLine('  --name mycluster \\'),
  panelLine("  --query '{name:name, state:powerState.code, k8s:kubernetesVersion}' \\"),
  panelLine('  --output table'),
  panelBlank(),
]);

/** Python async function with type hints stays in one block */
export const fb7_pythonAsyncTypeHints = makeRaw([
  'Create the async handler:',
  '',
  panelLine('async def get_pods('),
  panelLine('    client: KubernetesClient,'),
  panelLine('    namespace: str = "default",'),
  panelLine(') -> list[dict[str, Any]]:'),
  panelLine('    pods = await client.list_pods(namespace=namespace)'),
  panelLine('    return [{"name": p.name, "status": p.status} for p in pods]'),
  panelBlank(),
]);

/** Numbered steps with code blocks render separately */
export const fb7_numberedStepsCodeBlocks = makeRaw([
  '1. Create the secret:',
  '',
  panelLine('kubectl create secret generic db-creds \\'),
  panelLine('  --from-literal=username=admin \\'),
  panelLine('  --from-literal=password=s3cret'),
  panelBlank(),
  '',
  '2. Apply the deployment:',
  '',
  panelLine('kubectl apply -f deployment.yaml'),
  panelBlank(),
  '',
  '3. Verify everything is running:',
  '',
  panelLine('kubectl get all -n production'),
  panelBlank(),
]);

// ===========================================================================
// Round 8 – findbugs8.test.ts
// ===========================================================================

/** Go struct literal with field: value stays in code block */
export const fb8_goStructLiteral = makeRaw([
  'Create the config:',
  '',
  panelLine('config := &Config{'),
  panelLine('    Host:     "localhost",'),
  panelLine('    Port:     8080,'),
  panelLine('    Debug:    true,'),
  panelLine('    MaxConns: 100,'),
  panelLine('}'),
  panelBlank(),
]);

/** Python function call with kwargs stays in code block */
export const fb8_pythonKwargs = makeRaw([
  'Configure logging:',
  '',
  panelLine('logging.basicConfig('),
  panelLine('    level=logging.DEBUG,'),
  panelLine('    format="%(asctime)s %(levelname)s %(message)s",'),
  panelLine('    handlers=['),
  panelLine('        logging.StreamHandler(),'),
  panelLine('        logging.FileHandler("app.log"),'),
  panelLine('    ]'),
  panelLine(')'),
  panelBlank(),
]);

/** Shell trap and source commands detected as code */
export const fb8_shellTrapSource = makeRaw([
  'Set up signal handling:',
  '',
  panelLine('#!/bin/bash'),
  panelLine('source /etc/profile.d/kubernetes.sh'),
  panelLine(''),
  panelLine('trap "kubectl delete pod cleanup-$$" EXIT'),
  panelLine('trap "echo interrupted; exit 1" INT TERM'),
  panelLine(''),
  panelLine('kubectl run cleanup-$$ --image=busybox -- sleep 3600'),
  panelBlank(),
]);

/** GitHub Actions YAML workflow stays in one block */
export const fb8_githubActionsYaml = makeRaw([
  'Add this workflow:',
  '',
  panelLine('name: Deploy'),
  panelLine('on:'),
  panelLine('  push:'),
  panelLine('    branches: [main]'),
  panelLine('jobs:'),
  panelLine('  deploy:'),
  panelLine('    runs-on: ubuntu-latest'),
  panelLine('    steps:'),
  panelLine('      - uses: actions/checkout@v4'),
  panelLine('      - name: Deploy to AKS'),
  panelLine('        run: kubectl apply -f k8s/'),
  panelBlank(),
]);

/** Rust closures and iterator chains stay in one block */
export const fb8_rustClosuresIterators = makeRaw([
  'Process the data:',
  '',
  panelLine('let results: Vec<String> = items'),
  panelLine('    .iter()'),
  panelLine('    .filter(|item| item.active)'),
  panelLine('    .map(|item| format!("{}: {}", item.name, item.value))'),
  panelLine('    .collect();'),
  panelBlank(),
]);

/** Shell heredoc with YAML content stays in one block */
export const fb8_shellHeredocYaml = makeRaw([
  'Create the config:',
  '',
  panelLine('cat <<EOF | kubectl apply -f -'),
  panelLine('apiVersion: v1'),
  panelLine('kind: ConfigMap'),
  panelLine('metadata:'),
  panelLine('  name: app-config'),
  panelLine('data:'),
  panelLine('  DATABASE_URL: postgres://localhost/mydb'),
  panelLine('EOF'),
  panelBlank(),
]);

/** Docker Compose with build context stays in one block */
export const fb8_dockerComposeBuildContext = makeRaw([
  'Create docker-compose.yaml:',
  '',
  panelLine('version: "3.8"'),
  panelLine('services:'),
  panelLine('  api:'),
  panelLine('    build:'),
  panelLine('      context: .'),
  panelLine('      dockerfile: Dockerfile'),
  panelLine('      args:'),
  panelLine('        - RUST_VERSION=1.76'),
  panelLine('    ports:'),
  panelLine('      - "8080:8080"'),
  panelLine('    environment:'),
  panelLine('      - DATABASE_URL=postgres://db:5432/myapp'),
  panelLine('    depends_on:'),
  panelLine('      - db'),
  panelBlank(),
]);

/** Shell function definition stays in one block */
export const fb8_shellFunctionDef = makeRaw([
  'Add the helper function:',
  '',
  panelLine('check_pod_ready() {'),
  panelLine('  local pod=$1'),
  panelLine('  local ns=${2:-default}'),
  panelLine('  local status'),
  panelLine('  status=$(kubectl get pod "$pod" -n "$ns" -o jsonpath="{.status.phase}")'),
  panelLine('  [ "$status" = "Running" ]'),
  panelLine('}'),
  panelBlank(),
]);

/** Python nested expressions stay in code block */
export const fb8_pythonNestedExpressions = makeRaw([
  'Process pods:',
  '',
  panelLine('import json'),
  panelLine('from kubernetes import client, config'),
  panelLine(''),
  panelLine('config.load_kube_config()'),
  panelLine('v1 = client.CoreV1Api()'),
  panelLine('pods = v1.list_namespaced_pod("default")'),
  panelLine('names = [p.metadata.name for p in pods.items if p.status.phase == "Running"]'),
  panelLine('print(json.dumps(names, indent=2))'),
  panelBlank(),
]);

/** Terraform with multiple resource types stays in one block */
export const fb8_terraformMultipleResources = makeRaw([
  'Add the Terraform config:',
  '',
  panelLine('provider "azurerm" {'),
  panelLine('  features {}'),
  panelLine('}'),
  panelLine(''),
  panelLine('resource "azurerm_kubernetes_cluster" "aks" {'),
  panelLine('  name                = "myaks"'),
  panelLine('  location            = "eastus"'),
  panelLine('  resource_group_name = azurerm_resource_group.rg.name'),
  panelLine('  dns_prefix          = "myaks"'),
  panelLine(''),
  panelLine('  default_node_pool {'),
  panelLine('    name       = "default"'),
  panelLine('    node_count = 3'),
  panelLine('    vm_size    = "Standard_DS2_v2"'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
]);

/** SQL JOIN query stays in one code block */
export const fb8_sqlJoinQuery = makeRaw([
  'Query the data:',
  '',
  panelLine('SELECT'),
  panelLine('    p.name,'),
  panelLine('    p.namespace,'),
  panelLine('    n.capacity_cpu,'),
  panelLine('    n.capacity_memory'),
  panelLine('FROM pods p'),
  panelLine('INNER JOIN nodes n ON p.node_name = n.name'),
  panelLine("WHERE p.status = 'Running'"),
  panelLine('ORDER BY p.name ASC'),
  panelLine('LIMIT 50;'),
  panelBlank(),
]);

/** K8s CRD definition stays in one YAML block */
export const fb8_k8sCrdDefinition = makeRaw([
  'Create the CRD:',
  '',
  panelLine('apiVersion: apiextensions.k8s.io/v1'),
  panelLine('kind: CustomResourceDefinition'),
  panelLine('metadata:'),
  panelLine('  name: databases.myapp.io'),
  panelLine('spec:'),
  panelLine('  group: myapp.io'),
  panelLine('  versions:'),
  panelLine('    - name: v1'),
  panelLine('      served: true'),
  panelLine('      storage: true'),
  panelLine('      schema:'),
  panelLine('        openAPIV3Schema:'),
  panelLine('          type: object'),
  panelLine('          properties:'),
  panelLine('            spec:'),
  panelLine('              type: object'),
  panelBlank(),
]);

/** Swift struct with properties stays in code block */
export const fb8_swiftStructProperties = makeRaw([
  'Define the model:',
  '',
  panelLine('struct PodInfo: Codable {'),
  panelLine('    let name: String'),
  panelLine('    let namespace: String'),
  panelLine('    let status: String'),
  panelLine('    var isReady: Bool {'),
  panelLine('        status == "Running"'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
]);

/** Makefile with ifeq conditional stays in one block */
export const fb8_makefileIfeq = makeRaw([
  'Create the Makefile:',
  '',
  panelLine('REGISTRY ?= docker.io'),
  panelLine('TAG ?= latest'),
  panelLine(''),
  panelLine('ifeq ($(CI),true)'),
  panelLine('  TAG := $(shell git rev-parse --short HEAD)'),
  panelLine('endif'),
  panelLine(''),
  panelLine('.PHONY: build'),
  panelLine('build:'),
  panelLine('\tdocker build -t $(REGISTRY)/myapp:$(TAG) .'),
  panelBlank(),
]);

/** Elixir module with functions stays in one block */
export const fb8_elixirModule = makeRaw([
  'Create the module:',
  '',
  panelLine('defmodule MyApp.K8sClient do'),
  panelLine('  def get_pods(namespace \\\\ "default") do'),
  panelLine('    {:ok, pods} = K8s.Client.list("v1", "Pod", namespace: namespace)'),
  panelLine('    Enum.map(pods, &(&1["metadata"]["name"]))'),
  panelLine('  end'),
  panelLine('end'),
  panelBlank(),
]);

// ===========================================================================
// Round 9 – findbugs9.test.ts
// ===========================================================================

/** TypeScript generic types not confused with HTML tags */
export const fb9_tsGenericTypes = makeRaw([
  'Create the type-safe client:',
  '',
  panelLine('const client = new KubernetesClient<PodSpec>({'),
  panelLine('  namespace: "default",'),
  panelLine('  timeout: 30000,'),
  panelLine('});'),
  panelLine('const pods = await client.list<Pod>();'),
  panelBlank(),
]);

/** PHP class with namespace stays in one block */
export const fb9_phpClassNamespace = makeRaw([
  'Create the controller:',
  '',
  panelLine('<?php'),
  panelLine('namespace App\\Controllers;'),
  panelLine(''),
  panelLine('class PodController extends Controller'),
  panelLine('{'),
  panelLine('    public function index(): JsonResponse'),
  panelLine('    {'),
  panelLine("        $pods = $this->k8s->getPods('default');"),
  panelLine('        return response()->json($pods);'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
]);

/** Scala case class detected as code */
export const fb9_scalaCaseClass = makeRaw([
  'Define the model:',
  '',
  panelLine('case class Pod('),
  panelLine('  name: String,'),
  panelLine('  namespace: String,'),
  panelLine('  status: String'),
  panelLine(')'),
  panelLine(''),
  panelLine('object PodService {'),
  panelLine('  def listPods(ns: String): List[Pod] = {'),
  panelLine('    client.pods.inNamespace(ns).list().getItems.asScala.toList'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
]);

/** Shell arrays and parameter expansion stay in code block */
export const fb9_shellArraysParamExpansion = makeRaw([
  'Deploy to multiple namespaces:',
  '',
  panelLine('NAMESPACES=(staging production canary)'),
  panelLine(''),
  panelLine('for ns in "${NAMESPACES[@]}"; do'),
  panelLine('  echo "Deploying to $ns..."'),
  panelLine('  kubectl apply -f manifests/ -n "$ns"'),
  panelLine('  kubectl rollout status deployment/myapp -n "$ns"'),
  panelLine('done'),
  panelBlank(),
]);

/** INI config file detected as code block */
export const fb9_iniConfigFile = makeRaw([
  'Create the config file:',
  '',
  panelLine('[global]'),
  panelLine('scrape_interval = 15s'),
  panelLine('evaluation_interval = 15s'),
  panelLine(''),
  panelLine('[scrape_config]'),
  panelLine('job_name = "kubernetes-pods"'),
  panelLine('kubernetes_sd_configs = ['),
  panelLine('  {role = "pod"}'),
  panelLine(']'),
  panelBlank(),
]);

/** Rust with turbofish and type annotations stays in code block */
export const fb9_rustTurbofish = makeRaw([
  'Parse the config:',
  '',
  panelLine('let config: Config = serde_json::from_str(&data)?;'),
  panelLine('let items = vec.iter().collect::<Vec<_>>();'),
  panelLine('let count = "42".parse::<u32>().unwrap();'),
  panelBlank(),
]);

/** Python multi-line string stays in code block */
export const fb9_pythonMultiLineString = makeRaw([
  'Create the template:',
  '',
  panelLine('YAML_TEMPLATE = """'),
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: Deployment'),
  panelLine('metadata:'),
  panelLine('  name: {name}'),
  panelLine('  namespace: {namespace}'),
  panelLine('"""'),
  panelBlank(),
]);

/** Java Spring Boot service stays in one block */
export const fb9_javaSpringBootService = makeRaw([
  'Create the service:',
  '',
  panelLine('@Service'),
  panelLine('public class KubeService {'),
  panelLine('    private final ApiClient client;'),
  panelLine(''),
  panelLine('    @Autowired'),
  panelLine('    public KubeService(ApiClient client) {'),
  panelLine('        this.client = client;'),
  panelLine('    }'),
  panelLine(''),
  panelLine('    public List<V1Pod> listPods() throws ApiException {'),
  panelLine('        CoreV1Api api = new CoreV1Api(client);'),
  panelLine('        return api.listNamespacedPod("default",'),
  panelLine('            null, null, null, null, null, null, null, null, null, null)'),
  panelLine('            .getItems();'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
]);

/** Shell with here-string stays in code block */
export const fb9_shellHereString = makeRaw([
  'Parse the JSON:',
  '',
  panelLine('NODES=$(kubectl get nodes -o json)'),
  panelLine(''),
  panelLine('while read -r name status; do'),
  panelLine('  echo "Node: $name ($status)"'),
  panelLine(
    'done <<< $(echo $NODES | jq -r \'.items[] | "\\(.metadata.name) \\(.status.conditions[-1].type)"\')'
  ),
  panelBlank(),
]);

/** curl with JSON body stays in one block */
export const fb9_curlJsonBody = makeRaw([
  'Test the API:',
  '',
  panelLine('curl -X POST http://localhost:8080/api/deploy \\'),
  panelLine("  -H 'Content-Type: application/json' \\"),
  panelLine("  -d '{"),
  panelLine('    "image": "myapp:v2",'),
  panelLine('    "replicas": 3,'),
  panelLine('    "namespace": "production"'),
  panelLine("  }'"),
  panelBlank(),
]);

/** Kotlin suspend function stays in code block */
export const fb9_kotlinSuspendFunction = makeRaw([
  'Create the repository:',
  '',
  panelLine('suspend fun getPods(namespace: String): List<Pod> {'),
  panelLine('    return withContext(Dispatchers.IO) {'),
  panelLine('        client.pods()'),
  panelLine('            .inNamespace(namespace)'),
  panelLine('            .list()'),
  panelLine('            .items'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
]);

/** Terraform locals and data sources stay in one block */
export const fb9_terraformLocalsData = makeRaw([
  'Add the locals:',
  '',
  panelLine('locals {'),
  panelLine('  cluster_name = "${var.prefix}-aks"'),
  panelLine('  tags = {'),
  panelLine('    environment = var.environment'),
  panelLine('    managed_by  = "terraform"'),
  panelLine('  }'),
  panelLine('}'),
  panelLine(''),
  panelLine('data "azurerm_client_config" "current" {}'),
  panelBlank(),
]);

/** Markdown table passes through without code wrapping */
export const fb9_markdownTable = makeRaw([
  'Here are the pod statuses:',
  '',
  '| Name | Status | Restarts |',
  '|------|--------|----------|',
  '| pod-1 | Running | 0 |',
  '| pod-2 | CrashLoopBackOff | 5 |',
  '| pod-3 | Running | 0 |',
]);

/** Shell process substitution stays in code block */
export const fb9_shellProcessSubstitution = makeRaw([
  'Compare configs:',
  '',
  panelLine('diff <(kubectl get cm config-a -o yaml) <(kubectl get cm config-b -o yaml)'),
  panelBlank(),
]);

/** Requirements.txt content stays in code block */
export const fb9_requirementsTxt = makeRaw([
  'Install these dependencies:',
  '',
  panelLine('flask==3.0.0'),
  panelLine('kubernetes==28.1.0'),
  panelLine('requests>=2.31.0'),
  panelLine('gunicorn~=21.2'),
  panelLine('prometheus-client>=0.17'),
  panelBlank(),
]);

// ===========================================================================
// Round 10 – findbugs10.test.ts
// ===========================================================================

/** GitHub Actions YAML branches: [main] not corrupted by ANSI stripping */
export const fb10_ghActionsBranchesMain = makeRaw([
  'Create .github/workflows/deploy.yml:',
  '',
  panelLine('name: Deploy to AKS'),
  panelLine('on:'),
  panelLine('  push:'),
  panelLine('    branches: [main]'),
  panelLine(''),
  panelLine('jobs:'),
  panelLine('  deploy:'),
  panelLine('    runs-on: ubuntu-latest'),
  panelLine('    steps:'),
  panelLine('    - uses: actions/checkout@v4'),
  panelLine('    - run: kubectl apply -f manifests/'),
  panelBlank(),
]);

/** Prometheus [5m] duration selector not corrupted */
export const fb10_prometheusDuration5m = makeRaw([
  'Create alert rule:',
  '',
  panelLine('apiVersion: monitoring.coreos.com/v1'),
  panelLine('kind: PrometheusRule'),
  panelLine('spec:'),
  panelLine('  groups:'),
  panelLine('  - name: alerts'),
  panelLine('    rules:'),
  panelLine('    - alert: HighLatency'),
  panelLine('      expr: histogram_quantile(0.99, rate(http_duration_seconds_bucket[5m])) > 1'),
  panelLine('      for: 10m'),
  panelBlank(),
]);

/** Kustomization YAML in panel gets wrapped in code fence */
export const fb10_kustomizationYaml = makeRaw([
  'Create kustomization.yaml:',
  '',
  panelLine('resources:'),
  panelLine('- deployment.yaml'),
  panelLine('- service.yaml'),
  panelLine('- ingress.yaml'),
  panelLine(''),
  panelLine('namePrefix: prod-'),
  panelLine(''),
  panelLine('commonLabels:'),
  panelLine('  app: my-app'),
  panelLine('  env: production'),
  panelBlank(),
]);

/** Helm values.yaml in panel gets wrapped in code fence */
export const fb10_helmValuesYaml = makeRaw([
  'Create values.yaml:',
  '',
  panelLine('replicaCount: 3'),
  panelLine(''),
  panelLine('image:'),
  panelLine('  repository: myregistry.azurecr.io/myapp'),
  panelLine('  tag: "v1.2.3"'),
  panelLine('  pullPolicy: IfNotPresent'),
  panelLine(''),
  panelLine('service:'),
  panelLine('  type: LoadBalancer'),
  panelLine('  port: 80'),
  panelBlank(),
  '',
  'Install with:',
  '',
  panelLine('helm install my-release ./chart -f values.yaml'),
  panelBlank(),
]);

/** Azure DevOps pipeline YAML in panel gets wrapped */
export const fb10_azureDevOpsPipeline = makeRaw([
  'Create azure-pipelines.yml:',
  '',
  panelLine('trigger:'),
  panelLine('  branches:'),
  panelLine('    include:'),
  panelLine('    - main'),
  panelLine(''),
  panelLine('pool:'),
  panelLine('  vmImage: ubuntu-latest'),
  panelLine(''),
  panelLine('steps:'),
  panelLine('- task: KubernetesManifest@0'),
  panelLine('  inputs:'),
  panelLine('    action: deploy'),
  panelLine('    kubernetesServiceConnection: myAKS'),
  panelLine('    namespace: production'),
  panelBlank(),
]);

/** Ansible playbook YAML in panel gets wrapped */
export const fb10_ansiblePlaybook = makeRaw([
  'Here is the Ansible playbook:',
  '',
  panelLine('---'),
  panelLine('- name: Deploy to AKS'),
  panelLine('  hosts: localhost'),
  panelLine('  tasks:'),
  panelLine('  - name: Login to Azure'),
  panelLine('    azure.azcollection.azure_rm_aks_info:'),
  panelLine('      resource_group: myResourceGroup'),
  panelLine('      name: myAKSCluster'),
  panelLine('  - name: Apply manifests'),
  panelLine('    kubernetes.core.k8s:'),
  panelLine('      state: present'),
  panelLine('      src: manifests/'),
  panelBlank(),
]);

/** ConfigMap with literal block scalar bash script stays in one block */
export const fb10_configMapLiteralBlock = makeRaw([
  'Create the ConfigMap:',
  '',
  panelLine('apiVersion: v1'),
  panelLine('kind: ConfigMap'),
  panelLine('metadata:'),
  panelLine('  name: init-script'),
  panelLine('data:'),
  panelLine('  init.sh: |'),
  panelLine('    #!/bin/bash'),
  panelLine('    echo "Initializing..."'),
  panelLine('    until pg_isready -h $DB_HOST; do'),
  panelLine('      echo "Waiting..."'),
  panelLine('      sleep 2'),
  panelLine('    done'),
  panelLine('    echo "Ready!"'),
  panelBlank(),
]);

/** Makefile .PHONY and variable assignments stay in code block */
export const fb10_makefilePhony = makeRaw([
  'Create Makefile:',
  '',
  panelLine('.PHONY: build push deploy'),
  panelLine(''),
  panelLine('IMAGE ?= myregistry.azurecr.io/myapp'),
  panelLine('TAG ?= $(shell git rev-parse --short HEAD)'),
  panelLine(''),
  panelLine('build:'),
  panelLine('\tdocker build -t $(IMAGE):$(TAG) .'),
  panelLine(''),
  panelLine('push: build'),
  panelLine('\tdocker push $(IMAGE):$(TAG)'),
  panelLine(''),
  panelLine('deploy: push'),
  panelLine('\tkubectl set image deployment/myapp app=$(IMAGE):$(TAG)'),
  panelBlank(),
]);

/** NGINX config with proxy_pass stays in one code block */
export const fb10_nginxProxyPass = makeRaw([
  'Configure NGINX:',
  '',
  panelLine('server {'),
  panelLine('    listen 80;'),
  panelLine('    server_name myapp.example.com;'),
  panelLine(''),
  panelLine('    location / {'),
  panelLine('        proxy_pass http://localhost:8080;'),
  panelLine('        proxy_set_header Host $host;'),
  panelLine('        proxy_set_header X-Real-IP $remote_addr;'),
  panelLine('    }'),
  panelLine(''),
  panelLine('    location /healthz {'),
  panelLine('        return 200 "OK";'),
  panelLine('    }'),
  panelLine('}'),
  panelBlank(),
]);

/** Python K8s operator with deep nesting stays in one block */
export const fb10_pythonK8sOperator = makeRaw([
  'Create the operator:',
  '',
  panelLine('import kopf'),
  panelLine(''),
  panelLine('@kopf.on.create("v1", "pods")'),
  panelLine('def create_fn(spec, **kwargs):'),
  panelLine('    result = api.create('),
  panelLine('        namespace="default",'),
  panelLine('        body={'),
  panelLine('            "metadata": {"name": "test"},'),
  panelLine('        }'),
  panelLine('    )'),
  panelLine('    return {"ok": True}'),
  panelBlank(),
]);

/** Grafana JSON in ConfigMap with [5m] Prometheus duration preserved */
export const fb10_grafanaConfigMap5m = makeRaw([
  'Create dashboard ConfigMap:',
  '',
  panelLine('apiVersion: v1'),
  panelLine('kind: ConfigMap'),
  panelLine('metadata:'),
  panelLine('  name: grafana-dashboard'),
  panelLine('data:'),
  panelLine('  dashboard.json: |'),
  panelLine('    {'),
  panelLine('      "title": "Request Rate",'),
  panelLine('      "targets": ['),
  panelLine('        {'),
  panelLine('          "expr": "rate(http_requests_total[5m])"'),
  panelLine('        }'),
  panelLine('      ]'),
  panelLine('    }'),
  panelBlank(),
]);

/** Docker Compose YAML in panel gets wrapped */
export const fb10_dockerComposeYaml = makeRaw([
  'Create docker-compose.yml:',
  '',
  panelLine('version: "3.8"'),
  panelLine(''),
  panelLine('services:'),
  panelLine('  app:'),
  panelLine('    build: .'),
  panelLine('    ports:'),
  panelLine('    - "8080:8080"'),
  panelLine('    environment:'),
  panelLine('    - DATABASE_URL=postgres://localhost/mydb'),
  panelLine('  db:'),
  panelLine('    image: postgres:15'),
  panelBlank(),
]);

/** Envoy proxy config YAML gets wrapped in panel */
export const fb10_envoyProxyConfig = makeRaw([
  'Create the Envoy config:',
  '',
  panelLine('static_resources:'),
  panelLine('  listeners:'),
  panelLine('  - name: listener_0'),
  panelLine('    address:'),
  panelLine('      socket_address:'),
  panelLine('        address: 0.0.0.0'),
  panelLine('        port_value: 8080'),
  panelLine('    filter_chains:'),
  panelLine('    - filters:'),
  panelLine('      - name: envoy.filters.network.http_connection_manager'),
  panelBlank(),
]);

/** Azure Bicep for AKS stays in one code block */
export const fb10_azureBicepAks = makeRaw([
  'Create main.bicep:',
  '',
  panelLine("resource aks 'Microsoft.ContainerService/managedClusters@2024-01-01' = {"),
  panelLine("  name: 'myAKSCluster'"),
  panelLine('  identity: {'),
  panelLine("    type: 'SystemAssigned'"),
  panelLine('  }'),
  panelLine('  properties: {'),
  panelLine('    agentPoolProfiles: ['),
  panelLine('      {'),
  panelLine("        name: 'agentpool'"),
  panelLine('        count: 3'),
  panelLine("        vmSize: 'Standard_D2s_v3'"),
  panelLine('      }'),
  panelLine('    ]'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
]);

/** kubectl top millicore values not corrupted */
export const fb10_kubectlTopMillicores = makeRaw([
  'Resource usage:',
  '',
  panelLine('$ kubectl top pods -n production'),
  panelLine('NAME                     CPU(cores)   MEMORY(bytes)'),
  panelLine('my-app-7b94c5d4f-abc12   250m         128Mi'),
  panelLine('my-app-7b94c5d4f-def34   100m         96Mi'),
  panelLine('my-app-7b94c5d4f-ghi56   500m         256Mi'),
  panelBlank(),
]);

// ===========================================================================
// Round 11 – findbugs11.test.ts
// ===========================================================================

/** kubectl resource action output lines detected as code */
export const fb11_kubectlScaleOutput = makeRaw([
  'Scale the deployment:',
  '',
  panelLine('$ kubectl scale deployment my-app --replicas=5 -n production'),
  panelLine('deployment.apps/my-app scaled'),
  panelBlank(),
  '',
  'Verify:',
  '',
  panelLine('$ kubectl get deployment my-app -n production'),
  panelLine('NAME     READY   UP-TO-DATE   AVAILABLE   AGE'),
  panelLine('my-app   5/5     5            5           3d'),
  panelBlank(),
]);

/** kubectl apply output lines stay in code block */
export const fb11_kubectlApplyOutput = makeRaw([
  'Apply manifests:',
  '',
  panelLine('$ kubectl apply -f manifests/ -n production'),
  panelLine('namespace/production unchanged'),
  panelLine('serviceaccount/my-app created'),
  panelLine('deployment.apps/my-app configured'),
  panelLine('service/my-app-svc created'),
  panelLine('configmap/my-config unchanged'),
  panelLine('ingress.networking.k8s.io/my-ingress created'),
  panelBlank(),
]);

/** Helm status output not treated as YAML keys */
export const fb11_helmStatusOutput = makeRaw([
  'Check Helm release:',
  '',
  panelLine('$ helm status my-release -n production'),
  panelLine('NAME: my-release'),
  panelLine('LAST DEPLOYED: Mon Jan 15 10:30:00 2024'),
  panelLine('NAMESPACE: production'),
  panelLine('STATUS: deployed'),
  panelLine('REVISION: 3'),
  panelLine('TEST SUITE: None'),
  panelLine('NOTES:'),
  panelLine('  Get the URL by running:'),
  panelLine('  kubectl get svc my-release -n production'),
  panelBlank(),
]);

/** kubectl rollout output stays in code block */
export const fb11_kubectlRolloutStatus = makeRaw([
  'Wait for rollout:',
  '',
  panelLine('$ kubectl rollout status deployment/my-app -n production'),
  panelLine(
    'Waiting for deployment "my-app" rollout to finish: 1 of 3 updated replicas are available...'
  ),
  panelLine(
    'Waiting for deployment "my-app" rollout to finish: 2 of 3 updated replicas are available...'
  ),
  panelLine('deployment "my-app" successfully rolled out'),
  panelBlank(),
]);

/** terraform plan output with + prefix detected as code */
export const fb11_terraformPlanOutput = makeRaw([
  'Plan the AKS cluster:',
  '',
  panelLine('$ terraform plan'),
  panelLine(''),
  panelLine('Terraform will perform the following actions:'),
  panelLine(''),
  panelLine('  # azurerm_kubernetes_cluster.aks will be created'),
  panelLine('  + resource "azurerm_kubernetes_cluster" "aks" {'),
  panelLine('      + dns_prefix          = "myaks"'),
  panelLine('      + location            = "eastus"'),
  panelLine('      + name                = "myAKSCluster"'),
  panelLine('      + resource_group_name = "myResourceGroup"'),
  panelLine('    }'),
  panelLine(''),
  panelLine('Plan: 1 to add, 0 to change, 0 to destroy.'),
  panelBlank(),
]);

/** Docker build step output stays in code block */
export const fb11_dockerBuildSteps = makeRaw([
  'Build the image:',
  '',
  panelLine('$ docker build -t myapp:latest .'),
  panelLine('Step 1/5 : FROM node:18-alpine'),
  panelLine(' ---> abc123def456'),
  panelLine('Step 2/5 : WORKDIR /app'),
  panelLine(' ---> Using cache'),
  panelLine(' ---> def456789abc'),
  panelLine('Step 3/5 : COPY package*.json ./'),
  panelLine(' ---> 789abcdef012'),
  panelLine('Step 4/5 : RUN npm ci --production'),
  panelLine(' ---> Running in container123'),
  panelLine('Step 5/5 : CMD ["node", "server.js"]'),
  panelLine(' ---> 012345678abc'),
  panelLine('Successfully built 012345678abc'),
  panelLine('Successfully tagged myapp:latest'),
  panelBlank(),
]);

/** Helm template Go expressions in bare output wrapped as code */
export const fb11_helmTemplateGoExpr = makeRaw([
  'The Helm template generates:',
  '',
  panelLine('{{- if .Values.ingress.enabled -}}'),
  panelLine('apiVersion: networking.k8s.io/v1'),
  panelLine('kind: Ingress'),
  panelLine('metadata:'),
  panelLine('  name: {{ include "mychart.fullname" . }}'),
  panelLine('  {{- with .Values.ingress.annotations }}'),
  panelLine('  annotations:'),
  panelLine('    {{- toYaml . | nindent 4 }}'),
  panelLine('  {{- end }}'),
  panelLine('spec:'),
  panelLine('  rules:'),
  panelLine('  {{- range .Values.ingress.hosts }}'),
  panelLine('  - host: {{ .host }}'),
  panelLine('{{- end }}'),
  panelBlank(),
]);

/** ConfigMap with embedded Spring properties stays together */
export const fb11_configMapSpringProperties = makeRaw([
  'Create ConfigMap:',
  '',
  panelLine('apiVersion: v1'),
  panelLine('kind: ConfigMap'),
  panelLine('metadata:'),
  panelLine('  name: app-config'),
  panelLine('data:'),
  panelLine('  application.properties: |'),
  panelLine('    server.port=8080'),
  panelLine('    spring.datasource.url=jdbc:postgresql://db:5432/mydb'),
  panelLine('    spring.datasource.username=${DB_USER}'),
  panelLine('    spring.jpa.hibernate.ddl-auto=update'),
  panelLine('    management.endpoints.web.exposure.include=health,info'),
  panelBlank(),
]);

/** kubectl error messages not absorbed into YAML blocks */
export const fb11_kubectlErrorMessage = makeRaw([
  'Try to access the resource:',
  '',
  panelLine('$ kubectl get pods -n production'),
  panelLine('NAME                     READY   STATUS    RESTARTS   AGE'),
  panelLine('api-server-abc12         1/1     Running   0          2d'),
  panelBlank(),
  '',
  'If you see an error like:',
  '',
  panelLine('$ kubectl get customresource -n production'),
  panelLine('error: the server doesnt have a resource type "customresource"'),
  panelBlank(),
  '',
  'It means the CRD is not installed.',
]);

/** kubectl deprecation warnings stay with command output */
export const fb11_kubectlWarningDeprecation = makeRaw([
  'Apply the policy:',
  '',
  panelLine('$ kubectl apply -f psp.yaml'),
  panelLine('Warning: policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+'),
  panelLine('podsecuritypolicy.policy/restricted created'),
  panelBlank(),
]);

/** bare kubectl events table detected as code */
export const fb11_kubectlEventsTable = makeRaw([
  'Recent events in the namespace:',
  '',
  panelLine('LAST SEEN   TYPE      REASON              OBJECT                        MESSAGE'),
  panelLine(
    '30s         Normal    Scheduled           pod/api-server-abc12          Successfully assigned'
  ),
  panelLine(
    '28s         Normal    Pulling             pod/api-server-abc12          Pulling image "myapp:v2"'
  ),
  panelLine(
    '15s         Normal    Pulled              pod/api-server-abc12          Successfully pulled image'
  ),
  panelLine(
    '14s         Normal    Created             pod/api-server-abc12          Created container api'
  ),
  panelLine(
    '14s         Normal    Started             pod/api-server-abc12          Started container api'
  ),
  panelLine(
    '5s          Warning   BackOff             pod/worker-xyz99              Back-off restarting failed'
  ),
  panelBlank(),
]);

/** Kustomization with patchesStrategicMerge wrapped as YAML */
export const fb11_kustomizationPatches = makeRaw([
  'Create kustomization.yaml:',
  '',
  panelLine(' resources:'),
  panelLine(' - deployment.yaml'),
  panelLine(' - service.yaml'),
  panelLine(' patchesStrategicMerge:'),
  panelLine(' - |-'),
  panelLine('   apiVersion: apps/v1'),
  panelLine('   kind: Deployment'),
  panelLine('   metadata:'),
  panelLine('     name: my-app'),
  panelLine('   spec:'),
  panelLine('     replicas: 5'),
  panelLine(' commonLabels:'),
  panelLine('   app: my-app'),
  panelLine('   env: production'),
  panelBlank(),
]);

/** Go client-go code stays in one code block */
export const fb11_goClientGoCode = makeRaw([
  'Create main.go:',
  '',
  panelLine('package main'),
  panelLine(''),
  panelLine('import ('),
  panelLine('  "context"'),
  panelLine('  "fmt"'),
  panelLine('  metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"'),
  panelLine('  "k8s.io/client-go/kubernetes"'),
  panelLine('  "k8s.io/client-go/tools/clientcmd"'),
  panelLine(')'),
  panelLine(''),
  panelLine('func main() {'),
  panelLine('  config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)'),
  panelLine('  if err != nil {'),
  panelLine('    panic(err)'),
  panelLine('  }'),
  panelLine('  clientset, err := kubernetes.NewForConfig(config)'),
  panelLine(
    '  pods, err := clientset.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})'
  ),
  panelLine('  for _, pod := range pods.Items {'),
  panelLine('    fmt.Printf("Pod: %s\\n", pod.Name)'),
  panelLine('  }'),
  panelLine('}'),
  panelBlank(),
]);

/** RBAC ClusterRole with complex rules stays together */
export const fb11_rbacClusterRole = makeRaw([
  'Create ClusterRole:',
  '',
  panelLine('apiVersion: rbac.authorization.k8s.io/v1'),
  panelLine('kind: ClusterRole'),
  panelLine('metadata:'),
  panelLine('  name: monitoring-role'),
  panelLine('rules:'),
  panelLine('- apiGroups: [""]'),
  panelLine('  resources: ["pods", "nodes", "services", "endpoints"]'),
  panelLine('  verbs: ["get", "list", "watch"]'),
  panelLine('- apiGroups: ["apps"]'),
  panelLine('  resources: ["deployments", "replicasets", "statefulsets"]'),
  panelLine('  verbs: ["get", "list", "watch"]'),
  panelLine('- apiGroups: ["monitoring.coreos.com"]'),
  panelLine('  resources: ["prometheuses", "servicemonitors", "alertmanagers"]'),
  panelLine('  verbs: ["*"]'),
  panelBlank(),
]);

/** Multiple kubectl commands with prose rendered correctly */
export const fb11_multiKubectlWithProse = makeRaw([
  'First, create the namespace:',
  '',
  panelLine('$ kubectl create namespace monitoring'),
  panelLine('namespace/monitoring created'),
  panelBlank(),
  '',
  'Then install Prometheus:',
  '',
  panelLine('$ helm install prometheus prometheus-community/kube-prometheus-stack \\'),
  panelLine('    --namespace monitoring \\'),
  panelLine('    --set grafana.enabled=true \\'),
  panelLine('    --set alertmanager.enabled=true'),
  panelBlank(),
  '',
  'Verify the pods are running:',
  '',
  panelLine('$ kubectl get pods -n monitoring'),
  panelLine(
    'NAME                                                  READY   STATUS    RESTARTS   AGE'
  ),
  panelLine(
    'prometheus-kube-prometheus-operator-7d9f5b6c4-abc12   1/1     Running   0          60s'
  ),
  panelLine(
    'prometheus-grafana-85f4c9d7b-xyz99                    3/3     Running   0          60s'
  ),
  panelLine(
    'alertmanager-prometheus-alertmanager-0                1/1     Running   0          60s'
  ),
  panelBlank(),
]);

/** klog-format log lines from kubectl logs detected as code */
export const fb11_klogFormatLogs = makeRaw([
  'Check controller logs:',
  '',
  panelLine('$ kubectl logs -n kube-system deployment/kube-controller-manager --tail=5'),
  panelLine('I0115 10:30:00.123456       1 main.go:50] Starting controller v1.28.0'),
  panelLine('I0115 10:30:01.234567       1 leaderelection.go:258] successfully acquired lease'),
  panelLine('W0115 10:30:05.345678       1 reflector.go:302] pkg/mod/cache: watch closed'),
  panelLine(
    'E0115 10:30:06.456789       1 controller.go:114] error syncing key: connection refused'
  ),
  panelLine('I0115 10:30:07.567890       1 controller.go:120] requeue: default/my-deployment'),
  panelBlank(),
]);

/** logfmt structured logging lines detected as code */
export const fb11_logfmtStructuredLogs = makeRaw([
  'Application logs:',
  '',
  panelLine('$ kubectl logs -n production deployment/api-server --tail=5'),
  panelLine('level=info msg="server started" port=8080 version=v1.2.3'),
  panelLine('level=info msg="connected to database" host=postgres:5432 db=myapp'),
  panelLine('level=error msg="request failed" status=503 path=/api/health'),
  panelLine('level=warn msg="slow query" duration=2.5s table=users'),
  panelLine('level=info msg="graceful shutdown" signal=SIGTERM'),
  panelBlank(),
]);

/** K8s validation errors stay in code block */
export const fb11_k8sValidationErrors = makeRaw([
  'If validation fails:',
  '',
  panelLine('$ kubectl apply -f deployment.yaml'),
  panelLine('The Deployment "my-app" is invalid:'),
  panelLine('* spec.containers[0].image: Required value'),
  panelLine('* spec.containers[0].name: Required value'),
  panelLine('* spec.template.metadata.labels: Invalid value: map[string]string(nil)'),
  panelBlank(),
]);

/** K8s scheduling messages stay in kubectl describe output */
export const fb11_k8sSchedulingDescribe = makeRaw([
  'Check pod status:',
  '',
  panelLine('$ kubectl describe pod stuck-pod -n production'),
  panelLine('Name:         stuck-pod'),
  panelLine('Status:       Pending'),
  panelLine('Conditions:'),
  panelLine('  Type             Status'),
  panelLine('  PodScheduled     False'),
  panelLine('Events:'),
  panelLine('  Type     Reason            Message'),
  panelLine('  ----     ------            -------'),
  panelLine(
    '  Warning  FailedScheduling  0/3 nodes are available: 1 Insufficient cpu, 2 node(s) had taint'
  ),
  panelBlank(),
]);

/** PVC and other resource status lines detected as code */
export const fb11_pvcResourceStatus = makeRaw([
  'Apply storage:',
  '',
  panelLine('$ kubectl apply -f storage.yaml'),
  panelLine('storageclass.storage.k8s.io/fast-ssd created'),
  panelLine('persistentvolumeclaim/data-pvc created'),
  panelLine('persistentvolume/nfs-pv configured'),
  panelBlank(),
]);

/** helm upgrade output with hooks and notes stays in code block */
export const fb11_helmUpgradeHooks = makeRaw([
  'Upgrade the release:',
  '',
  panelLine('$ helm upgrade my-release ./chart -n production --install'),
  panelLine('Release "my-release" has been upgraded. Happy Helming!'),
  panelLine('NAME: my-release'),
  panelLine('LAST DEPLOYED: Mon Jan 15 10:30:00 2024'),
  panelLine('NAMESPACE: production'),
  panelLine('STATUS: deployed'),
  panelLine('REVISION: 5'),
  panelLine('HOOKS:'),
  panelLine('---'),
  panelLine('# Source: mychart/templates/tests/test-connection.yaml'),
  panelLine('apiVersion: v1'),
  panelLine('kind: Pod'),
  panelBlank(),
]);

/** az aks and kubeconfig commands with output stay together */
export const fb11_azAksGetCredentials = makeRaw([
  'Connect to AKS:',
  '',
  panelLine('$ az aks get-credentials --resource-group myRG --name myAKS --overwrite-existing'),
  panelLine('Merged "myAKS" as current context in /home/user/.kube/config'),
  panelBlank(),
  '',
  'Verify context:',
  '',
  panelLine('$ kubectl config current-context'),
  panelLine('myAKS'),
  panelBlank(),
  '',
  'Check nodes:',
  '',
  panelLine('$ kubectl get nodes'),
  panelLine('NAME                                STATUS   ROLES   AGE   VERSION'),
  panelLine('aks-nodepool1-12345678-vmss000000   Ready    agent   5d    v1.28.3'),
  panelLine('aks-nodepool1-12345678-vmss000001   Ready    agent   5d    v1.28.3'),
  panelLine('aks-nodepool1-12345678-vmss000002   Ready    agent   5d    v1.28.3'),
  panelBlank(),
]);

/** Pod with service mesh annotations stays in one YAML block */
export const fb11_istioSidecarAnnotations = makeRaw([
  'Add Istio sidecar injection:',
  '',
  panelLine('apiVersion: v1'),
  panelLine('kind: Pod'),
  panelLine('metadata:'),
  panelLine('  name: my-app'),
  panelLine('  annotations:'),
  panelLine('    sidecar.istio.io/inject: "true"'),
  panelLine('    sidecar.istio.io/proxyMemory: "256Mi"'),
  panelLine('    prometheus.io/scrape: "true"'),
  panelLine('    prometheus.io/port: "8080"'),
  panelLine('spec:'),
  panelLine('  containers:'),
  panelLine('  - name: my-app'),
  panelLine('    image: myapp:latest'),
  panelLine('    ports:'),
  panelLine('    - containerPort: 8080'),
  panelBlank(),
]);

/** bare logfmt structured logging wrapped in code block */
export const fb11_bareLogfmtOutput = makeRaw([
  'The application logs show:',
  '',
  panelLine('level=info msg="server started" port=8080 version=v1.2.3'),
  panelLine('level=info msg="connected to database" host=postgres:5432'),
  panelLine('level=error msg="request failed" status=503 path=/api/health'),
  panelBlank(),
]);

/** bare klog format controller logs wrapped in code block */
export const fb11_bareKlogFormat = makeRaw([
  'Controller logs show:',
  '',
  panelLine('I0115 10:30:00.123456       1 main.go:50] Starting controller v1.28.0'),
  panelLine('I0115 10:30:01.234567       1 leaderelection.go:258] acquired lease'),
  panelLine('W0115 10:30:05.345678       1 reflector.go:302] watch closed'),
  panelBlank(),
]);

/** bare kubectl resource action output from panel wrapped as code */
export const fb11_bareResourceActionOutput = makeRaw([
  'After applying:',
  '',
  panelLine('deployment.apps/my-app configured'),
  panelLine('service/my-app-svc created'),
  panelLine('configmap/my-config unchanged'),
  panelLine('ingress.networking.k8s.io/my-ingress created'),
  panelBlank(),
]);

/** terraform output values at panel indent wrapped as code */
export const fb11_terraformOutputValues = makeRaw([
  'Terraform outputs:',
  '',
  panelLine('cluster_endpoint = "https://myaks-abc.hcp.eastus.azmk8s.io:443"'),
  panelLine('cluster_name = "myAKSCluster"'),
  panelLine('resource_group = "myResourceGroup"'),
  panelLine('kube_config = <sensitive>'),
  panelBlank(),
]);

/** bare PromQL expression with [5m] wrapped as code */
export const fb11_barePromQL5m = makeRaw([
  'Use this PromQL query:',
  '',
  panelLine('sum(rate(container_cpu_usage_seconds_total{namespace="prod"}[5m])) by (pod)'),
  panelBlank(),
]);

/** multi-step AKS troubleshooting with commands and YAML */
export const fb11_aksTroubleshooting = makeRaw([
  'Troubleshoot the failing pod:',
  '',
  '1. Check the pods:',
  '',
  panelLine('$ kubectl get pods -n production -l app=my-app'),
  panelLine('NAME                     READY   STATUS             RESTARTS   AGE'),
  panelLine('my-app-abc12             0/1     CrashLoopBackOff   5          10m'),
  panelBlank(),
  '',
  '2. Check the logs:',
  '',
  panelLine('$ kubectl logs my-app-abc12 -n production --previous'),
  panelLine('Error: Cannot find module "/app/server.js"'),
  panelBlank(),
  '',
  '3. Fix the Deployment:',
  '',
  panelLine('apiVersion: apps/v1'),
  panelLine('kind: Deployment'),
  panelLine('metadata:'),
  panelLine('  name: my-app'),
  panelLine('spec:'),
  panelLine('  template:'),
  panelLine('    spec:'),
  panelLine('      containers:'),
  panelLine('      - name: my-app'),
  panelLine('        command: ["node", "dist/server.js"]'),
  panelBlank(),
]);

/** K8s Secret with base64 data stays in one YAML block */
export const fb11_k8sSecretBase64 = makeRaw([
  'Create the Secret:',
  '',
  panelLine('apiVersion: v1'),
  panelLine('kind: Secret'),
  panelLine('metadata:'),
  panelLine('  name: db-credentials'),
  panelLine('  namespace: production'),
  panelLine('type: Opaque'),
  panelLine('data:'),
  panelLine('  DB_HOST: cG9zdGdyZXMucHJvZHVjdGlvbi5zdmMuY2x1c3Rlci5sb2NhbA=='),
  panelLine('  DB_USER: bXlhcHB1c2Vy'),
  panelLine('  DB_PASS: c3VwZXJzZWNyZXRwYXNzd29yZA=='),
  panelLine('  DB_NAME: bXlhcHBkYg=='),
  panelBlank(),
]);

// ===========================================================================
// Round 12 – findbugs12.test.ts
// ===========================================================================

/** bare PromQL expressions detected as code */
export const fb12_barePromQLExpressions = makeRaw([
  'Use these PromQL queries to monitor:',
  '',
  panelLine('sum(rate(container_cpu_usage_seconds_total{namespace="prod"}[5m])) by (pod)'),
  panelBlank(),
]);

/** bare K8s event messages detected as code */
export const fb12_bareK8sEventMessages = makeRaw([
  'The pod events show:',
  '',
  panelLine('Pulling image "nginx:1.25"'),
  panelLine('Successfully assigned production/web-abc12 to aks-node-0'),
  panelLine('Container image "nginx:1.25" already present on machine'),
  panelLine('Created container nginx'),
  panelLine('Started container nginx'),
  panelBlank(),
]);

/** bare scheduling failure messages detected as code */
export const fb12_bareSchedulingFailure = makeRaw([
  'The scheduling error shows:',
  '',
  panelLine('0/3 nodes are available: 1 Insufficient cpu, 2 node(s) had taint'),
  panelLine('{node.kubernetes.io/not-ready: }, that the pod did not tolerate.'),
  panelBlank(),
]);

/** bare Prometheus metric query results detected as code */
export const fb12_barePrometheusMetrics = makeRaw([
  'Current metric values:',
  '',
  panelLine('container_memory_working_set_bytes{namespace="prod",pod="api-abc12"} 134217728'),
  panelLine('container_cpu_usage_seconds_total{namespace="prod",pod="api-abc12"} 45.23'),
  panelLine('kube_pod_status_phase{namespace="prod",phase="Running"} 5'),
  panelBlank(),
]);

/** bare readiness probe failure messages detected as code */
export const fb12_bareProbeFailures = makeRaw([
  'The health check errors show:',
  '',
  panelLine('Readiness probe failed: Get "http://10.0.0.5:8080/healthz": connection refused'),
  panelLine('Liveness probe failed: HTTP probe failed with statuscode: 503'),
  panelLine('Startup probe failed: Get "http://10.0.0.5:8080/ready": context deadline exceeded'),
  panelBlank(),
]);

/** CoreDNS Corefile with deep nesting stays complete */
export const fb12_coreDNSCorefile = makeRaw([
  'The CoreDNS Corefile should look like:',
  '',
  panelLine('.:53 {'),
  panelLine('    errors'),
  panelLine('    health {'),
  panelLine('        lameduck 5s'),
  panelLine('    }'),
  panelLine('    ready'),
  panelLine('    kubernetes cluster.local in-addr.arpa ip6.arpa {'),
  panelLine('        pods insecure'),
  panelLine('        fallthrough in-addr.arpa ip6.arpa'),
  panelLine('        ttl 30'),
  panelLine('    }'),
  panelLine('    prometheus :9153'),
  panelLine('    forward . /etc/resolv.conf'),
  panelLine('    cache 30'),
  panelLine('    loop'),
  panelLine('    reload'),
  panelLine('    loadbalance'),
  panelLine('}'),
  panelBlank(),
]);

/** PrometheusRule CRD YAML with deep rules stays complete */
export const fb12_prometheusRuleCRD = makeRaw([
  'Create the PrometheusRule:',
  '',
  panelLine('apiVersion: monitoring.coreos.com/v1'),
  panelLine('kind: PrometheusRule'),
  panelLine('metadata:'),
  panelLine('  name: app-alerts'),
  panelLine('spec:'),
  panelLine('  groups:'),
  panelLine('  - name: app.rules'),
  panelLine('    rules:'),
  panelLine('    - alert: HighErrorRate'),
  panelLine('      expr: sum(rate(http_requests_total{code=~"5.."}[5m])) > 0.1'),
  panelLine('      for: 5m'),
  panelLine('      labels:'),
  panelLine('        severity: critical'),
  panelLine('      annotations:'),
  panelLine('        summary: High error rate detected'),
  panelLine('        description: Error rate is above 10% for 5 minutes'),
  panelBlank(),
]);

/** deeply nested az aks JSON output stays complete */
export const fb12_azAksJsonOutput = makeRaw([
  'Node pool details:',
  '',
  panelLine('{'),
  panelLine('  "agentPoolProfiles": ['),
  panelLine('    {'),
  panelLine('      "name": "nodepool1",'),
  panelLine('      "count": 3,'),
  panelLine('      "vmSize": "Standard_DS2_v2",'),
  panelLine('      "provisioningState": "Succeeded",'),
  panelLine('      "powerState": {'),
  panelLine('        "code": "Running"'),
  panelLine('      },'),
  panelLine('      "nodeLabels": {'),
  panelLine('        "env": "production"'),
  panelLine('      }'),
  panelLine('    }'),
  panelLine('  ]'),
  panelLine('}'),
  panelBlank(),
]);

/** bare container crash messages detected as code */
export const fb12_bareContainerCrash = makeRaw([
  'The pod restart events:',
  '',
  panelLine('Back-off restarting failed container my-app in pod my-app-abc12'),
  panelLine('Killing container with a]id docker://abc123def to re-create'),
  panelLine('Container my-app definition changed, will be restarted'),
  panelBlank(),
]);

/** bare volume mount failure messages detected as code */
export const fb12_bareVolumeMountFailure = makeRaw([
  'The storage errors show:',
  '',
  panelLine('MountVolume.SetUp failed for volume "data-vol" : secret "app-secret" not found'),
  panelLine('Unable to attach or mount volumes: timed out waiting for the condition'),
  panelLine('AttachVolume.Attach failed for volume "pvc-abc123" : disk not found'),
  panelBlank(),
]);

/** bare image pull failure messages detected as code */
export const fb12_bareImagePullFailure = makeRaw([
  'The image pull errors:',
  '',
  panelLine('Failed to pull image "myregistry.azurecr.io/myapp:v2.0.0": rpc error'),
  panelLine('Error response from daemon: manifest for myapp:v2.0.0 not found'),
  panelLine('Normal BackOff 5m (x3 over 10m) kubelet Back-off pulling image'),
  panelBlank(),
]);

/** bare scheduling detail messages detected as code */
export const fb12_bareSchedulingDetails = makeRaw([
  'Scheduling failure details:',
  '',
  panelLine('Insufficient cpu (1500m requested vs 1000m available)'),
  panelLine('Insufficient memory (2Gi requested vs 512Mi available)'),
  panelLine('node(s) had volume node affinity conflict'),
  panelLine('node(s) did not match Pod topologySpreadConstraints'),
  panelBlank(),
]);

/** bare CRI-O container log lines detected as code */
export const fb12_bareCRIOLogs = makeRaw([
  'Raw container runtime logs:',
  '',
  panelLine('stdout F Starting application v2.1.0'),
  panelLine('stdout F Connected to database at postgres:5432'),
  panelLine('stdout F Listening on port 8080'),
  panelLine('stderr F Error: connection reset by peer'),
  panelLine('stdout F GET /api/health 200 2ms'),
  panelBlank(),
]);

/** bare multi-line container lifecycle events detected as code */
export const fb12_bareContainerLifecycle = makeRaw([
  'Container lifecycle events:',
  '',
  panelLine('Pulling image "myapp:v2.0.0"'),
  panelLine('Successfully pulled image "myapp:v2.0.0" in 3.2s'),
  panelLine('Created container my-app'),
  panelLine('Started container my-app'),
  panelLine('Liveness probe failed: HTTP probe failed with statuscode: 503'),
  panelLine('Container my-app failed liveness probe, will be restarted'),
  panelBlank(),
]);

/** bare key=value diagnostic output detected as code */
export const fb12_bareKeyValueDiagnostics = makeRaw([
  'Container runtime info:',
  '',
  panelLine('runtime.name=containerd runtime.version=1.7.2'),
  panelLine('runtime.endpoint=/run/containerd/containerd.sock'),
  panelLine('pod.name=my-app-abc12 namespace=production node=aks-node-0'),
  panelLine('container.id=abc123def456 image=myapp:v2.0.0 state=running'),
  panelBlank(),
]);

// ===========================================================================
// Round 13 — Negative examples (things that should NOT be wrapped as code)
// ===========================================================================

/** prose sentence ending with colon — should NOT produce a code block */
export const fb13_proseColonEnding = makeRaw([
  "Send one of these and I'll diagnose it:",
  '',
  'You can also describe what went wrong in your own words.',
]);

/** diagnostic summary ending with colon — should NOT be code */
export const fb13_diagnosticSummaryColon = makeRaw([
  'No obvious pod problems right now:',
  '',
  'If you want, I can dig into why those restarted by describing those pods and',
  'pulling their previous logs.',
]);

/** step heading "Build + push:" should not produce an empty code block */
export const fb13_stepHeadingColon = makeRaw([
  'Build + push:',
  '',
  'export IMAGE=ghcr.io/<you>/rust-app:0.1.0',
  'docker build -t $IMAGE .',
  'docker push $IMAGE',
]);

/** "Assumes:" heading followed by Dockerfile — no empty code block from heading */
export const fb13_assumesHeadingColon = makeRaw([
  'Assumes:',
  '',
  'FROM golang:1.22-bookworm AS builder',
  'WORKDIR /src',
  'COPY go.mod go.sum ./',
  'RUN go mod download',
]);

/** markdown bold text with k8s terms — NOT code */
export const fb13_boldK8sTerms = makeRaw([
  'The **deployment** is running in the **kube-system** namespace.',
  'Check the **pod** status with the command above.',
  'The **service** endpoint should be reachable at port 443.',
]);

/** markdown bullet list with technical terms — NOT code */
export const fb13_bulletListTechTerms = makeRaw([
  'Common reasons for pod restarts:',
  '',
  '- Out of memory (OOMKilled)',
  '- Liveness probe failure',
  '- Image pull errors',
  '- CrashLoopBackOff due to application bugs',
  '- Volume mount failures',
]);

/** numbered step list with k8s actions — NOT code */
export const fb13_numberedStepList = makeRaw([
  'Follow these steps:',
  '',
  '1. Create the deployment using the YAML above',
  '2. Verify pods are running with kubectl get pods',
  '3. Check the service endpoints',
  '4. Test connectivity from another pod',
]);

/** markdown headers — NOT YAML comments or code */
export const fb13_markdownHeaders = makeRaw([
  '## Troubleshooting Pod Restarts',
  '',
  'Here are some things to check when pods keep restarting.',
  '',
  '### Step 1: Check Pod Events',
  '',
  'Look at the events section of the pod describe output.',
  '',
  '### Step 2: Check Logs',
  '',
  'Pull the previous container logs to see what happened.',
]);

/** prose with URLs — NOT code */
export const fb13_proseWithUrls = makeRaw([
  'For more information, see the Kubernetes documentation:',
  'https://kubernetes.io/docs/concepts/workloads/pods/',
  '',
  'You can also check the Azure AKS troubleshooting guide at',
  'https://learn.microsoft.com/en-us/azure/aks/troubleshooting',
]);

/** "Note:" prefix with explanation — NOT code */
export const fb13_notePrefix = makeRaw([
  'Note: the above configuration assumes you have cluster-admin permissions.',
  'If you are using a restricted RBAC role, you may need to request additional',
  'access from your platform team.',
]);

/** multi-paragraph technical explanation — NOT code */
export const fb13_multiParagraphExplanation = makeRaw([
  'The pod is in CrashLoopBackOff because the container exits immediately.',
  'This usually means the application crashed during startup.',
  '',
  'Common causes include missing environment variables, incorrect',
  'database connection strings, or insufficient memory limits.',
  '',
  'I recommend checking the previous container logs first.',
]);

/** prose with inline code backticks — NOT wrapped in code fence */
export const fb13_inlineCodeBackticks = makeRaw([
  'You can check the status by running `kubectl get pods -n kube-system`.',
  'The output should show all pods in Running state.',
  'If any show `CrashLoopBackOff`, check their logs with `kubectl logs`.',
]);

/** prose with colon-separated key-value descriptions — NOT YAML */
export const fb13_proseKeyValueDescriptions = makeRaw([
  "Here's what I found:",
  '',
  'The cluster has 3 node pools with a total of 12 nodes.',
  'All nodes show Ready status and have sufficient resources.',
  'The API server is responding normally with no error spikes.',
]);

/** questions about k8s resources — NOT code */
export const fb13_questionsAboutK8s = makeRaw([
  'A few questions to narrow this down:',
  '',
  'Which namespace is the deployment in?',
  'How many replicas are configured?',
  'Are there any resource limits set on the containers?',
  'Is the cluster using a custom CNI plugin?',
]);

/** mixed markdown formatting (bold, italic, lists, headers) — NOT code */
export const fb13_mixedMarkdownFormatting = makeRaw([
  '## Summary',
  '',
  "Your cluster looks **healthy** overall. Here's what I checked:",
  '',
  '- **Node status**: all 6 nodes are _Ready_',
  '- **Pod health**: 42/45 pods running (3 in Pending)',
  '- **Resource usage**: ~60% CPU, ~70% memory',
  '',
  'The 3 pending pods are waiting for node scale-up.',
  'This should resolve within 5-10 minutes as the autoscaler kicks in.',
]);

// ===========================================================================
// Round 14 — Prose-colon false positives in panel recovery
// ===========================================================================

/** "Also confirm:" after kubectl commands — prose, not code */
export const fb14_alsoConfirmAfterShell = makeRaw([
  ' kubectl get pods -n production',
  ' kubectl get svc -n production',
  '',
  ' Also confirm:',
  '',
  ' - the image tag matches what was pushed',
  ' - the pull secret exists in the namespace',
]);

/** "Also confirm:" without blank line after shell — not code */
export const fb14_alsoConfirmNoBlank = makeRaw([
  ' kubectl get pods -n production',
  ' Also confirm:',
  ' - the image tag matches',
]);

/** "Also confirm:" after double blank — not code */
export const fb14_alsoConfirmDoubleBlank = makeRaw([
  ' kubectl get pods -n production',
  ' kubectl get svc -n production',
  '',
  '',
  ' Also confirm:',
  '',
  ' - the image tag matches',
]);

/** "Build + push:" prose heading — not code */
export const fb14_buildPushProseHeading = makeRaw([
  ' docker build -t myapp:latest .',
  ' Build + push:',
  ' You can push with docker push.',
]);

/** Rich panel code then "Also confirm:" stays prose */
export const fb14_panelCodeThenAlsoConfirm = makeRaw([
  boldLine('Commands'),
  panelBlank(),
  panelLine('kubectl get deploy -n prod'),
  panelLine('kubectl get svc -n prod'),
  panelBlank(),
  '',
  'Also confirm:',
  '',
  '- the image tag matches',
  '- the pull secret exists',
]);

// ===========================================================================
// Round 15 — Filename-hint detection, numbered step headers, capitalized headings
// ===========================================================================

/** requirements.txt followed by pinned dependencies (panel format) */
export const fb15_requirementsTxtPanel = makeRaw([
  panelLine('Here are the project files:'),
  panelBlank(),
  boldLine('requirements.txt'),
  panelBlank(),
  panelLine(' fastapi==0.110.0'),
  panelLine(' uvicorn[standard]==0.27.1'),
  panelBlank(),
]);

/** main.py followed by Python code (panel format) */
export const fb15_mainPyPanel = makeRaw([
  panelLine('Create this file:'),
  panelBlank(),
  boldLine('main.py'),
  panelBlank(),
  panelLine(' from fastapi import FastAPI'),
  panelLine(' import os'),
  panelLine(' app = FastAPI()'),
  panelLine(' @app.get("/")'),
  panelLine(' def root():'),
  panelLine('     return {"message": "hello"}'),
  panelBlank(),
]);

/** numbered step header "3) ..." is NOT a code block (panel format) */
export const fb15_numberedStepHeaderPanel = makeRaw([
  panelLine('                3) Kubernetes (Deployment + Service + optional Ingress)'),
  panelBlank(),
  panelLine('Create a deployment manifest:'),
]);

/** Dockerfile filename followed by Dockerfile content (panel format) */
export const fb15_dockerfilePanel = makeRaw([
  boldLine('Dockerfile'),
  panelBlank(),
  panelLine(' FROM python:3.12-slim AS builder'),
  panelLine(' WORKDIR /app'),
  panelLine(' COPY requirements.txt .'),
  panelLine(' RUN pip install --no-cache-dir -r requirements.txt'),
  panelBlank(),
  panelLine(' FROM python:3.12-slim'),
  panelLine(' WORKDIR /app'),
  panelLine(' COPY --from=builder /app /app'),
  panelLine(' CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]'),
  panelBlank(),
]);

/** requirements.txt followed by deps (non-panel format) */
// Non-panel fixtures use inline prefix/suffix (no blank line before trailing
// prompt) to match the original test construction in findbugs15.test.ts.
export const fb15_requirementsTxtNonPanel = (() => {
  const body = [
    'Here are the files:',
    '',
    'requirements.txt',
    '',
    'fastapi==0.110.0',
    'uvicorn[standard]==0.27.1',
    '',
  ];
  return [
    'stty -echo',
    '\x1b[?2004l',
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
    '\x1b[?2004l',
    '',
    "Loaded models: ['azure/gpt-4']",
    '\x1b[1;96mAI:\x1b[0m ',
    '',
    ...body,
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
  ].join('\n');
})();

/** main.py followed by Python code (non-panel format) */
export const fb15_mainPyNonPanel = (() => {
  const body = [
    'Create this file:',
    '',
    'main.py',
    '',
    'from fastapi import FastAPI',
    'import os',
    'app = FastAPI()',
    '@app.get("/")',
    'def root():',
    '    return {"message": "hello"}',
    '',
  ];
  return [
    'stty -echo',
    '\x1b[?2004l',
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
    '\x1b[?2004l',
    '',
    "Loaded models: ['azure/gpt-4']",
    '\x1b[1;96mAI:\x1b[0m ',
    '',
    ...body,
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
  ].join('\n');
})();

/** numbered header "3) ..." is NOT code (non-panel format) */
export const fb15_numberedStepHeaderNonPanel = (() => {
  const body = [
    '3) Kubernetes (Deployment + Service + optional Ingress)',
    '',
    'Create a deployment YAML for your app.',
  ];
  return [
    'stty -echo',
    '\x1b[?2004l',
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
    '\x1b[?2004l',
    '',
    "Loaded models: ['azure/gpt-4']",
    '\x1b[1;96mAI:\x1b[0m ',
    '',
    ...body,
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
  ].join('\n');
})();

/** Cargo.toml: with trailing colon wraps TOML content (non-panel format) */
export const fb15_cargoTomlNonPanel = (() => {
  const body = [
    'Cargo.toml:',
    '',
    '[package]',
    'name = "myapp"',
    'version = "0.1.0"',
    '',
    '[dependencies]',
    'tokio = { version = "1", features = ["full"] }',
    '',
  ];
  return [
    'stty -echo',
    '\x1b[?2004l',
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
    '\x1b[?2004l',
    '',
    "Loaded models: ['azure/gpt-4']",
    '\x1b[1;96mAI:\x1b[0m ',
    '',
    ...body,
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
  ].join('\n');
})();

/** deployment.yaml heading keeps YAML separate from filename (panel format) */
export const fb15_deploymentYamlPanel = makeRaw([
  panelLine('Create this manifest:'),
  panelBlank(),
  boldLine('deployment.yaml'),
  panelBlank(),
  panelLine(' apiVersion: apps/v1'),
  panelLine(' kind: Deployment'),
  panelLine(' metadata:'),
  panelLine('   name: myapp'),
  panelBlank(),
]);

/** src/main.rs: with trailing colon wraps Rust code (non-panel format) */
export const fb15_mainRsNonPanel = (() => {
  const body = ['src/main.rs:', '', 'fn main() {', '    println!("Hello, world!");', '}', ''];
  return [
    'stty -echo',
    '\x1b[?2004l',
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
    '\x1b[?2004l',
    '',
    "Loaded models: ['azure/gpt-4']",
    '\x1b[1;96mAI:\x1b[0m ',
    '',
    ...body,
    '\x1b[?2004hroot@aks-agent-abc123:/app# ',
  ].join('\n');
})();

/** indented numbered step header after Go code is NOT a code block */
export const fb15_numberedStepAfterGoCode = makeRaw([
  boldLine('1. Minimal Go HTTP server'),
  panelBlank(),
  panelLine(' package main'),
  panelLine(' import ('),
  panelLine('     "fmt"'),
  panelLine('     "log"'),
  panelLine('     "net/http"'),
  panelLine('     "os"'),
  panelLine(' )'),
  panelLine(' func main() {'),
  panelLine('     mux := http.NewServeMux()'),
  panelLine('     mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {'),
  panelLine('         fmt.Fprintln(w, "hello from go")'),
  panelLine('     })'),
  panelLine('     port := os.Getenv("PORT")'),
  panelLine('     if port == "" {'),
  panelLine('         port = "8080"'),
  panelLine('     }'),
  panelLine('     addr := "0.0.0.0:" + port'),
  panelLine('     log.Printf("listening on %s\\n", addr)'),
  panelLine('     log.Fatal(http.ListenAndServe(addr, mux))'),
  panelLine(' }'),
  panelBlank(),
  panelLine('    2) Containerize (multi-stage Dockerfile, static binary, nonroot)'),
  panelBlank(),
  panelLine('Create a Dockerfile:'),
]);

/** "Assumptions:" between Go code and Dockerfile — prose, not code */
export const fb15_assumptionsBetweenCodeBlocks = makeRaw([
  boldLine('Go + AKS deployment'),
  panelBlank(),
  boldLine('1. Minimal Go HTTP server (healthz + bind 0.0.0.0:8080)'),
  panelBlank(),
  panelLine(' package main'),
  panelLine(' import ('),
  panelLine('     "fmt"'),
  panelLine('     "net/http"'),
  panelLine(' )'),
  panelLine(' func main() {'),
  panelLine('     mux := http.NewServeMux()'),
  panelLine('     mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {'),
  panelLine('         fmt.Fprintln(w, "hello from go")'),
  panelLine('     })'),
  panelLine('     port := os.Getenv("PORT")'),
  panelLine('     if port == "" {'),
  panelLine('         port = "8080"'),
  panelLine('     }'),
  panelLine('     log.Fatal(http.ListenAndServe(":8080", nil))'),
  panelLine(' }'),
  panelBlank(),
  panelLine('Assumptions:'),
  panelBlank(),
  panelLine('FROM maven:3.9.8-eclipse-temurin-21 AS builder'),
  panelLine('WORKDIR /src'),
  panelLine('COPY pom.xml .'),
  panelLine('COPY src ./src'),
  panelLine('RUN mvn -q -DskipTests package'),
  panelLine('# runtime stage'),
  panelLine('FROM eclipse-temurin:21-jre-jammy'),
  panelLine('WORKDIR /app'),
  panelLine('COPY --from=builder /src/target/*.jar /app/app.jar'),
  panelLine('# optional hardening'),
  panelLine('RUN useradd -r -u 10001 appuser && chown -R 10001:10001 /app'),
  panelLine('USER 10001'),
  panelLine('EXPOSE 8080'),
  panelLine('ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseG1GC"'),
  panelLine('ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]'),
]);
