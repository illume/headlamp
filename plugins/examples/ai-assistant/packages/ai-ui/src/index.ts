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

export * from './ai/index';

// Components - assistant
export { default as AgentThinkingBlock } from './components/assistant/AgentThinkingBlock';
export type { ThinkingStep } from './components/assistant/AgentThinkingBlock';
export { PromptSuggestions } from './components/assistant/PromptSuggestions';
export { default as TestModeInput } from './components/assistant/TestModeInput';

// Components - common
export { default as InlineToolConfirmation } from './components/common/InlineToolConfirmation';
export { default as ToolApprovalDialog } from './components/common/ToolApprovalDialog';
export { default as YamlDisplay } from './components/common/YamlDisplay';

// Components - mcpOutput
export { default as MCPOutputDisplay } from './components/mcpOutput/MCPOutputDisplay';

// Components - chat
export { default as MCPFormattedMessage } from './components/chat/MCPFormattedMessage';

// Components - settings
export { default as TermsDialog } from './components/settings/TermsDialog';

// Contexts
export { PromptWidthProvider, usePromptWidth } from './contexts/PromptWidthContext';

// Hooks
export { useToolApproval } from './hooks/useToolApproval';
export { useProactiveDiagnosis } from './hooks/useProactiveDiagnosis';

// Utils
export {
  proactiveDiagnosisManager,
  ProactiveDiagnosisManager,
} from './utils/ProactiveDiagnosisManager';
export type {
  DiagnosisResult,
  DiagnosisThinkingStep,
  DiagnosisStepCallback,
  EventDigest,
} from './utils/ProactiveDiagnosisManager';
export { parseKubernetesYAML } from './utils/SampleYamlLibrary';
export {
  getModelDisplayName,
  getProviderModels,
  getProviderModelsForChat,
  markdownToPlainText,
  parseSuggestionsFromResponse,
} from './utils/modalUtils';

// Config
export {
  modelProviders,
  getDefaultConfig,
  getProviderById,
  getProviderFields,
} from './config/modelConfig';
export type { ModelField, ModelProvider } from './config/modelConfig';

// Helper
export { formatString, isTestModeCheck, isLogRequest, isSpecificResourceRequestHelper } from './helper/index';
