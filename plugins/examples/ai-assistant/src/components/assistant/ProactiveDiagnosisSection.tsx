import React from 'react';
import ContentRenderer from '../../ContentRenderer';
import ProactiveDiagnosisSectionBase from '@headlamp-k8s/ai-ui/components/assistant/ProactiveDiagnosisSection';
import type { ProactiveDiagnosisSectionProps as BaseProps } from '@headlamp-k8s/ai-ui/components/assistant/ProactiveDiagnosisSection';

type ProactiveDiagnosisSectionProps = Omit<BaseProps, 'ContentRendererSlot'>;

export default function ProactiveDiagnosisSection(props: ProactiveDiagnosisSectionProps) {
  return (
    <ProactiveDiagnosisSectionBase
      {...props}
      ContentRendererSlot={ContentRenderer}
    />
  );
}
