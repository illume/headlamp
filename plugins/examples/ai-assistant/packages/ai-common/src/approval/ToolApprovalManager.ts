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

import { EventEmitter } from 'events';

export interface ToolCall {
  id: string;
  name: string;
  description?: string;
  arguments: Record<string, any>;
  type: 'mcp' | 'regular';
}

export interface ToolApprovalRequest {
  requestId: string;
  toolCalls: ToolCall[];
  resolve: (approvedToolIds: string[]) => void;
  reject: (error: Error) => void;
}

/**
 * Pluggable approval handler interface.
 *
 * Consumers (CLI, eval frameworks, TUI) implement this to control
 * how tool-execution requests are approved or denied.
 *
 * Built-in strategies:
 *   - `autoApproveAll()` — approves every tool call (useful for evals)
 *   - Default (no handler set) — emits 'approval-requested' event for UI
 */
export interface ToolApprovalHandler {
  /**
   * Called when tools need human/programmatic approval.
   * Return the IDs of the approved tool calls; throw or return [] to deny.
   */
  handleApproval(toolCalls: ToolCall[]): Promise<string[]>;
}

/**
 * Built-in handler that auto-approves every tool call.
 * Use for eval frameworks or non-interactive CLI runs.
 */
export function autoApproveAll(): ToolApprovalHandler {
  return {
    async handleApproval(toolCalls: ToolCall[]) {
      return toolCalls.map(t => t.id);
    },
  };
}

export class ToolApprovalManager extends EventEmitter {
  private static instance: ToolApprovalManager | null = null;
  private pendingRequest: ToolApprovalRequest | null = null;
  private autoApproveSettings: Map<string, boolean> = new Map();
  private sessionAutoApproval: boolean = false;
  private approvalHandler: ToolApprovalHandler | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): ToolApprovalManager {
    if (!ToolApprovalManager.instance) {
      ToolApprovalManager.instance = new ToolApprovalManager();
    }
    return ToolApprovalManager.instance;
  }

  /**
   * Set a custom approval handler.
   *
   * When set, `requestApproval` delegates to this handler instead of
   * emitting 'approval-requested' events.  Pass `null` to revert to
   * the default event-based flow (used by the React UI).
   *
   * Example (CLI auto-approve):
   *   toolApprovalManager.setApprovalHandler(autoApproveAll());
   *
   * Example (terminal prompt):
   *   toolApprovalManager.setApprovalHandler({
   *     async handleApproval(tools) { ... prompt user ... }
   *   });
   */
  public setApprovalHandler(handler: ToolApprovalHandler | null): void {
    this.approvalHandler = handler;
  }

  /**
   * Request approval for tool execution
   */
  public async requestApproval(toolCalls: ToolCall[]): Promise<string[]> {
    // Check if session auto-approval is enabled
    if (this.sessionAutoApproval) {
      return toolCalls.map(tool => tool.id);
    }

    // Check for individual tool auto-approvals
    const autoApprovedTools: string[] = [];
    const needsApprovalTools: ToolCall[] = [];

    for (const tool of toolCalls) {
      if (this.autoApproveSettings.get(tool.name)) {
        autoApprovedTools.push(tool.id);
      } else {
        needsApprovalTools.push(tool);
      }
    }

    // If all tools are auto-approved, return them
    if (needsApprovalTools.length === 0) {
      return autoApprovedTools;
    }

    // If a custom approval handler is set, delegate to it
    if (this.approvalHandler) {
      const approvedIds = await this.approvalHandler.handleApproval(needsApprovalTools);
      return [...autoApprovedTools, ...approvedIds];
    }

    // Default: event-based flow for UI components
    // If there's already a pending request, reject the previous one
    if (this.pendingRequest) {
      this.pendingRequest.reject(new Error('Request superseded by new tool approval request'));
    }

    return new Promise<string[]>((resolve, reject) => {
      const requestId = `tool-approval-${Date.now()}-${Math.random()}`;

      this.pendingRequest = {
        requestId,
        toolCalls: needsApprovalTools,
        resolve: (approvedToolIds: string[]) => {
          // Combine auto-approved and manually approved tools
          const allApprovedIds = [...autoApprovedTools, ...approvedToolIds];
          this.pendingRequest = null;
          resolve(allApprovedIds);
        },
        reject: (error: Error) => {
          this.pendingRequest = null;
          reject(error);
        },
      };

      // Emit event for UI components to listen to
      this.emit('approval-requested', this.pendingRequest);
    });
  }

  /**
   * Approve tools from the UI
   */
  public approveTools(requestId: string, approvedToolIds: string[], rememberChoice = false): void {
    if (!this.pendingRequest || this.pendingRequest.requestId !== requestId) {
      console.warn('No matching pending request for approval:', requestId);
      return;
    }

    // Handle remember choice
    if (rememberChoice) {
      // If all tools were approved, enable session auto-approval
      const allToolIds = this.pendingRequest.toolCalls.map(tool => tool.id);
      if (approvedToolIds.length === allToolIds.length) {
        this.sessionAutoApproval = true;
      } else {
        // Remember individual tool approvals
        for (const toolCall of this.pendingRequest.toolCalls) {
          if (approvedToolIds.includes(toolCall.id)) {
            this.autoApproveSettings.set(toolCall.name, true);
          }
        }
      }
    }

    this.pendingRequest.resolve(approvedToolIds);
  }

  /**
   * Deny all tools from the UI
   */
  public denyTools(requestId: string): void {
    if (!this.pendingRequest || this.pendingRequest.requestId !== requestId) {
      console.warn('No matching pending request for denial:', requestId);
      return;
    }

    this.pendingRequest.reject(new Error('User denied tool execution'));
  }

  /**
   * Get current pending request
   */
  public getPendingRequest(): ToolApprovalRequest | null {
    return this.pendingRequest;
  }

  /**
   * Clear session settings (called when user explicitly clears or starts new session)
   */
  public clearSession(): void {
    this.sessionAutoApproval = false;
    this.autoApproveSettings.clear();
  }

  /**
   * Set session auto-approval
   */
  public setSessionAutoApproval(enabled: boolean): void {
    this.sessionAutoApproval = enabled;
  }

  /**
   * Check if session auto-approval is enabled
   */
  public isSessionAutoApprovalEnabled(): boolean {
    return this.sessionAutoApproval;
  }

  /**
   * Get auto-approval settings for debugging
   */
  public getAutoApprovalSettings(): {
    sessionAutoApproval: boolean;
    toolSettings: Array<{ toolName: string; autoApprove: boolean }>;
  } {
    return {
      sessionAutoApproval: this.sessionAutoApproval,
      toolSettings: Array.from(this.autoApproveSettings.entries()).map(
        ([toolName, autoApprove]) => ({
          toolName,
          autoApprove,
        })
      ),
    };
  }
}

// Export singleton instance
export const toolApprovalManager = ToolApprovalManager.getInstance();
