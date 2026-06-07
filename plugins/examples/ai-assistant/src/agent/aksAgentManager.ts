import { runCommand } from '@kinvolk/headlamp-plugin/lib';
import { clusterRequest, stream } from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { debugLog, detailLog, verboseLog } from '@headlamp-k8s/ai-common/agent/debugLog';
import {
  shellEscapeSingleQuote,
  buildEnrichedPrompt,
  BASE_AKS_AGENT_PROMPT,
  type ConversationEntry,
} from '@headlamp-k8s/ai-common/agent/aksAgentPrompts';
import {
  stripAnsi,
  normalizeBullets,
  looksLikeYaml,
  wrapBareYamlBlocks,
  wrapBareCodeBlocks,
  cleanTerminalFormatting,
  collapseTerminalBlankLines,
  stripAgentNoise,
  isAgentNoiseLine,
  extractAIAnswer,
  stripCommandEcho,
  looksLikeShellOrDockerCodeLine,
  hasShellSyntax,
  normalizeTerminalMarkdown,
  isFileHeaderComment,
  isBoldFileHeading,
  hasStructuredCodeContext,
} from '@headlamp-k8s/ai-common/agent/aksAgentParsing';
import {
  ThinkingStepTracker,
  extractTaskRow,
  friendlyToolLabel,
  type AgentThinkingStep,
  type AgentProgressCallback,
} from '@headlamp-k8s/ai-common/agent/aksAgentThinking';

// ── Re-exports for backward compatibility ────────────────────────────────────
// Consumers that imported types, functions, or _testing from this file
// continue to work without changes.
export {
  shellEscapeSingleQuote,
  BASE_AKS_AGENT_PROMPT,
  buildEnrichedPrompt,
} from '@headlamp-k8s/ai-common/agent/aksAgentPrompts';
export type {
  ConversationEntry,
} from '@headlamp-k8s/ai-common/agent/aksAgentPrompts';
export type {
  AgentThinkingStep,
  AgentProgressCallback,
} from '@headlamp-k8s/ai-common/agent/aksAgentThinking';
export {
  ThinkingStepTracker,
  extractTaskRow,
  friendlyToolLabel,
} from '@headlamp-k8s/ai-common/agent/aksAgentThinking';
export {
  stripAnsi,
  normalizeBullets,
  looksLikeYaml,
  wrapBareYamlBlocks,
  wrapBareCodeBlocks,
  cleanTerminalFormatting,
  collapseTerminalBlankLines,
  stripAgentNoise,
  isAgentNoiseLine,
  extractAIAnswer,
  stripCommandEcho,
  looksLikeShellOrDockerCodeLine,
  hasShellSyntax,
  normalizeTerminalMarkdown,
  isFileHeaderComment,
  isBoldFileHeading,
  hasStructuredCodeContext,
} from '@headlamp-k8s/ai-common/agent/aksAgentParsing';

declare const pluginRunCommand: typeof runCommand;

/** Info about a discovered AKS agent pod. */
export interface AksAgentPodInfo {
  namespace: string;
  podName: string;
  containerName: string;
}

/**
 * Allowed commands that can be executed via pluginRunCommand.
 * Only 'az' is needed for AKS cluster discovery.
 */
const ALLOWED_COMMANDS = new Set(['az']);

/**
 * Allowed first-level subcommands for the az CLI.
 * Only 'aks' operations are permitted.
 */
const ALLOWED_AZ_SUBCOMMANDS = new Set(['aks']);

/**
 * Runs a local command asynchronously using pluginRunCommand.
 * Restricted to allowed commands and subcommands to prevent arbitrary execution.
 */
