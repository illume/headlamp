import { ConfirmDialog, EditorDialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import React from 'react';
import ApiConfirmationDialogBase from '@headlamp-k8s/ai-ui/components/common/ApiConfirmationDialog';
import type { ApiConfirmationDialogProps as BaseProps } from '@headlamp-k8s/ai-ui/components/common/ApiConfirmationDialog';

type ApiConfirmationDialogProps = Omit<BaseProps, 'ConfirmDialogSlot' | 'EditorDialogSlot'>;

export default function ApiConfirmationDialog(props: ApiConfirmationDialogProps) {
  return (
    <ApiConfirmationDialogBase
      {...props}
      ConfirmDialogSlot={ConfirmDialog}
      EditorDialogSlot={EditorDialog}
    />
  );
}
