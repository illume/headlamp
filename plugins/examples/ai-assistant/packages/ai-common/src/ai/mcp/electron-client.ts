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

// Frontend MCP client that communicates with Electron main process
// This replaces the direct MCP client import to avoid spawn issues in renderer process

/** Describes an MCP tool exposed by the Electron bridge. */
interface MCPTool {
  /** Unique tool name, optionally prefixed with its server. */
  name: string;
  /** Optional description shown in tool listings. */
  description?: string;
  /** JSON schema describing accepted input arguments. */
  inputSchema?: any;
  /** MCP server that provides the tool. */
  server?: string;
}

/** Represents a response returned from Electron MCP APIs. */
interface MCPResponse {
  /** Whether the Electron-side operation succeeded. */
  success: boolean;
  /** Tools returned by list operations. */
  tools?: MCPTool[];
  /** Arbitrary result payload from tool execution. */
  result?: any;
  /** Error message returned when the operation fails. */
  error?: string;
  /** Tool call identifier echoed back from execution requests. */
  toolCallId?: string;
}

/** Defines the MCP methods exposed on the Electron desktop API bridge. */
interface ElectronMCPApi {
  /** Retrieves the available MCP tools. */
  getTools: () => Promise<MCPResponse>;
  /** Executes a named MCP tool with the provided arguments. */
  executeTool: (
    toolName: string,
    args: Record<string, any>,
    toolCallId?: string
  ) => Promise<MCPResponse>;
  /** Returns initialization state for the Electron MCP client. */
  getStatus: () => Promise<{ isInitialized: boolean; hasClient: boolean }>;
  /** Resets the Electron MCP client. */
  resetClient: () => Promise<MCPResponse>;
  /** Reads the persisted MCP server configuration. */
  getConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
  /** Updates the persisted MCP server configuration. */
  updateConfig: (config: any) => Promise<MCPResponse>;
  /** Reads per-tool MCP configuration. */
  getToolsConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
  /** Updates per-tool MCP configuration. */
  updateToolsConfig: (config: any) => Promise<MCPResponse>;
  /** Enables or disables a specific tool on a server. */
  setToolEnabled: (serverName: string, toolName: string, enabled: boolean) => Promise<MCPResponse>;
  /** Retrieves usage stats for a specific tool. */
  getToolStats: (
    serverName: string,
    toolName: string
  ) => Promise<{ success: boolean; stats?: any; error?: string }>;
}

// desktopApi is already declared on Window by @kinvolk/headlamp-plugin as `any`.
// We use a helper to access it with proper typing.
/** Returns the Electron MCP bridge when it is available on the desktop API. */
function getDesktopMCPApi(): ElectronMCPApi | undefined {
  const api = (window as any).desktopApi;
  if (api && typeof api.mcp !== 'undefined') {
    return api.mcp as ElectronMCPApi;
  }
  return undefined;
}
// Type augmentation is handled by src/types/electron.d.ts

/** Wraps Electron desktop API calls for MCP tool discovery and execution. */
class ElectronMCPClient {
  /** Whether the current runtime exposes the Electron MCP bridge. */
  private isElectron: boolean;

  /** Creates a client and detects whether Electron MCP APIs are available. */
  constructor() {
    this.isElectron = typeof window !== 'undefined' && getDesktopMCPApi() !== undefined;
  }

  /** Returns whether MCP operations can be performed in the current environment. */
  isAvailable(): boolean {
    return this.isElectron;
  }

  /** Fetches the list of MCP tools exposed by the Electron main process. */
  async getTools(): Promise<MCPTool[]> {
    if (!this.isElectron) {
      console.warn('MCP client not available - not running in Electron environment');
      return [];
    }

    try {
      const mcpApi = getDesktopMCPApi()!;
      const response = await mcpApi.getTools();
      console.log('mcp response from getting tools is', response);
      console.log('mcp window desktop api', mcpApi.getTools);
      if (response.success && response.tools) {
        console.log('Retrieved MCP tools from Electron:', response.tools.length, 'tools');
        return response.tools;
      } else {
        console.warn('Failed to get MCP tools:', response.error);
        return [];
      }
    } catch (error) {
      console.error('Error getting MCP tools from Electron:', error);
      return [];
    }
  }

