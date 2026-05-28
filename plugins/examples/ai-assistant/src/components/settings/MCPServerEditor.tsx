import React from 'react';
import { Dialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import MCPServerEditorBase from '@headlamp-k8s/ai-ui/components/settings/MCPServerEditor';

export type { MCPServer } from '@headlamp-k8s/ai-ui/components/settings/MCPServerEditor';

export default function MCPServerEditor(props: Omit<React.ComponentProps<typeof MCPServerEditorBase>, 'DialogSlot'>) {
  return <MCPServerEditorBase {...props} DialogSlot={Dialog} />;
}
