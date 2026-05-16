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
 * MCP types - shared type definitions for MCP (Model Context Protocol) functionality.
 *
 * These types are used by the Electron app's MCPClient/MCPToolStateStore
 * and by the ai-assistant plugin.
 */

/**
 * Settings for MCP configuration.
 */
export interface MCPSettings {
  /**
   * Whether MCP is enabled or not
   */
  enabled: boolean;
  /**
   * List of MCP servers
   */
  servers: MCPServer[];
}

/**
 * Configuration for an MCP server.
 */
export interface MCPServer {
  /**
   * Server name
   */
  name: string;
  /**
   * Command to run the MCP tool
   */
  command: string;
  /**
   * Arguments for the MCP tool command
   */
  args: string[];
  /**
   * Whether the MCP server is enabled or not
   */
  enabled: boolean;
  /**
   * Environment variables for the MCP tool command
   */
  env?: Record<string, string>;
}

/**
 * State of a single MCP tool.
 */
export interface MCPToolState {
  /**
   * Whether the tool is enabled or disabled
   */
  enabled: boolean;
  /**
   * Timestamp of the last time the tool was used
   */
  lastUsed?: Date;
  /**
   * Number of times the tool has been used
   */
  usageCount?: number;
  /**
   * JSON schema for tool parameters
   */
  inputSchema?: any;
  /**
   * Description of the tool from MCP server
   */
  description?: string;
}

/**
 * State of all MCP tools for a specific server.
 */
export interface MCPServerToolState {
  [toolName: string]: MCPToolState;
}

/**
 * Configuration for MCP tools across multiple servers.
 */
export interface MCPToolsConfig {
  [serverName: string]: MCPServerToolState;
}
