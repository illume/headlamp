import React from 'react';
import { ActionButton } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { AIInputSection as AIInputSectionBase } from '@headlamp-k8s/ai-ui/components/assistant/AllInputSection';
import type { AIInputSectionProps as BaseProps } from '@headlamp-k8s/ai-ui/components/assistant/AllInputSection';
import { AgentModeSelector } from '../agent/AgentModeSelector';
import { ToolsDialog } from './ToolsDialog';

type AIInputSectionProps = Omit<BaseProps, 'AgentModeSelectorSlot' | 'ToolsDialogSlot' | 'ActionButtonSlot'>;

export const AIInputSection: React.FC<AIInputSectionProps> = (props) => (
  <AIInputSectionBase
    {...props}
    AgentModeSelectorSlot={AgentModeSelector}
    ToolsDialogSlot={ToolsDialog}
    ActionButtonSlot={ActionButton}
  />
);

export default AIInputSection;
