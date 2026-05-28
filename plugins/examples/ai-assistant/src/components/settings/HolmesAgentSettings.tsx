import { SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import React from 'react';
import {
  HOLMES_SERVICE_NAME,
  HOLMES_SERVICE_NAMESPACE,
  HOLMES_SERVICE_PORT,
} from '../../holmesClient';
import { pluginStore } from '../../pluginState';
import { HolmesAgentSettings as HolmesAgentSettingsBase } from '@headlamp-k8s/ai-ui/components/settings/HolmesAgentSettings';

export function HolmesAgentSettings(props: { config: any | null | undefined }) {
  const updateConfig = (patch: Record<string, any>) => {
    const current = pluginStore.get() || {};
    pluginStore.update({
      ...current,
      ...patch,
    });
  };

  return (
    <HolmesAgentSettingsBase
      config={props.config}
      onConfigChange={updateConfig}
      SectionWrapper={SectionBox}
      defaultNamespace={HOLMES_SERVICE_NAMESPACE}
      defaultServiceName={HOLMES_SERVICE_NAME}
      defaultPort={HOLMES_SERVICE_PORT}
    />
  );
}
