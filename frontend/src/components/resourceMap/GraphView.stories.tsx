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
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { http, HttpResponse } from 'msw';
import Pod from '../../lib/k8s/pod';
import { TestContext } from '../../test';
import { podList } from '../pod/storyHelper';
import { GraphNode, GraphSource } from './graph/graphModel';
import { GraphView } from './GraphView';

export default {
  title: 'GraphView',
  component: GraphView,
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

const mockNodes: GraphNode[] = [
  {
    id: 'mock-id',
    kubeObject: new Pod(podList[0]),
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
    <GraphView height="600px" defaultSources={[mockSource]} />
  </TestContext>
);
BasicExample.args = {};

/**
 * Demonstrates GraphView inside a height-constrained container, simulating the
 * layout at high browser zoom levels (e.g. 200%). The `minHeight` on the graph
 * ensures the canvas remains visible even when the flex parent is very short.
 */
export const InConstrainedContainer = () => (
  <TestContext>
    <Box
      sx={{ height: '300px', border: '1px dashed grey', display: 'flex', flexDirection: 'column' }}
    >
      <GraphView defaultSources={[mockSource]} />
    </Box>
  </TestContext>
);
InConstrainedContainer.args = {};

/**
 * Simulates a zoomed-in map where the node occupies most of the canvas.
 *
 * When `mapZoom` is high (e.g. 3×–4×) a single node can fill the entire
 * ReactFlow canvas.  In this state there is no room below, above, left, or
 * right to place the glance without clipping.  The placement algorithm falls
 * through to **case 4 (OVERLAP)**: the glance is anchored at the node's
 * top-left corner, still within the canvas, so as much content is visible as
 * possible.
 *
 * To reproduce: click the **+** zoom button several times until a node fills
 * the canvas, then hover it — the glance should appear overlaying the node,
 * fully within the canvas boundaries and never clipped.
 */
export const GlanceAtHighZoom = () => (
  <TestContext>
    <Typography variant="body2" sx={{ mb: 1 }}>
      Click the map <strong>+</strong> zoom button several times until a node fills the canvas, then
      hover the node. The glance should overlay the node and stay fully visible.
    </Typography>
    <GraphView height="500px" defaultSources={[mockSource]} />
  </TestContext>
);
GlanceAtHighZoom.args = {};

/**
 * The graph is anchored to the bottom of the viewport.  Nodes have less than
 * GLANCE_FLIP_THRESHOLD (300px) space below them but plenty of space above, so
 * the glance opens **above** the node (second placement priority).
 *
 * Hover any node to verify the glance opens above rather than below or to the side.
 */
export const GlanceAtBottomEdge = () => (
  <TestContext>
    <Box
      sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <GraphView height="260px" defaultSources={[mockSource]} />
    </Box>
  </TestContext>
);
GlanceAtBottomEdge.args = {};

/**
 * The GraphView canvas is pushed **120 px past the right viewport edge** AND
 * placed at the bottom of the viewport so there is not enough space below.
 *
 * Placement priority: not enough below → enough above → glance opens **above**
 * the node.  The glance is left-aligned with the node and clamped horizontally
 * so it stays within the viewport even though the node is partially off-screen.
 *
 * Hover any node near the right side to verify the glance opens above.
 */
export const GlanceAtRightEdge = () => (
  <TestContext>
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden', height: '400px' }}>
        <Box sx={{ position: 'absolute', right: '-120px', width: '500px', height: '400px' }}>
          <GraphView height="400px" defaultSources={[mockSource]} />
        </Box>
      </Box>
    </Box>
  </TestContext>
);
GlanceAtRightEdge.args = {};

/**
 * The GraphView canvas is pushed **120 px past the LEFT viewport edge** AND
 * placed at the bottom of the viewport so there is not enough space below.
 *
 * Placement priority: not enough below → enough above → glance opens **above**
 * the node.  The glance is left-aligned with the node and clamped horizontally
 * so it stays within the viewport even though the node is partially off-screen.
 *
 * Hover any node near the left side to verify the glance opens above.
 */
export const GlanceAtLeftEdge = () => (
  <TestContext>
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden', height: '400px' }}>
        <Box sx={{ position: 'absolute', left: '-120px', width: '500px', height: '400px' }}>
          <GraphView height="400px" defaultSources={[mockSource]} />
        </Box>
      </Box>
    </Box>
  </TestContext>
);
GlanceAtLeftEdge.args = {};

/**
 * The graph is anchored to the top of the viewport.  Nodes have plenty of space
 * below them (`spaceBelow ≥ 300px`), so the glance opens **below** the node —
 * the first (preferred) placement priority.
 *
 * Hover any node to verify the glance opens below.
 */
export const GlanceAtTopEdge = () => (
  <TestContext>
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
    >
      <GraphView height="260px" defaultSources={[mockSource]} />
    </Box>
  </TestContext>
);
GlanceAtTopEdge.args = {};

/**
 * Combined case: the graph is anchored to the **bottom** of the viewport AND
 * pushed **120 px past the right edge**.
 *
 * Not enough space below → tries above → enough space above → glance opens
 * **above** the node, horizontally clamped inside the viewport.
 *
 * Hover a node near the bottom-right to verify glance opens above.
 */
export const GlanceAtRightTopEdge = () => (
  <TestContext>
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden', height: '260px' }}>
        <Box sx={{ position: 'absolute', right: '-120px', width: '500px', height: '260px' }}>
          <GraphView height="260px" defaultSources={[mockSource]} />
        </Box>
      </Box>
    </Box>
  </TestContext>
);
GlanceAtRightTopEdge.args = {};

/**
 * Combined case: the graph is anchored to the **bottom** of the viewport AND
 * pushed **120 px past the left edge**.
 *
 * Not enough space below → tries above → enough space above → glance opens
 * **above** the node, horizontally clamped inside the viewport.
 *
 * Hover a node near the bottom-left to verify glance opens above.
 */
export const GlanceAtLeftBottomEdge = () => (
  <TestContext>
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden', height: '260px' }}>
        <Box sx={{ position: 'absolute', left: '-120px', width: '500px', height: '260px' }}>
          <GraphView height="260px" defaultSources={[mockSource]} />
        </Box>
      </Box>
    </Box>
  </TestContext>
);
GlanceAtLeftBottomEdge.args = {};
