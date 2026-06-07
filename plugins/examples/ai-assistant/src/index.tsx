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

// Initialize the bundled react-i18next instance so that i18n interpolation
// works in ai-ui components before plugin-specific translations are loaded.
import { initAiUiI18n } from '@headlamp-k8s/ai-ui/i18n';
import {
  registerAppBarAction,
  registerPluginSettings,
  registerUIPanel,
} from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
initAiUiI18n();
// Register provider icons for offline use
import '@headlamp-k8s/ai-ui/icons/iconBundles';
import HeadlampAIPrompt from './components/appbar/HeadlampAIPrompt';
import HeadlampEventHandler from './components/appbar/HeadlampEventHandler';
import AIPanelComponent from './components/panel/AIPanelComponent';
import Settings from './components/settings/Settings';
import { PLUGIN_NAME } from './pluginState';

// Register UI Panel component that uses the shared state to show/hide
registerUIPanel({
  id: 'headlamp-ai',
  side: 'right',
  component: () => <AIPanelComponent />,
});

registerAppBarAction(HeadlampAIPrompt);

registerAppBarAction(HeadlampEventHandler);

// [PROACTIVE_DIAGNOSIS_DISABLED]
// import {
//   proactiveDiagnosisManager,
//   ProactiveDiagnosisManager,
// } from '@headlamp-k8s/ai-ui';

registerPluginSettings(PLUGIN_NAME, Settings);

/* [PROACTIVE_DIAGNOSIS_DISABLED] — AIDiagnosisButton & events table column

function AIDiagnosisButton({ event }: { event: Event }) {
  ...
}

registerResourceTableColumnsProcessor(function addAIDiagnosisToEvents({ id, columns }) {
  ...
});

[PROACTIVE_DIAGNOSIS_DISABLED] */

// Export the cluster change notifier for external use
export { useClusterChangeNotifier, ClusterChangeNotifier } from './hooks/useClusterChangeNotifier';
