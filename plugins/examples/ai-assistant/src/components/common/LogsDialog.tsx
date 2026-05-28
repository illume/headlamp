import React from 'react';
import { Dialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import LogsDialogBase from '@headlamp-k8s/ai-ui/components/common/LogsDialog';
import type { LogsDialogProps as BaseProps } from '@headlamp-k8s/ai-ui/components/common/LogsDialog';

export type LogsDialogProps = Omit<BaseProps, 'DialogSlot'>;

const LogsDialog: React.FC<LogsDialogProps> = (props) => (
  <LogsDialogBase {...props} DialogSlot={Dialog} />
);

export default LogsDialog;
