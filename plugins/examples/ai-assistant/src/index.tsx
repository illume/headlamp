import {
  registerAppBarAction,
  registerPluginSettings,
  registerUIPanel,
} from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
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
