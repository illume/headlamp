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

export interface KubernetesToolUIState {
  showApiConfirmation: boolean;
  apiRequest: {
    url: string;
    method: string;
    body?: string;
    cluster?: string;
    toolCallId?: string;
    pendingPrompt?: any;
  } | null;
  apiResponse: any;
  apiLoading: boolean;
  apiRequestError: string | null;
}

export interface KubernetesToolUICallbacks {
  setShowApiConfirmation: (show: boolean) => void;
  setApiRequest: (request: KubernetesToolUIState['apiRequest']) => void;
  setApiResponse: (response: any) => void;
  setApiLoading: (loading: boolean) => void;
  setApiRequestError: (error: string | null) => void;
  handleActualApiRequest: (
    url: string,
    method: string,
    body?: string,
    onClose?: () => void,
    aiManager?: any,
    resourceInfo?: any,
    targetCluster?: string,
    onFailure?: (error: any, operationType: string, resourceInfo?: any) => void,
    onSuccess?: (response: any, operationType: string, resourceInfo?: any) => void
  ) => Promise<any>;
}

export interface KubernetesToolContext {
  ui: KubernetesToolUIState;
  callbacks: KubernetesToolUICallbacks;
  selectedClusters: string[];
  aiManager?: any; // Optional AI manager for history tracking
}
