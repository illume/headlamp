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

import type { MCPToolsConfig } from '@headlamp-k8s/ai-common/mcp/types';
import { summarizeMcpToolStateChanges } from '@headlamp-k8s/ai-common/mcp/utils';
import { type BrowserWindow, dialog } from 'electron';

export type { MCPToolState, MCPServerToolState, MCPToolsConfig } from '@headlamp-k8s/ai-common/mcp/types';
export { MCPToolStateStore } from '@headlamp-k8s/ai-common/mcp/MCPToolStateStore';
export {
  parseServerNameToolName,
  validateToolArgs,
  summarizeMcpToolStateChanges,
} from '@headlamp-k8s/ai-common/mcp/utils';

/**
 * Show detailed confirmation dialog for tools configuration changes.
 * Compares current and new configurations and displays a summary of changes.
 *
 * @param mainWindow - The main BrowserWindow to parent the dialog.
 * @param currentConfig - The current configuration.
 * @param nextConfig - The new configuration to be applied.
 *
 * @returns Promise resolving to true if user approves changes, false otherwise
 */
export async function showToolsConfigConfirmationDialog(
  mainWindow: BrowserWindow,
  currentConfig: MCPToolsConfig,
  nextConfig: MCPToolsConfig
): Promise<boolean> {
  const summary = summarizeMcpToolStateChanges(currentConfig, nextConfig);
  if (summary.totalChanges === 0) {
    return true; // No changes, allow operation
  }
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Apply Changes', 'Cancel'],
    defaultId: 1,
    title: 'MCP Tools Configuration Changes',
    message: `${summary.totalChanges} tool configuration change(s) will be applied:`,
    detail: summary.summaryText + '\n\nDo you want to apply these changes?',
  });
  return result.response === 0; // 0 is "Apply Changes"
}
