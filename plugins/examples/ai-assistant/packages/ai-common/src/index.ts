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
 * @headlamp-k8s/ai
 *
 * Shared AI assistant, MCP, and LangChain library for Headlamp.
 * This library provides the core AI infrastructure used by both the
 * Headlamp desktop app (Electron) and the ai-assistant plugin.
 *
 * Sub-path exports:
 *   @headlamp-k8s/ai        – MCP types/utilities (Node.js-safe)
 *   @headlamp-k8s/ai/ai     – AIManager, prompts, ElectronMCPClient (browser-only)
 *   @headlamp-k8s/ai/config – Model provider definitions, provider config management
 *   @headlamp-k8s/ai/langchain – LangChain integration
 *   @headlamp-k8s/ai/mcp    – MCP types (re-export)
 */

// MCP types and utilities (Node.js-safe — no browser/window dependencies)
export type {
  MCPSettings,
  MCPServer,
  MCPToolState,
  MCPServerToolState,
  MCPToolsConfig,
} from './mcp/index';

export {
  expandEnvAndResolvePaths,
  settingsChanges,
  parseServerNameToolName,
  validateToolArgs,
  summarizeMcpToolStateChanges,
  makeMcpServers,
  hasClusterDependentServers,
} from './mcp/index';

export { MCPToolStateStore } from './mcp/index';

// Model provider configuration (Node.js-safe)
export type { ModelField, ModelProvider } from './config/modelConfig';
export {
  modelProviders,
  getProviderById,
  getProviderFields,
  getDefaultConfig,
} from './config/modelConfig';

// Provider config management (Node.js-safe)
export type { StoredProviderConfig, SavedConfigurations } from './utils/ProviderConfigManager';
export {
  getSavedConfigurations,
  getActiveConfig,
  saveProviderConfig,
  deleteProviderConfig,
  saveTermsAcceptance,
} from './utils/ProviderConfigManager';
