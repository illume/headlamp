import React from 'react';
import { Dialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { ToolsDialog as ToolsDialogBase } from '@headlamp-k8s/ai-ui/components/assistant/ToolsDialog';

export const ToolsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  enabledTools: string[];
  onToolsChange: (enabledTools: string[]) => void;
}> = (props) => (
  <ToolsDialogBase {...props} DialogSlot={Dialog} />
);
