import type { CommandRunner } from '@headlamp-k8s/ai-common/providers/providerAutoDetect';
import type { DeveloperOptionsConfig } from '@headlamp-k8s/ai-ui/components/settings/DeveloperSettings';
import { SettingsPage } from '@headlamp-k8s/ai-ui/components/settings/SettingsPage';
import { isTestModeCheck } from '@headlamp-k8s/ai-ui/testing/testMode';
import { Headlamp } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import {
  AKS_AGENT_INSTALL_DOC_URL,
  getAllAvailableTools,
  isToolEnabled,
  pluginStore,
  toggleTool,
  usePluginConfig,
} from '../../pluginState';

/**
 * Plugin settings page for the AI Assistant.
 *
 * Thin wrapper around the framework-agnostic {@link SettingsPage} component
 * from `@headlamp-k8s/ai-ui`. Injects headlamp-plugin-specific dependencies
 * (plugin store, command runner, Holmes constants).
 *
 * Registered with `registerPluginSettings` so it appears on the Headlamp
 * settings route.
 */
export default function Settings() {
  const savedConfigs = usePluginConfig();

  // Command runner for CLI-based provider detection
  const commandRunnerRef = React.useRef<CommandRunner | null>(null);
  React.useEffect(() => {
    if (typeof (globalThis as any).pluginRunCommand === 'function') {
      commandRunnerRef.current = async (command: string, args: string[]) => {
        const result = await (globalThis as any).pluginRunCommand(command, args);
        return { stdout: result?.stdout ?? '', exitCode: result?.exitCode ?? -1 };
      };
    }
  }, []);

  const pluginSettings = savedConfigs;
  const isTestMode = isTestModeCheck();

  return (
    <SettingsPage
      savedConfigs={savedConfigs}
      onConfigsChange={configs => pluginStore.update(configs as any)}
      onTermsAccept={configs => pluginStore.update(configs as any)}
      commandRunner={commandRunnerRef.current}
      dismissedProviders={(pluginStore.get() as any)?.autoDetectDismissedProviders || []}
      onDismissProviders={keys => {
        const current = pluginStore.get() || {};
        pluginStore.update({ ...current, autoDetectDismissedProviders: keys } as any);
      }}
      tools={getAllAvailableTools()}
      isToolEnabled={toolId => isToolEnabled(pluginSettings, toolId)}
      onToolToggle={toolId => {
        const updatedSettings = toggleTool(pluginSettings, toolId);
        pluginStore.update(updatedSettings);
      }}
      isRunningAsApp={Headlamp.isRunningAsApp()}
      configStore={pluginStore}
      onHolmesConfigChange={(patch: Record<string, any>) => {
        const current = pluginStore.get() || {};
        pluginStore.update({ ...current, ...patch });
      }}
      defaultHolmesNamespace={HOLMES_SERVICE_NAMESPACE}
      defaultHolmesServiceName={HOLMES_SERVICE_NAME}
      defaultHolmesPort={HOLMES_SERVICE_PORT}
      previewEnabled={savedConfigs?.previewEnabled ?? true}
      onPreviewChange={enabled => {
        const current = pluginStore.get() || {};
        pluginStore.update({ ...current, previewEnabled: enabled });
      }}
      isTestMode={isTestMode}
      onTestModeChange={enabled => {
        const current = pluginStore.get() || {};
        pluginStore.update({ ...current, testMode: enabled });
      }}
      hasShownConfigPopover={savedConfigs?.configPopoverShown || false}
      onResetPopover={() => {
        const current = pluginStore.get() || {};
        pluginStore.update({ ...current, configPopoverShown: false });
      }}
      aksDocUrl={AKS_AGENT_INSTALL_DOC_URL}
      devOptions={savedConfigs?.devOptions ?? {}}
      onDevOptionsChange={(options: DeveloperOptionsConfig) => {
        const current = pluginStore.get() || {};
        pluginStore.update({ ...current, devOptions: options });
      }}
    />
  );
}
