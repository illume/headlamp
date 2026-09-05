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

import { Meta, StoryObj } from '@storybook/react';
import { delay, http, HttpResponse } from 'msw';
import { resetDocsPromise } from '../../../lib/docs';
import Pod from '../../../lib/k8s/pod';
import { API_BASE } from '../../../test';
import ResourceInfoButton from './ResourceInfoButton';

const podDocumentation = {
  swagger: '2.0',
  info: { title: 'Kubernetes', version: 'v1' },
  paths: {},
  definitions: {
    'io.k8s.api.core.v1.Pod': {
      type: 'object',
      description: 'A Pod represents a set of running containers in your cluster.',
      'x-kubernetes-group-version-kind': [{ group: '', version: 'v1', kind: 'Pod' }],
      properties: {
        spec: {
          type: 'object',
          description: 'Specification of the desired behavior of the Pod.',
        },
      },
    },
  },
};

const meta: Meta<typeof ResourceInfoButton> = {
  title: 'Resource/ResourceInfoButton',
  component: ResourceInfoButton,
  args: {
    resourceClass: Pod,
  },
  decorators: [
    Story => {
      resetDocsPromise();
      return <Story />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ResourceInfoButton>;

export const Loaded: Story = {
  parameters: {
    msw: {
      handlers: [http.get(`${API_BASE}/openapi/v2`, () => HttpResponse.json(podDocumentation))],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(`${API_BASE}/openapi/v2`, async () => {
          await delay('infinite');
          return HttpResponse.json(podDocumentation);
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          `${API_BASE}/openapi/v2`,
          () => new HttpResponse(null, { status: 500, statusText: 'Documentation unavailable' })
        ),
      ],
    },
  },
};