function runCommandAsync(
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return new Promise(resolve => {
    try {
      if (!ALLOWED_COMMANDS.has(command)) {
        resolve({ stdout: '', stderr: `Command not allowed: ${command}` });
        return;
      }

      if (command === 'az' && (args.length === 0 || !ALLOWED_AZ_SUBCOMMANDS.has(args[0]))) {
        resolve({ stdout: '', stderr: `az subcommand not allowed: ${args[0] ?? '(none)'}` });
        return;
      }

      if (typeof pluginRunCommand === 'undefined') {
        resolve({
          stdout: '',
          stderr:
            'pluginRunCommand is not available. This feature requires the desktop version of Headlamp.',
        });
        return;
      }

      //@ts-ignore - pluginRunCommand accepts 'az' but type def is narrower
      const cmd = pluginRunCommand(command, args, {});
      let stdout = '';
      let stderr = '';

      cmd.stdout.on('data', (data: string) => (stdout += data));
      cmd.stderr.on('data', (data: string) => (stderr += data));
      cmd.on('exit', () => resolve({ stdout, stderr }));
      cmd.on('error', (code: number) =>
        resolve({ stdout: '', stderr: `Command execution error: ${code}` })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      resolve({ stdout: '', stderr: `Failed to execute command: ${errorMessage}` });
    }
  });
}

/**
 * Fetches AKS cluster info from the Headlamp backend config endpoint.
 * Returns objects with { name, server } filtered to AKS clusters (server contains .azmk8s.io).
 */
export async function getClustersFromHeadlampConfig(): Promise<
  Array<{ name: string; server: string }>
> {
  try {
    const response = await fetch('http://localhost:4466/config');
    if (!response.ok) return [];
    const data = await response.json();
    // clusters is an array: [{ name, server, ... }, ...]
    if (Array.isArray(data.clusters)) {
      return data.clusters
        .filter((c: any) => {
          if (!c.server || typeof c.server !== 'string') {
            return false;
          }
          let urlString = c.server as string;
          try {
            // Ensure we have a scheme so that URL parsing works even if server is just a host.
            const hasScheme = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(urlString);
            if (!hasScheme) {
              urlString = 'https://' + urlString;
            }
            const parsed = new URL(urlString);
            const hostname = parsed.hostname.toLowerCase();
            return hostname === 'azmk8s.io' || hostname.endsWith('.azmk8s.io');
          } catch {
            // If the URL cannot be parsed, treat it as not an AKS cluster.
            return false;
          }
        })
        .map((c: any) => ({ name: c.name as string, server: c.server as string }))
        .filter(c => c.name);
    }
    return [];
  } catch (error) {
    console.error('[AKS Agent] Failed to fetch clusters from headlamp config:', error);
    return [];
  }
}

/**
 * Checks if the AKS agent is installed on a cluster by looking for pods
 * whose names start with "aks-" using the Headlamp Kubernetes API proxy.
 * Returns pod info (namespace, podName, containerName) or null if not found.
 */
export async function checkAksAgentInstalled(clusterName: string): Promise<AksAgentPodInfo | null> {
  try {
    // Check running pods across all namespaces for aks- prefix
    const podsResponse = await clusterRequest('/api/v1/pods', {
      method: 'GET',
      cluster: clusterName,
      isJSON: true,
      headers: {
        Accept: 'application/json',
      },
    });

    if (podsResponse?.items) {
      const aksPod = podsResponse.items.find(
        (p: any) =>
          p.metadata?.name?.toLowerCase().startsWith('aks-') && p.status?.phase === 'Running'
      );
      if (aksPod) {
        const namespace = aksPod.metadata?.namespace || 'default';
        const podName = aksPod.metadata?.name;
        // Use the first container in the pod
        const containerName = aksPod.spec?.containers?.[0]?.name || 'aks-agent';
        console.log(
          `[AKS Agent] Found agent pod: ${podName} in namespace: ${namespace}, container: ${containerName}`
        );
        return { namespace, podName, containerName };
      }
    }

    return null;
  } catch (error) {
    console.error(`[AKS Agent] Failed to check AKS agent on cluster "${clusterName}":`, error);
    return null;
  }
}

/**
 * Finds the Azure resource group and AKS cluster name using az CLI.
 * Strategy (in order):
 *  1. FQDN match against az aks list (most reliable — handles renamed kubeconfig contexts)
 *  2. Name match (case-insensitive)
 *  3. If only one AKS cluster exists in the subscription, use it directly
 */
export async function getClusterResourceGroup(
  clusterName: string,
  serverUrl?: string
): Promise<{ resourceGroup: string; aksClusterName: string } | null> {
  // Extract hostname (FQDN) from the server URL
  let fqdn: string | null = null;
  if (serverUrl) {
    try {
      fqdn = new URL(serverUrl).hostname;
    } catch {
      // ignore malformed URL
    }
  }

  try {
    const { stdout, stderr } = await runCommandAsync('az', ['aks', 'list', '-o', 'json']);

    if (!stdout) {
      console.error('[AKS Agent] az aks list returned no output. stderr:', stderr);
      return null;
    }

    let allClusters: any[];
    try {
      allClusters = JSON.parse(stdout);
    } catch {
      console.error('[AKS Agent] Failed to parse az aks list output:', stdout);
      return null;
    }

    if (!Array.isArray(allClusters) || allClusters.length === 0) {
      console.warn('[AKS Agent] az aks list returned no clusters');
      return null;
    }

    // 1. Match by FQDN (server URL hostname) — works even when context name differs from Azure name
    if (fqdn) {
      const match = allClusters.find(c => c.fqdn === fqdn || c.privateFqdn === fqdn);
      if (match) {
        return { resourceGroup: match.resourceGroup, aksClusterName: match.name };
      }
    }

    // 2. Match by cluster name (case-insensitive)
    const nameMatch = allClusters.find(
      c => c.name === clusterName || c.name.toLowerCase() === clusterName.toLowerCase()
    );
    if (nameMatch) {
      return { resourceGroup: nameMatch.resourceGroup, aksClusterName: nameMatch.name };
    }

    // 3. Only one AKS cluster in the subscription — use it directly
    if (allClusters.length === 1) {
      console.info(
        `[AKS Agent] No name/FQDN match for "${clusterName}", using the only available cluster: ${allClusters[0].name}`
      );
      return { resourceGroup: allClusters[0].resourceGroup, aksClusterName: allClusters[0].name };
    }

    console.warn(
      `[AKS Agent] Could not match cluster "${clusterName}" (fqdn: ${fqdn}) among ${allClusters.length} clusters:`,
      allClusters.map(c => ({ name: c.name, fqdn: c.fqdn }))
    );
    return null;
  } catch (error) {
    console.error('[AKS Agent] Failed to get cluster resource group:', error);
    return null;
  }
}

/**
 * Runs a question against the AKS agent pod by exec-ing directly into it
 * via the Kubernetes exec API (WebSocket) through Headlamp's proxy.
 * Returns only the final AI answer (clean, no ANSI codes, bullets normalised).
 *
 * The underlying exec WebSocket session is **reused** across questions to the
 * same cluster/pod so that subsequent questions skip the connection setup
 * overhead.  Call `destroyAgentSession()` to tear down the cached session
 * (e.g. on cluster change or chat-history clear).
 *
 * @param onProgress — optional callback invoked with an updated array of
 *   thinking steps every time a new step is detected in the agent stream.
 */
export async function runAksAgent(
  question: string,
  podInfo: AksAgentPodInfo,
  clusterName: string,
  onProgress?: AgentProgressCallback,
  conversationHistory: ConversationEntry[] = []
): Promise<string> {
  console.log(
    `[AKS Agent] Exec into pod ${podInfo.podName} in namespace ${podInfo.namespace}, cluster ${clusterName}`
  );

  // Build the enriched prompt with base instructions + conversation history
  const enrichedPrompt = buildEnrichedPrompt(question, conversationHistory);

  // Get or create a persistent session for this cluster+pod
  const session = getOrCreateSession(clusterName, podInfo);
  const result = await session.ask(enrichedPrompt, onProgress);

  if (result && result.trim().length > 0) {
    debugLog('[AKS Agent Parse] runAksAgent: raw result length:', result.length, 'result:', result);
    const answer = extractAIAnswer(result);
    console.log(`[AKS Agent] Exec succeeded, extracted answer length: ${answer.length}`);
    if (answer) {
      return answer;
    }
    // extractAIAnswer stripped everything — the agent ran but produced no
    // user-visible answer.  Return a generic message instead of raw noise.
    console.warn('[AKS Agent] extractAIAnswer returned empty — agent output had no AI answer.');
    return 'The agent processed the request but did not produce a final answer. Please try again.';
  }

  throw new Error('No response received from AKS agent pod.');
}

// ─── Persistent Agent Session ────────────────────────────────────────────────

/** Idle timeout: resets every time data arrives.  Only fires on silence. */
const IDLE_TIMEOUT_MS = 120_000; // 2 min
/** Hard wall-clock cap per question so a stuck stream cannot run forever. */
const MAX_WALL_TIMEOUT_MS = 600_000; // 10 min

/** Module-level cached session. */
let activeSession: AgentSession | null = null;

/**
 * Destroy the cached agent exec session.
 * Call this when the user changes cluster or clears chat history so that
 * the next question opens a fresh connection.
 */
export function destroyAgentSession(): void {
  if (activeSession) {
    console.log('[AKS Agent] Destroying cached agent session');
    activeSession.destroy();
    activeSession = null;
  }
}

/**
 * Return an existing session if it matches the requested cluster+pod and is
 * still alive, otherwise create a fresh one.
 */
function getOrCreateSession(clusterName: string, podInfo: AksAgentPodInfo): AgentSession {
  if (
    activeSession &&
    activeSession.isAlive &&
    activeSession.clusterName === clusterName &&
    activeSession.podName === podInfo.podName
  ) {
    console.log('[AKS Agent] Reusing existing exec session');
    return activeSession;
  }

  // Tear down stale session if any
  destroyAgentSession();

  console.log('[AKS Agent] Creating new exec session');
  const session = new AgentSession(clusterName, podInfo);
  session.connect();
  activeSession = session;
  return session;
}

/**
 * Manages a persistent WebSocket exec session to an AKS agent pod.
 *
 * The session opens an interactive bash shell on the pod via the Kubernetes
 * exec API.  Each call to `ask()` sends a `python /app/aks-agent.py ask …
 * --no-interactive` command over stdin and collects the answer.  Between
 * questions the bash shell (and the WebSocket) remain open so the next
 * question avoids the connection-setup overhead.
 */
class AgentSession {
  readonly clusterName: string;
  readonly podName: string;
  private podInfo: AksAgentPodInfo;
  private streamHandle: any = null;
  private _alive = false;
  /** True once the initial bash prompt has been received. */
  private bashReady = false;
  /** True once `stty -echo` has been confirmed active. */
  private echoDisabled = false;
  /** True while `stty -echo` has been sent but not yet confirmed. */
  private sttyInFlight = false;

  // ── Per-question state ──────────────────────────────────────────────────
  private output = '';
  private errorOutput = '';
  private questionResolved = false;
  private commandSent = false;
  private pendingCommand: string | null = null;
  private pendingResolve: ((value: string) => void) | null = null;
  private pendingReject: ((reason: Error) => void) | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private wallTimer: ReturnType<typeof setTimeout> | null = null;
  private tracker: ThinkingStepTracker | null = null;
  private onProgress: AgentProgressCallback | null = null;

  constructor(clusterName: string, podInfo: AksAgentPodInfo) {
    this.clusterName = clusterName;
    this.podName = podInfo.podName;
    this.podInfo = podInfo;
  }

  get isAlive(): boolean {
    return this._alive;
  }

  // ── Connection setup ────────────────────────────────────────────────────

  /** Open the exec WebSocket to the pod's bash shell. */
  connect(): void {
    const { namespace, podName, containerName } = this.podInfo;
    const command = ['bash'];
    const commandStr = command.map(c => '&command=' + encodeURIComponent(c)).join('');
    const url = `/api/v1/namespaces/${namespace}/pods/${podName}/exec?container=${encodeURIComponent(
      containerName
    )}${commandStr}&stdin=1&stderr=1&stdout=1&tty=1`;

    console.log(`[AKS Agent] Session exec URL: ${url}`);

    const additionalProtocols = [
      'v4.channel.k8s.io',
      'v3.channel.k8s.io',
      'v2.channel.k8s.io',
      'channel.k8s.io',
    ];

    this._alive = true;

    this.streamHandle = stream(url, (data: ArrayBuffer | string) => this.handleData(data), {
      isJson: false,
      additionalProtocols,
      cluster: this.clusterName,
      reconnectOnFailure: false,
      failCb: () => this.handleConnectionFailure(),
    });
  }

  // ── Question lifecycle ──────────────────────────────────────────────────

  /**
   * Send a question to the agent and return the raw output.
   * Only one question can be in-flight at a time.
   */
  ask(question: string, onProgress?: AgentProgressCallback): Promise<string> {
    if (!this._alive) {
      return Promise.reject(new Error('Agent session is not alive'));
    }
    if (this.pendingResolve) {
      return Promise.reject(new Error('A question is already in progress'));
    }

    return new Promise<string>((resolve, reject) => {
      // Reset per-question state
      this.output = '';
      this.errorOutput = '';
      this.questionResolved = false;
      this.commandSent = false;
      this.pendingCommand = null;
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.tracker = onProgress ? new ThinkingStepTracker() : null;
      this.onProgress = onProgress ?? null;

      const escapedQuestion = shellEscapeSingleQuote(question);
      const pythonCommand = `python /app/aks-agent.py ask ${escapedQuestion} --no-interactive`;

      if (this.bashReady) {
        // Bash is already at its prompt — send immediately
        this.sendStdin(pythonCommand + '\n');
        this.commandSent = true;
        console.log('[AKS Agent] Sent command on existing session');
      } else {
        // First question — wait for initial bash prompt to trigger sending
        this.pendingCommand = pythonCommand;
        console.log('[AKS Agent] Waiting for bash prompt before sending command');
      }

      this.startIdleTimer();
      this.startWallTimer();
    });
  }

  /** Tear down the session and close the WebSocket. */
  destroy(): void {
    this._alive = false;
    this.clearTimers();

    // Reject any in-flight question
    if (this.pendingReject && !this.questionResolved) {
      this.questionResolved = true;
      this.pendingReject(new Error('Agent session destroyed'));
    }
    this.pendingResolve = null;
    this.pendingReject = null;

    if (this.streamHandle) {
      try {
        this.streamHandle.cancel();
      } catch {
        /* ignore */
      }
      this.streamHandle = null;
    }
  }

  // ── Data handling ───────────────────────────────────────────────────────

  private handleData(data: ArrayBuffer | string): void {
    if (!this._alive) return;

    if (data instanceof ArrayBuffer) {
      const bytes = new Uint8Array(data);
      const channel = bytes[0];
      const text = new TextDecoder().decode(bytes.slice(1));
      debugLog(
        '[AKS Agent Data] handleData: ArrayBuffer channel:',
        channel,
        'text length:',
        text.length,
        'text:',
        text
      );

      this.handleChannel(channel, text);
    } else {
      // Plain string data (base64 protocol)
      debugLog('[AKS Agent Data] handleData: string data length:', data.length);
      console.log('[AKS Agent] string data from exec:', data);
      this.output += data;
    }
  }

  private handleChannel(channel: number, text: string): void {
    detailLog('[AKS Agent Data] handleChannel:', channel, 'text length:', text.length);
    if (channel === 1) {
      this.handleStdout(text);
    } else if (channel === 2) {
      this.handleStderr(text);
    } else if (channel === 3) {
      this.handleStatusChannel();
    }
  }

  private handleStdout(text: string): void {
    // ── Phase 0: Disable terminal echo on very first stdout ──
    // Sending `stty -echo` prevents the TTY from echoing multi-line commands
    // back through stdout, which would otherwise pollute the output with the
    // full conversation history embedded in the prompt.
    if (!this.echoDisabled) {
      if (!this.sttyInFlight) {
        // First stdout ever (initial bash prompt) — send stty -echo
        this.sendStdin('stty -echo\n');
        this.sttyInFlight = true;
        console.log('[AKS Agent] Sent stty -echo to disable terminal echo');
        return;
      }
      // Waiting for stty to complete — look for the bash prompt
      const plainStty = stripAnsi(text);
      if (/root@[^:]+:[^#]*#\s*$/.test(plainStty.trim())) {
        this.echoDisabled = true;
        this.bashReady = true;
        console.log('[AKS Agent] Terminal echo disabled, bash ready');
        // If ask() has already queued a command, send it now
        if (!this.commandSent && this.pendingCommand) {
          this.sendStdin(this.pendingCommand + '\n');
          this.commandSent = true;
          this.pendingCommand = null;
          console.log('[AKS Agent] Sent initial command after echo disabled');
        }
      }
      return; // Don't add stty-related output to command output
    }

    // ── First-time initialisation (fallback): send the stored command when bash is ready
    if (!this.bashReady && !this.commandSent && this.pendingCommand) {
      const socket = this.getSocket();
      if (socket && socket.readyState === WebSocket.OPEN) {
        this.sendStdin(this.pendingCommand + '\n');
        this.commandSent = true;
        this.bashReady = true;
        this.pendingCommand = null;
        console.log('[AKS Agent] Sent initial command after bash prompt');
      }
    }

    // If no question in flight, ignore (e.g. stray bash output between questions)
    if (this.questionResolved || !this.pendingResolve) return;

    this.resetIdleTimer();
    debugLog(
      '[AKS Agent Data] handleStdout: chunk length:',
      text.length,
      'accumulated output length:',
      this.output.length,
      'chunk:',
      text
    );

    // Ensure each terminal line chunk is newline-terminated.
    this.output += text.endsWith('\n') ? text : text + '\n';

    // Feed each line to the thinking-step tracker for live progress
    if (this.tracker && this.onProgress) {
      const chunkLines = stripAnsi(text).split('\n');
      let anyChanged = false;
      for (const cl of chunkLines) {
        if (this.tracker.processLine(cl)) anyChanged = true;
      }
      if (anyChanged) {
        detailLog(
          '[AKS Agent Data] handleStdout: thinking steps updated, count:',
          this.tracker.steps.length
        );
        this.onProgress([...this.tracker.steps]);
      }
    }

    // Detect the returning bash prompt — the command has finished.
    // Only close once we've already seen "AI:" in the output.
    const plainText = stripAnsi(text);
    const hasAiMarker = this.output.includes('AI:');
    const hasPrompt = /root@[^:]+:[^#]*#\s*$/.test(plainText.trim());
    detailLog(
      '[AKS Agent Data] handleStdout: completion check — commandSent:',
      this.commandSent,
      'hasAiMarker:',
      hasAiMarker,
      'hasPrompt:',
      hasPrompt
    );
    if (this.commandSent && hasAiMarker && hasPrompt) {
      console.log('[AKS Agent] Bash prompt detected after AI answer — question complete.');
      debugLog('[AKS Agent Data] handleStdout: total output length:', this.output.length);
      this.resolveCurrentQuestion(this.output);
    }
  }

  private handleStderr(text: string): void {
    if (this.questionResolved || !this.pendingResolve) return;
    this.resetIdleTimer();
    this.errorOutput += text;
    debugLog('[AKS Agent Data] handleStderr: stderr chunk length:', text.length, 'text:', text);
    console.warn(`[AKS Agent] exec stderr: ${text}`);
  }

  private handleStatusChannel(): void {
    // Status channel — the exec process exited (bash terminated).
    // The session is no longer usable.
    console.log(
      `[AKS Agent] Exec completed via status channel. stdout length: ${this.output.length}, stderr length: ${this.errorOutput.length}`
    );
    this._alive = false;

    if (!this.questionResolved && this.pendingResolve) {
      this.resolveCurrentQuestion(this.output || this.errorOutput);
    }
  }

  private handleConnectionFailure(): void {
    this._alive = false;
    this.clearTimers();
    debugLog(
      '[AKS Agent Session] handleConnectionFailure: stdout length:',
      this.output.length,
      'stderr length:',
      this.errorOutput.length,
      'questionResolved:',
      this.questionResolved
    );
    console.warn(
      `[AKS Agent] WebSocket closed. stdout: ${this.output.length}, stderr: ${this.errorOutput.length}`
    );

    if (!this.questionResolved && this.pendingResolve) {
      if (this.output.trim()) {
        this.resolveCurrentQuestion(this.output);
      } else if (this.errorOutput.trim()) {
        this.questionResolved = true;
        const reject = this.pendingReject;
        this.pendingResolve = null;
        this.pendingReject = null;
        reject?.(new Error(`AKS agent error: ${this.errorOutput.trim()}`));
      } else {
        this.questionResolved = true;
        const reject = this.pendingReject;
        this.pendingResolve = null;
        this.pendingReject = null;
        reject?.(new Error('WebSocket connection to agent pod failed'));
      }
    }

    // Invalidate so next call creates a fresh session
    if (activeSession === this) {
      activeSession = null;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Resolve the in-flight question Promise and reset per-question state. */
  private resolveCurrentQuestion(result: string): void {
    this.clearTimers();
    this.questionResolved = true;
    debugLog(
      '[AKS Agent Session] resolveCurrentQuestion: output length:',
      result.length,
      'has AI: marker:',
      result.includes('AI:'),
      'output:',
      result
    );
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    this.pendingReject = null;
    this.tracker = null;
    this.onProgress = null;
    resolve?.(result);
  }

  /** Send text to stdin of the exec session. */
  private sendStdin(text: string): void {
    const socket = this.getSocket();
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('[AKS Agent] Cannot send stdin — socket not open');
      return;
    }
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    const buffer = new Uint8Array([0, ...encoded]); // 0 = stdin channel
    socket.send(buffer);
  }

  private getSocket(): WebSocket | null {
    try {
      return this.streamHandle?.getSocket?.() ?? null;
    } catch {
      return null;
    }
  }

  // ── Timers ──────────────────────────────────────────────────────────────

  private startIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (!this.questionResolved && this.pendingResolve) {
        if (this.output.trim()) {
          console.log('[AKS Agent] Idle timeout — returning partial output');
          this.resolveCurrentQuestion(this.output);
        } else {
          this.questionResolved = true;
          const reject = this.pendingReject;
          this.pendingResolve = null;
          this.pendingReject = null;
          reject?.(new Error(`Exec timed out after ${IDLE_TIMEOUT_MS / 1000}s of inactivity`));
        }
      }
    }, IDLE_TIMEOUT_MS);
  }

  private resetIdleTimer(): void {
    this.startIdleTimer();
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private startWallTimer(): void {
    this.clearWallTimer();
    this.wallTimer = setTimeout(() => {
      if (!this.questionResolved && this.pendingResolve) {
        this.clearIdleTimer();
        if (this.output.trim()) {
          console.log('[AKS Agent] Wall-clock timeout — returning partial output');
          this.resolveCurrentQuestion(this.output);
        } else {
          this.questionResolved = true;
          const reject = this.pendingReject;
          this.pendingResolve = null;
          this.pendingReject = null;
          reject?.(new Error(`Exec timed out after ${MAX_WALL_TIMEOUT_MS / 1000}s total`));
        }
      }
    }, MAX_WALL_TIMEOUT_MS);
  }

  private clearWallTimer(): void {
    if (this.wallTimer) {
      clearTimeout(this.wallTimer);
      this.wallTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearIdleTimer();
    this.clearWallTimer();
  }
}

// Exported for testing — these are internal parsing helpers that
// need thorough test coverage for correctness.
// Re-exported from ai-common for backward compatibility.
export const _testing = {
  stripAnsi,
  normalizeBullets,
  looksLikeYaml,
  wrapBareYamlBlocks,
  wrapBareCodeBlocks,
  cleanTerminalFormatting,
  collapseTerminalBlankLines,
  stripAgentNoise,
  isAgentNoiseLine,
  extractAIAnswer,
  ThinkingStepTracker,
  extractTaskRow,
  friendlyToolLabel,
  stripCommandEcho,
  looksLikeShellOrDockerCodeLine,
  hasShellSyntax,
  normalizeTerminalMarkdown,
  isFileHeaderComment,
  isBoldFileHeading,
  hasStructuredCodeContext,
};
