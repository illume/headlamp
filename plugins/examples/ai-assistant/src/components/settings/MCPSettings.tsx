import { Headlamp } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import React from 'react';
import { pluginStore } from '../../pluginState';
import {
  MCPSettings as MCPSettingsBase,
  MCPSettingsProps as BaseProps,
} from '@headlamp-k8s/ai-ui/components/settings/MCPSettings';

export type { MCPServer, MCPConfig } from '@headlamp-k8s/ai-ui/components/settings/MCPSettings';

type MCPSettingsProps = Pick<BaseProps, 'onConfigChange'>;

export function MCPSettings({ onConfigChange }: MCPSettingsProps) {
  return (
    <MCPSettingsBase
      onConfigChange={onConfigChange}
      isRunningAsApp={Headlamp.isRunningAsApp()}
      configStore={pluginStore}
      SectionWrapper={SectionBox}
    />
  );
}
