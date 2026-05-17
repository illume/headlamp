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

import type {
  MCPConfirmationHandler,
  MCPSettingsProvider,
} from '@headlamp-k8s/ai-common/mcp/MCPClientCore';
import { MCPClientCore } from '@headlamp-k8s/ai-common/mcp/MCPClientCore';
import {
  settingsChanges,
  summarizeMcpToolStateChanges,
} from '@headlamp-k8s/ai-common/mcp/mcpServerConfig';
import type { MCPSettings, MCPToolsConfig } from '@headlamp-k8s/ai-common/mcp/types';
import { type BrowserWindow, dialog, ipcMain } from 'electron';
import { loadSettings, saveSettings } from '../settings';

/**
 * Electron-specific MCPSettingsProvider that reads/writes MCP settings
 * from the Headlamp settings.json file on disk.
 */
function createElectronSettingsProvider(settingsPath: string): MCPSettingsProvider {
  return {
    loadMCPSettings(): MCPSettings | null {
      const settings = loadSettings(settingsPath);
      if (!settings || typeof settings !== 'object') {
        return null;
      }
      const mcp = (settings as any).mcp;
      return mcp ? (mcp as MCPSettings) : null;
    },
    saveMCPSettings(mcpSettings: MCPSettings): void {
      const settings = loadSettings(settingsPath);
      settings.mcp = mcpSettings;
      saveSettings(settingsPath, settings);
    },
  };
}

/**
 * Electron-specific MCPConfirmationHandler that shows native dialog boxes
 * for user confirmation of MCP operations.
 */
function createElectronConfirmationHandler(
  getMainWindow: () => BrowserWindow | null
): MCPConfirmationHandler {
  return {
    async confirmSettingsChange(
      currentSettings: MCPSettings | null,
      nextSettings: MCPSettings
    ): Promise<boolean> {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        throw new Error('Main window not set for MCP client');
      }
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
      return result.response === 0;
    },

    async confirmToolsConfigChange(
      currentConfig: MCPToolsConfig,
      nextConfig: MCPToolsConfig
    ): Promise<boolean> {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        throw new Error('Main window not set for MCP client');
      }
      const summary = summarizeMcpToolStateChanges(currentConfig, nextConfig);
      if (summary.totalChanges === 0) {
        return true;
      }
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Apply Changes', 'Cancel'],
        defaultId: 1,
        title: 'MCP Tools Configuration Changes',
        message: `${summary.totalChanges} tool configuration change(s) will be applied:`,
        detail: summary.summaryText + '\n\nDo you want to apply these changes?',
      });
      return result.response === 0;
    },

    async confirmOperation(
      title: string,
      message: string,
      operation: string
    ): Promise<boolean> {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        throw new Error('Main window not set for MCP client');
      }
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Allow', 'Cancel'],
        defaultId: 1,
        title,
        message,
        detail: `Operation: ${operation}\n\nDo you want to allow this MCP operation?`,
      });
      return result.response === 0;
    },
  };
}

/**
 * MCPClient — Electron wrapper around MCPClientCore.
 *
 * Adds Electron IPC handlers and native dialog confirmations on top of
 * the platform-agnostic MCPClientCore from @headlamp-k8s/ai-common.
 *
 * Example:
 * ```ts
 *   const configPath = path.join(app.getPath('userData'), 'mcp-tools-config.json');
 *   const settingsPath = path.join(app.getPath('userData'), 'settings.json');
 *   const mcpClient = new MCPClient(configPath, settingsPath);
 *   await mcpClient.initialize();
 *   mcpClient.setMainWindow(mainWindow);
 *   await mcpClient.handleClustersChange(['cluster-1']);
 *   await mcpClient.cleanup();
 * ```
 */
export default class MCPClient {
  private mainWindow: BrowserWindow | null = null;
  private readonly core: MCPClientCore;

  constructor(configPath: string, settingsPath: string) {
    const settingsProvider = createElectronSettingsProvider(settingsPath);
    const confirmationHandler = createElectronConfirmationHandler(() => this.mainWindow);
    this.core = new MCPClientCore(configPath, settingsProvider, confirmationHandler);
    this.setupIpcHandlers();
  }

  async initialize(): Promise<void> {
    return this.core.initialize();
  }

  async cleanup(): Promise<void> {
    this.mainWindow = null;
    return this.core.cleanup();
  }

  setMainWindow(win: BrowserWindow | null): void {
    this.mainWindow = win;
  }

  async handleClustersChange(newClusters: string[] | null): Promise<void> {
    return this.core.handleClustersChange(newClusters);
  }

  private setupIpcHandlers(): void {
    ipcMain?.handle('mcp-execute-tool', async (_event, { toolName, args, toolCallId }) =>
      this.core.executeTool(toolName, args, toolCallId)
    );
    ipcMain?.handle('mcp-get-status', async () => this.core.getStatus());
    ipcMain?.handle('mcp-reset-client', async () => this.core.resetClient());
    ipcMain?.handle('mcp-update-config', async (_event, mcpSettings: MCPSettings) =>
      this.core.updateConfig(mcpSettings)
    );
    ipcMain?.handle('mcp-get-config', async () => this.core.getConfig());
    ipcMain?.handle('mcp-get-tools-config', async () => this.core.getToolsConfig());
    ipcMain?.handle('mcp-update-tools-config', async (_event, toolsConfig: MCPToolsConfig) =>
      this.core.updateToolsConfig(toolsConfig)
    );
    ipcMain?.handle('mcp-set-tool-enabled', async (_event, { serverName, toolName, enabled }) =>
      this.core.setToolEnabled(serverName, toolName, enabled)
    );
    ipcMain?.handle('mcp-get-tool-stats', async (_event, { serverName, toolName }) =>
      this.core.getToolStats(serverName, toolName)
    );
    ipcMain?.handle('mcp-cluster-change', async (_event, { cluster }) =>
      this.core.clusterChange(cluster)
    );
  }
}
