/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Agent thinking step tracking — state machine that converts streaming
 * terminal output into structured progress steps shown to the user.
 *
 * Pure business logic — no headlamp-plugin dependency.
 */

import { verboseLog } from './debugLog';

/** A single thinking step shown to the user while the agent is working. */
export interface AgentThinkingStep {
  /** Monotonic identifier for the thinking step. */
  id: number;
  /** User-friendly description */
  label: string;
  /** Current state of this step */
  status: 'pending' | 'running' | 'completed';
  /** epoch millis when the step was created / last updated */
  timestamp: number;
  /**
   * Phase this step belongs to.
   * - 'init'      → toolset / model loading
   * - 'planning'  → TodoWrite task list items
   * - 'executing' → kubectl / tool calls
   */
  phase: 'init' | 'planning' | 'executing';
}

/** Callback invoked repeatedly as the agent streams thinking progress. */
export type AgentProgressCallback = (steps: AgentThinkingStep[]) => void;

/**
 * Map a raw "Running tool #N <toolname>: ..." line to a friendly label.
 * Returns null for tools that are tracked elsewhere (TodoWrite, kubectl).
 */
export function friendlyToolLabel(rawToolLine: string): string | null {
  const match = rawToolLine.match(/^Running tool\s+#\d+\s+(.+)/);
  if (!match) return 'Running tool';

  const toolPart = match[1].trim();

  if (/^call_kubectl/i.test(toolPart)) return null; // tracked via task table, skip
  if (/^TodoWrite/i.test(toolPart)) return null; // handled separately, skip
  if (/^web_search/i.test(toolPart)) return 'Searching the web';
  if (/^read_file|file_read/i.test(toolPart)) return 'Reading file';

  const colonIdx = toolPart.indexOf(':');
  const name = colonIdx > 0 ? toolPart.slice(0, colonIdx).trim() : toolPart;
  return `Running ${name}`;
}

/**
 * Extract a task description + status from a task-list table row.
 * Returns { content, status } or null.
 *
 * Input examples:
 *   `| t1 | List all pods across all namespaces in AKS cluster | [~] in_progress |`
 *   `| t2 | Filter pods whose name contains 'gadget'           | [✓] completed   |`
 *   `| t3 | Verify and present the matching pods                | [ ] pending     |`
 */
export function extractTaskRow(
  line: string
): { content: string; status: 'pending' | 'in_progress' | 'completed' } | null {
  // Use [^|]* (greedy, no surrounding \s*) and trim the capture to avoid
  // polynomial backtracking (CodeQL js/polynomial-redos).
  const m = line.match(
    /^\|\s*t\d+\s*\|([^|]*)\|\s*\[(.)\]\s*(pending|in_progress|completed)\s*\|$/
  );
  if (!m) return null;
  const statusMap: Record<string, 'pending' | 'in_progress' | 'completed'> = {
    ' ': 'pending',
    '~': 'in_progress',
    '✓': 'completed',
  };
  return { content: m[1].trim(), status: statusMap[m[2]] || (m[3] as any) };
}

/**
 * State tracker for building thinking steps from streaming output.
 * Call `processLine()` for each new line and read `steps` for current state.
 *
 * Phases:
 *  init      – model loading, toolset loading
 *  planning  – TodoWrite task items (the actual investigation plan)
 *  executing – kubectl and other tool calls
 */
export class ThinkingStepTracker {
  steps: AgentThinkingStep[] = [];
  private nextId = 1;
  /** Map of tool call # → step id so we can mark them completed */
  private toolIdMap = new Map<number, number>();
  /** Track which task labels we've already added (by content) */
  private knownTasks = new Map<string, number>(); // content → step id
  /** Buffer for task-table rows that wrap across multiple terminal lines */
  private partialTaskRow = '';

  /** Process a single cleaned (ANSI-stripped, trimmed-end) line. Returns true if steps changed. */
  processLine(line: string): boolean {
    const trimmed = line.trim();

    // ── Handle partial (wrapped) task-table row buffering ──
    if (this.partialTaskRow) {
      // Blank line, table border, table header, or new task row → abandon partial, fall through
      if (!trimmed || /^\+[-+=]+\+$/.test(trimmed) || /^\|\s*(ID|t\d+)\s*\|/.test(trimmed)) {
        verboseLog('[AKS Agent Parse] ThinkingStepTracker: abandoning partial task row');
        this.partialTaskRow = '';
        // Fall through to normal processing below
      } else {
        // Continuation of the wrapped row — join, collapse whitespace, try to parse
        const joined = (this.partialTaskRow + ' ' + trimmed).replace(/\s+/g, ' ').trim();
        const taskRow = extractTaskRow(joined);
        if (taskRow) {
          verboseLog(
            '[AKS Agent Parse] ThinkingStepTracker: completed wrapped task row:',
            taskRow.content,
            taskRow.status
          );
          this.partialTaskRow = '';
          return this.applyTaskRow(taskRow);
        }
        // If the joined text ends with `|` but still didn't match, give up
        if (/\|\s*$/.test(trimmed)) {
          this.partialTaskRow = '';
        }
        return false;
      }
    }

    if (!trimmed) return false;
    let changed = false;

    // ── Init phase: model loading ──
    const modelMatch = trimmed.match(/^Loaded models:\s*\[(.+)\]/);
    if (modelMatch) {
      const models = modelMatch[1].replace(/'/g, '').trim();
      verboseLog('[AKS Agent Parse] ThinkingStepTracker: model loaded:', models);
      this.steps.push({
        id: this.nextId++,
        label: `Model: ${models}`,
        status: 'completed',
        phase: 'init',
        timestamp: Date.now(),
      });
      return true;
    }

    // ── Init phase: toolset loaded ──
    const toolsetMatch = trimmed.match(/^[✅⚠️❌]\s*Toolset\s+(.+)/);
    if (toolsetMatch) {
      const toolsetName = toolsetMatch[1].trim();
      this.steps.push({
        id: this.nextId++,
        label: `Toolset: ${toolsetName}`,
        status: 'completed',
        phase: 'init',
        timestamp: Date.now(),
      });
      return true;
    }

    // ── Init phase: Using model line (marks init as done) ──
    if (/^Using model:/i.test(trimmed)) {
      // We don't add a step but we mark all init steps completed (they should be already)
      return false;
    }

    // ── "Thinking..." indicator ──
    if (/^Thinking\.{3}$/i.test(trimmed)) {
      // Don't add a separate step; the planning phase will start shortly
      return false;
    }

    // ── Planning phase: task-list rows ──
    const taskRow = extractTaskRow(trimmed);
    if (taskRow) {
      verboseLog(
        '[AKS Agent Parse] ThinkingStepTracker: task row:',
        taskRow.content,
        taskRow.status
      );
      return this.applyTaskRow(taskRow);
    }
    // Start buffering if this looks like a partial (wrapped) task row
    if (/^\|\s*t\d+\s*\|/.test(trimmed)) {
      verboseLog('[AKS Agent Parse] ThinkingStepTracker: buffering partial task row');
      this.partialTaskRow = trimmed;
      return false;
    }

    // ── Executing phase: Running tool #N ──
    const runMatch = trimmed.match(/^Running tool\s+#(\d+)\s+/);
    if (runMatch) {
      const toolNum = parseInt(runMatch[1], 10);
      verboseLog('[AKS Agent Parse] ThinkingStepTracker: running tool #' + toolNum + ':', trimmed);
      // Skip TodoWrite and kubectl tools — they're tracked via the task table
      if (/TodoWrite/i.test(trimmed) || /call_kubectl/i.test(trimmed)) {
        // Still record the tool number so we can mark it finished without noise
        this.toolIdMap.set(toolNum, -1);
        return false;
      }
      const label = friendlyToolLabel(trimmed);
      if (!label) return false; // friendlyToolLabel returns null for TodoWrite
      const stepId = this.nextId++;
      this.toolIdMap.set(toolNum, stepId);
      this.steps.push({
        id: stepId,
        label,
        status: 'running',
        phase: 'executing',
        timestamp: Date.now(),
      });
      return true;
    }

    // ── Executing phase: Finished #N ──
    const finMatch = trimmed.match(/^Finished\s+#(\d+)\s+in\b/);
    if (finMatch) {
      const toolNum = parseInt(finMatch[1], 10);
      const stepId = this.toolIdMap.get(toolNum);
      if (stepId !== null && stepId !== undefined && stepId !== -1) {
        const step = this.steps.find(s => s.id === stepId);
        if (step && step.status !== 'completed') {
          step.status = 'completed';
          step.timestamp = Date.now();
          changed = true;
        }
      }
      return changed;
    }

    return false;
  }

  /** Apply a parsed task row to the steps list. Returns true if steps changed. */
  private applyTaskRow(taskRow: {
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
  }): boolean {
    const existingId = this.knownTasks.get(taskRow.content);
    if (existingId !== undefined) {
      // Update existing task step
      const step = this.steps.find(s => s.id === existingId);
      if (step) {
        const newStatus: AgentThinkingStep['status'] =
          taskRow.status === 'completed'
            ? 'completed'
            : taskRow.status === 'in_progress'
            ? 'running'
            : 'pending';
        if (newStatus !== step.status) {
          step.status = newStatus;
          step.timestamp = Date.now();
          return true;
        }
      }
      return false;
    }
    // New task
    const stepStatus: AgentThinkingStep['status'] =
      taskRow.status === 'completed'
        ? 'completed'
        : taskRow.status === 'in_progress'
        ? 'running'
        : 'pending';
    const sid = this.nextId++;
    this.knownTasks.set(taskRow.content, sid);
    this.steps.push({
      id: sid,
      label: taskRow.content,
      status: stepStatus,
      phase: 'planning',
      timestamp: Date.now(),
    });
    return true;
  }
}
