import React from 'react';
import { Dialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import MCPConfigEditorDialogBase from '@headlamp-k8s/ai-ui/components/settings/MCPConfigEditorDialog';
import type { MCPConfig } from '@headlamp-k8s/ai-ui/components/settings/MCPConfigEditorDialog';

export type { MCPServer, MCPConfig } from '@headlamp-k8s/ai-ui/components/settings/MCPConfigEditorDialog';

export default function MCPConfigEditorDialog(props: {
  open: boolean;
  onClose: () => void;
  config: MCPConfig;
  onSave: (config: MCPConfig) => void;
}) {
  return <MCPConfigEditorDialogBase {...props} DialogSlot={Dialog} />;
}
