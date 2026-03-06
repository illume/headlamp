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

import { Icon } from '@iconify/react';
import { http, HttpResponse } from 'msw';
import Pod from '../../lib/k8s/pod';
import { TestContext } from '../../test';
import { podList } from '../pod/storyHelper';
import { GraphNode, GraphSource } from './graph/graphModel';
import { GraphView } from './GraphView';

export default {
  title: 'GraphView',
  component: GraphView,
  argTypes: {},
  parameters: {
    msw: {
      handlers: {
        story: [
          http.get(
            'http://localhost:4466/apis/apiextensions.k8s.io/v1/customresourcedefinitions',
            () =>
              HttpResponse.json({
                kind: 'List',
                items: [],
                metadata: {},
              })
          ),
          http.get(
            'http://localhost:4466/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions',
            () => HttpResponse.error()
          ),
        ],
      },
    },
  },
};

// Realistic pod for BasicExample — uses the running pod data with a realistic name
const basicExamplePod = new Pod({
  ...podList[5],
  metadata: { ...podList[5].metadata, name: 'nginx-deployment-7d9f5b8c4-jk8f2', uid: 'basic-1' },
});

const mockNodes: GraphNode[] = [
  {
    id: 'mock-id',
    kubeObject: basicExamplePod,
  },
  {
    id: 'custom-node',
    label: 'Node Label',
    subtitle: 'Node Subtitle',
  },
  {
    id: 'custom-node-with-icon',
    label: 'Node with an icon',
    subtitle: 'Node Subtitle',
    icon: <Icon icon="mdi:plus-circle-outline" width="32px" />,
  },
  {
    id: 'custom-node-with-details',
    label: 'Node with custom details',
    subtitle: 'Click to see custom details',
    detailsComponent: ({ node }) => (
      <div>
        <h3>Custom Details View</h3>
        <p>This is a custom details view for node: {node.label}</p>
      </div>
    ),
  },
  {
    id: 'custon-node-2',
    label: 'Node with children',
    nodes: [
      {
        id: 'some-id',
        label: 'Nested node 1',
      },
      {
        id: 'some-id-2',
        label: 'Nested node 2',
      },
    ],
    edges: [
      {
        id: 'some-edge-1',
        source: 'some-id',
        target: 'some-id-2',
      },
    ],
  },
];

const data = { nodes: mockNodes };

const mockSource: GraphSource = {
  id: 'mock-source',
  label: 'Pods',
  useData() {
    return data;
  },
};

export const BasicExample = () => (
  <TestContext>
    <GraphView height="600px" defaultSources={[mockSource]} />;
  </TestContext>
);
BasicExample.args = {};

/** Shared MSW handlers for stories that open a glance (events endpoint needed). */
const glanceMswStoryHandlers = {
  story: [
    http.get('http://localhost:4466/apis/apiextensions.k8s.io/v1/customresourcedefinitions', () =>
      HttpResponse.json({ kind: 'List', items: [], metadata: {} })
    ),
    http.get(
      'http://localhost:4466/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions',
      () => HttpResponse.error()
    ),
    // KubeObjectGlance fetches events for the open pod node
    http.get('http://localhost:4466/api/v1/namespaces/default/events', () =>
      HttpResponse.json({ kind: 'EventList', items: [], metadata: {} })
    ),
  ],
};

/**
 * Shows a node with its glance card open from first render.
 * Uses `initialGlanceOpen: true` on the node — no hover interaction required.
 * The pod has a realistic name so the glance header is clearly separate from the
 * ImagePullBackOff status label shown inside the glance.
 */
export const GlanceActive = () => (
  <TestContext>
    <GraphView
      height="600px"
      defaultSources={[
        {
          id: 'glance-source',
          label: 'Pods',
          useData() {
            return {
              nodes: [
                {
                  id: 'pod-glance',
                  kubeObject: new Pod({
                    ...podList[0],
                    metadata: {
                      ...podList[0].metadata,
                      name: 'coredns-5d78c9869d-8vxlq',
                      uid: 'glance-active-1',
                    },
                  }),
                  initialGlanceOpen: true,
                },
              ],
            };
          },
        } satisfies GraphSource,
      ]}
    />
  </TestContext>
);
GlanceActive.parameters = { msw: { handlers: glanceMswStoryHandlers } };

/**
 * Shows a glance with a long resource name — demonstrates that the full name is
 * visible in the glance popup even when it is truncated in the node card.
 */
export const GlanceActiveLongName = () => (
  <TestContext>
    <GraphView
      height="600px"
      defaultSources={[
        {
          id: 'glance-long-name-source',
          label: 'Pods',
          useData() {
            return {
              nodes: [
                {
                  id: 'pod-glance-long',
                  kubeObject: new Pod({
                    ...podList[5],
                    metadata: {
                      ...podList[5].metadata,
                      name: 'my-application-backend-api-service-deployment-v2-7d9f5b8c4-xk2p9',
                      uid: 'glance-long-1',
                    },
                  }),
                  initialGlanceOpen: true,
                },
              ],
            };
          },
        } satisfies GraphSource,
      ]}
    />
  </TestContext>
);
GlanceActiveLongName.parameters = { msw: { handlers: glanceMswStoryHandlers } };
