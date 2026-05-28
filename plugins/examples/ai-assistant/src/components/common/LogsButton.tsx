import React from 'react';
import { Dialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import LogsButtonBase from '@headlamp-k8s/ai-ui/components/common/LogsButton';
import type { LogsButtonProps as BaseProps } from '@headlamp-k8s/ai-ui/components/common/LogsButton';

export type LogsButtonProps = Omit<BaseProps, 'DialogSlot'>;

const LogsButton: React.FC<LogsButtonProps> = (props) => (
  <LogsButtonBase {...props} DialogSlot={Dialog} />
);

export default LogsButton;
