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

export { default as LangChainManager } from './LangChainManager';

export {
  kubernetesAnalysisParser,
  troubleshootingParser,
  resourceListParser,
  configRecommendationParser,
  nameListParser,
  plainTextParser,
  actionSuggestionParser,
  getFormatInstructions,
  safeParseResponse,
} from './OutputParsers';

export {
  baseSystemPromptTemplate,
  troubleshootingPromptTemplate,
  resourceAnalysisPromptTemplate,
  configReviewPromptTemplate,
  userGuidancePromptTemplate,
  errorExplanationPromptTemplate,
  apiErrorPromptTemplate,
  toolFailurePromptTemplate,
  quickActionPromptTemplate,
  createCustomPromptTemplate,
  toolSpecificPromptTemplate,
} from './PromptTemplates';

export { MCPOutputFormatter } from './formatters/MCPOutputFormatter';
export type { FormattedMCPOutput, MCPFormatterOptions } from './formatters/MCPOutputFormatter';

export { ToolBase } from './tools/ToolBase';
export type { ToolConfig, ToolResponse, ToolHandler } from './tools/ToolBase';
export { ToolManager } from './tools/ToolManager';
export { ToolOrchestrator } from './tools/ToolOrchestrator';
export type { RecommendedTool, ToolRecommendation } from './tools/ToolOrchestrator';
export { AVAILABLE_TOOLS, getToolByName } from './tools/registry';
export { KubernetesTool } from './tools/kubernetes/KubernetesTool';
export type {
  KubernetesToolUIState,
  KubernetesToolUICallbacks,
  KubernetesToolContext,
} from './tools/kubernetes/types';
