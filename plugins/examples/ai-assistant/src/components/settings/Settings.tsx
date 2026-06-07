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

import type { CommandRunner } from '@headlamp-k8s/ai-common/providers/providerAutoDetect';
import type { DeveloperOptionsConfig } from '@headlamp-k8s/ai-ui/components/settings/DeveloperSettings';
import { SettingsPage } from '@headlamp-k8s/ai-ui/components/settings/SettingsPage';
import { isTestModeCheck } from '@headlamp-k8s/ai-ui/testing/testMode';
import { Headlamp, runCommand } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';

// pluginRunCommand is injected as a scope variable by Headlamp's plugin runner.
// Using declare const (same pattern as aksAgentManager.ts) lets TypeScript
// reference it without an explicit definition.
declare const pluginRunCommand: typeof runCommand;
import {
  HOLMES_SERVICE_NAME,
  HOLMES_SERVICE_NAMESPACE,
  HOLMES_SERVICE_PORT,
} from '../../holmesClient';
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
  const [commandRunner, setCommandRunner] = React.useState<CommandRunner | null>(null);
  React.useEffect(() => {
    if (typeof pluginRunCommand !== 'undefined') {
      setCommandRunner(() => async (command: string, args: string[]) => {
        // pluginRunCommand returns an EventEmitter-like object; convert to
        // the { stdout, exitCode } shape that CommandRunner expects.
        return new Promise<{ stdout: string; exitCode: number }>(resolve => {
          // @ts-ignore — 'gh' and 'az' are narrower than the declared type
          const proc = pluginRunCommand(command as any, args, {});
          let out = '';
          proc.stdout.on('data', (d: any) => (out += String(d)));
          proc.on('exit', (code: number | null) => resolve({ stdout: out, exitCode: code ?? -1 }));
        });
      });
    }
  }, []);

  const pluginSettings = savedConfigs;
  const isTestMode = isTestModeCheck();

  return (
    <SettingsPage
      savedConfigs={savedConfigs}
      onConfigsChange={configs => pluginStore.update(configs as any)}
      onTermsAccept={configs => pluginStore.update(configs as any)}
      commandRunner={commandRunner}
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