  /** Executes an MCP tool through the Electron main process bridge. */
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    toolCallId?: string
  ): Promise<any> {
    if (!this.isElectron) {
      throw new Error('MCP client not available - not running in Electron environment');
    }

    try {
      console.debug('args for tool executed is ', args);
      const response = await getDesktopMCPApi()!.executeTool(toolName, args, toolCallId);

      if (response.success) {
        return response.result;
      } else {
        throw new Error(response.error || 'Unknown error executing MCP tool');
      }
    } catch (error) {
      console.error(`Error executing MCP tool ${toolName}:`, error);
      throw error;
    }
  }

  /** Returns the current initialization status of the Electron MCP client. */
  async getStatus(): Promise<{ isInitialized: boolean; hasClient: boolean }> {
    if (!this.isElectron) {
      return { isInitialized: false, hasClient: false };
    }

    try {
      return await getDesktopMCPApi()!.getStatus();
    } catch (error) {
      console.error('Error getting MCP status:', error);
      return { isInitialized: false, hasClient: false };
    }
  }

  /** Requests a reset of the Electron MCP client and reports whether it succeeded. */
  async resetClient(): Promise<boolean> {
    if (!this.isElectron) {
      return false;
    }

    try {
      const response = await getDesktopMCPApi()!.resetClient();
      return response.success;
    } catch (error) {
      console.error('Error resetting MCP client:', error);
      return false;
    }
  }

  /** Retrieves the current MCP server configuration from Electron. */
  async getConfig(): Promise<{ success: boolean; config?: any; error?: string }> {
    if (!this.isElectron) {
      return {
        success: false,
        error: 'MCP client not available - not running in Electron environment',
      };
    }

    try {
      const response = await window.desktopApi!.mcp.getConfig();
      return response;
    } catch (error) {
      console.error('Error getting MCP config:', error);
      return { success: false, error: String(error) };
    }
  }

  /** Retrieves the current per-tool MCP configuration from Electron. */
  async getToolsConfig(): Promise<{ success: boolean; config?: any; error?: string }> {
    if (!this.isElectron) {
      return {
        success: false,
        error: 'MCP client not available - not running in Electron environment',
      };
    }

    try {
      const response = await window.desktopApi!.mcp.getToolsConfig();
      return response;
    } catch (error) {
      console.error('Error getting MCP tools config:', error);
      return { success: false, error: String(error) };
    }
  }

  /** Persists updated per-tool MCP configuration through Electron. */
  async updateToolsConfig(config: any): Promise<boolean> {
    if (!this.isElectron) {
      return false;
    }

    try {
      const response = await window.desktopApi!.mcp.updateToolsConfig(config);
      console.debug('response from updating mcp tools config is ', response);
      return response.success;
    } catch (error) {
      console.error('Error updating MCP tools config:', error);
      return false;
    }
  }

  /** Enables or disables a specific MCP tool in the Electron configuration. */
  async setToolEnabled(serverName: string, toolName: string, enabled: boolean): Promise<boolean> {
    if (!this.isElectron) {
      return false;
    }

    try {
      const response = await window.desktopApi!.mcp.setToolEnabled(serverName, toolName, enabled);
      return response.success;
    } catch (error) {
      console.error('Error setting tool enabled state:', error);
      return false;
    }
  }

  /** Retrieves usage statistics for a specific MCP tool. */
  async getToolStats(serverName: string, toolName: string): Promise<any | null> {
    if (!this.isElectron) {
      return null;
    }

    try {
      const response = await window.desktopApi!.mcp.getToolStats(serverName, toolName);
      return response.success ? response.stats : null;
    } catch (error) {
      console.error('Error getting tool stats:', error);
      return null;
    }
  }

  /** Splits a full tool name into its server and tool components. */
  parseToolName(fullToolName: string): { serverName: string; toolName: string } {
    const parts = fullToolName.split('__');
    if (parts.length >= 2) {
      return {
        serverName: parts[0],
        toolName: parts.slice(1).join('__'),
      };
    }
    return {
      serverName: 'default',
      toolName: fullToolName,
    };
  }

  /** Returns whether a tool is currently enabled in the Electron MCP config. */
  async isToolEnabled(fullToolName: string): Promise<boolean> {
    if (!this.isElectron) {
      return true; // Default to enabled if not in Electron
    }

    try {
      const { serverName, toolName } = this.parseToolName(fullToolName);
      const toolsConfig = await this.getToolsConfig();

      if (!toolsConfig.success || !toolsConfig.config) {
        return true; // Default to enabled if config not available
      }

      const serverConfig = toolsConfig.config[serverName];
      if (!serverConfig || !serverConfig[toolName]) {
        return true; // Default to enabled for new tools
      }

      return serverConfig[toolName].enabled;
    } catch (error) {
      console.error('Error checking tool enabled state:', error);
      return true; // Default to enabled on error
    }
  }

  /** Returns the subset of configured MCP tools that are enabled. */
  async getEnabledTools(): Promise<MCPTool[]> {
    if (!this.isElectron) {
      return [];
    }

    try {
      const toolsConfigResponse = await this.getToolsConfig();
      if (!toolsConfigResponse.success || !toolsConfigResponse.config) {
        return [];
      }

      const enabledTools: MCPTool[] = [];
      for (const [serverName, serverTools] of Object.entries(toolsConfigResponse.config)) {
        for (const [toolName, toolConfig] of Object.entries(serverTools as Record<string, any>)) {
          if (toolConfig.enabled !== false) {
            enabledTools.push({
              name: `${serverName}__${toolName}`,
              description: toolConfig.description,
              inputSchema: toolConfig.inputSchema,
              server: serverName,
            });
          }
        }
      }

      return enabledTools;
    } catch (error) {
      console.error('Error getting enabled tools:', error);
      return [];
    }
  }
}

/** Returns enabled MCP tools in the shape expected by existing callers. */
const tools = async function (): Promise<MCPTool[]> {
  const client = new ElectronMCPClient();
  return client.getEnabledTools();
};

// Export both the client class and the tools function for flexibility
export { ElectronMCPClient };
export default tools;
