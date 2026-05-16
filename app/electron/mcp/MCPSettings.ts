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

import type { MCPSettings } from '@headlamp-k8s/ai-common';
import {
  hasClusterDependentServers as hasClusterDependentServersFromSettings,
  makeMcpServers,
  settingsChanges,
} from '@headlamp-k8s/ai-common';
import type { ClientConfig } from '@langchain/mcp-adapters';
import { type BrowserWindow, dialog } from 'electron';
import { loadSettings, saveSettings } from '../settings';

export type { MCPSettings } from '@headlamp-k8s/ai-common';
export { expandEnvAndResolvePaths, settingsChanges } from '@headlamp-k8s/ai-common';

/**
 * Load MCP server configuration from settings
 *
 * @param settingsPath - path to settings file
 * @returns MCP settings or null if not found
 */
export function loadMCPSettings(settingsPath: string): MCPSettings | null {
  const settings = loadSettings(settingsPath);
  if (!settings || typeof settings !== 'object') {
    return null;
  }

  const mcp = (settings as any).mcp;
  return mcp ? (mcp as MCPSettings) : null;
}

/**
 * Save MCP server configuration to settings
 *
 * @param settingsPath - path to settings file
 * @param mcpSettings - MCP settings to save
 */
export function saveMCPSettings(settingsPath: string, mcpSettings: MCPSettings): void {
  const settings = loadSettings(settingsPath);
  settings.mcp = mcpSettings;
  saveSettings(settingsPath, settings);
}

/**
 * Make mpcServers from settings for the mpcServers arg of MultiServerMCPClient.
 *
 * @param settingsPath - path to settings file
 * @param clusters - list of current clusters
 *
 * @returns Record of MCP servers
 */
export function makeMcpServersFromSettings(
  settingsPath: string,
  clusters: string[]
): ClientConfig['mcpServers'] {
  const mcpSettings = loadMCPSettings(settingsPath);
  return makeMcpServers(mcpSettings, clusters);
}

/**
 * Shows a dialog asking user for confirmation if MCP settings changes are ok.
 *
 * Displays a summary of changes between currentSettings and nextSettings.
 *
 * @param mainWindow - The main BrowserWindow to parent the dialog.
 * @param currentSettings - Current MCP settings, or null if none exists.
 * @param nextSettings - New MCP settings to be applied.
 *
 * @returns Promise resolving to true if user approves changes, false if cancelled.
 */
export async function showSettingsChangeDialog(
  mainWindow: BrowserWindow,
  currentSettings: MCPSettings | null,
  nextSettings: MCPSettings
): Promise<boolean> {
  const changes = settingsChanges(currentSettings, nextSettings);
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Apply Changes', 'Cancel'],
    defaultId: 1,
    title: 'MCP Settings Changes',
    message: 'The application wants to update the MCP settings.',
    detail:
      changes.length > 0
        ? `The following changes will be applied:\n\n${changes.join(
            '\n'
          )}\n\nDo you want to apply these changes?`
        : 'No changes detected in the MCP settings.\n\nDo you want to proceed anyway?',
  });
  return result.response === 0; // 0 is "Apply Changes"
}

/**
 * Check if any server in the settings uses HEADLAMP_CURRENT_CLUSTER placeholder.
 * This determines whether the MCP client needs to be restarted on cluster changes.
 *
 * @param settingsPath - path to settings file
 *
 * @returns True if any enabled server has HEADLAMP_CURRENT_CLUSTER in its arguments
 */
export function hasClusterDependentServers(settingsPath: string): boolean {
  return hasClusterDependentServersFromSettings(loadMCPSettings(settingsPath));
}
