import React from 'react';
import { Dialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import ModelSelectorBase from '@headlamp-k8s/ai-ui/components/settings/ModelSelector';

export default function ModelSelector(props: Omit<React.ComponentProps<typeof ModelSelectorBase>, 'DialogSlot'>) {
  return <ModelSelectorBase {...props} DialogSlot={Dialog} />;
}
