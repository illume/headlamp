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
 * @headlamp-k8s/ai-library
 *
 * Shared AI assistant, MCP, and LangChain library for Headlamp.
 * This library provides the core AI infrastructure used by both the
 * Headlamp desktop app (Electron) and the ai-assistant plugin.
 */

// MCP types and utilities
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
} from './mcp/index';
