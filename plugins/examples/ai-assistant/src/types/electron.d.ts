// Type definitions for the Electron desktop API exposed to the renderer process

/** Describes an MCP (Model Context Protocol) tool available from a server. */
interface MCPTool {
  /** Unique name identifier of the tool. */
  name: string;
  /** Human-readable description of what the tool does. */
  description?: string;
  /** JSON Schema describing the tool's expected input parameters. */
  inputSchema?: any;
}

/** Standard response shape returned by MCP API calls. */
interface MCPResponse {
  /** Whether the operation completed successfully. */
  success: boolean;
  /** List of available MCP tools, returned by getTools. */
  tools?: MCPTool[];
  /** Result payload from tool execution. */
  result?: any;
  /** Error message if the operation failed. */
  error?: string;
  /** Identifier correlating this response to a specific tool call. */
  toolCallId?: string;
}

/** API surface for interacting with MCP servers from the Electron renderer process. */
interface ElectronMCPApi {
  /** Retrieves the list of available tools from all configured MCP servers. */
  getTools: () => Promise<MCPResponse>;
  /** Executes a named tool with the given arguments. */
  executeTool: (
    toolName: string,
    args: Record<string, any>,
    toolCallId?: string
  ) => Promise<MCPResponse>;
  /** Returns the current initialization and connection status of the MCP client. */
  getStatus: () => Promise<{ isInitialized: boolean; hasClient: boolean }>;
  /** Resets the MCP client, disconnecting and reinitializing. */
  resetClient: () => Promise<MCPResponse>;
  /** Retrieves the current MCP server configuration. */
  getConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
  /** Persists an updated MCP server configuration. */
  updateConfig: (config: any) => Promise<MCPResponse>;
  /** Retrieves the per-tool enablement configuration. */
  getToolsConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
  /** Persists an updated per-tool enablement configuration. */
  updateToolsConfig: (config: any) => Promise<MCPResponse>;
  /** Enables or disables a specific tool on a given server. */
  setToolEnabled: (serverName: string, toolName: string, enabled: boolean) => Promise<MCPResponse>;
  /** Retrieves usage statistics for a specific tool on a server. */
  getToolStats: (
    serverName: string,
    toolName: string
  ) => Promise<{ success: boolean; stats?: any; error?: string }>;
}

/** Desktop API bridge exposed by Electron's preload script to the renderer. */
interface DesktopApi {
  /** Sends a message to the main process on the specified IPC channel. */
  send: (channel: string, data: unknown) => void;
  /** Registers a listener for messages from the main process on the specified channel. */
  receive: (channel: string, func: (...args: unknown[]) => void) => void;
  /** Removes a previously registered listener for the specified channel. */
  removeListener: (channel: string, func: (...args: unknown[]) => void) => void;
  /** MCP-specific API methods for tool management and execution. */
  mcp: ElectronMCPApi;
}

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}

export { MCPTool, MCPResponse, ElectronMCPApi, DesktopApi };
