/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { KubeObjectClass } from '../../../lib/k8s/KubeObject';
import ActionButton from '../ActionButton';
import { Dialog } from '../Dialog';
import DocsViewer from './DocsViewer';

export interface ResourceInfoButtonProps {
  resourceClass: KubeObjectClass;
}

export default function ResourceInfoButton({ resourceClass }: ResourceInfoButtonProps) {
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation();
  const apiVersions = Array.isArray(resourceClass.apiVersion)
    ? resourceClass.apiVersion
    : [resourceClass.apiVersion];

  return (
    <>
      <ActionButton
        description={t('Learn more about {{ kind }}', { kind: resourceClass.kind })}
        icon="mdi:information-outline"
        onClick={() => setOpen(true)}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('{{ kind }} documentation', { kind: resourceClass.kind })}
        titleProps={{ focusTitle: true }}
      >
        <DocsViewer
          docSpecs={apiVersions.map(apiVersion => ({ apiVersion, kind: resourceClass.kind }))}
        />
      </Dialog>
    </>
  );
}
