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
import { useDevicePixelRatio, useBrowserZoom } from './useDevicePixelRatio';

export default {
  title: 'GraphView',
  component: GraphView,
  argTypes: {
    disableGlanceAtHighZoom: {
      control: { type: 'boolean' },
      description:
        'Hide the quick-glance popup when browser zoom ≥ ~150% (2 Cmd+= presses from 100%).',
    },
  },
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
 * The graph is anchored to the bottom of the viewport. Hovering any node
 * triggers the glance tooltip to open **upward** because there is no space
 * below.
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
 * The GraphView canvas is pushed **120 px past the right viewport edge** so that
 * some nodes have `getBoundingClientRect().right > window.innerWidth`.
 *
 * Without the `position:fixed` clamping the glance card would be clipped by the
 * right viewport edge. With the fix the glance left coordinate is clamped so the
 * card stays fully visible even though the hovered node is partially off-screen.
 *
 * Hover any node that appears near the right side to verify the glance card
 * remains entirely within the viewport.
 */
export const GlanceAtRightEdge = () => (
  <TestContext>
    {/* overflow:hidden prevents a horizontal scrollbar; the position:fixed glance
        escapes the overflow clip and still renders in the viewport. */}
    <Box sx={{ position: 'relative', height: '400px', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', right: '-120px', width: '500px', height: '400px' }}>
        <GraphView height="400px" defaultSources={[mockSource]} />
      </Box>
    </Box>
  </TestContext>
);
GlanceAtRightEdge.args = {};

/**
 * The GraphView canvas is pushed **120 px past the LEFT viewport edge** so that
 * some nodes have `getBoundingClientRect().left < 0`.
 *
 * Without the `position:fixed` clamping the glance card would start off-screen
 * to the left. With the fix the glance left coordinate is clamped to
 * `GLANCE_MARGIN` (4 px) from the viewport left edge.
 *
 * Hover any node near the left side to verify the glance card remains entirely
 * within the viewport.
 */
export const GlanceAtLeftEdge = () => (
  <TestContext>
    <Box sx={{ position: 'relative', height: '400px', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', left: '-120px', width: '500px', height: '400px' }}>
        <GraphView height="400px" defaultSources={[mockSource]} />
      </Box>
    </Box>
  </TestContext>
);
GlanceAtLeftEdge.args = {};

/**
 * The graph is anchored to the top of the viewport. When a node is near the
 * top and there is not enough space above for the glance, the tooltip should
 * open **downward** rather than being clipped above the screen. The flip logic
 * only opens upward when there is at least 300px of room above the node.
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

// ---------------------------------------------------------------------------
// Live zoom indicator — used inside GlanceDisabledAtHighZoom to show the
// current browser zoom and DPR values directly in the canvas.
// ---------------------------------------------------------------------------

/**
 * Displays the live browser zoom level (`window.outerWidth / window.innerWidth`)
 * and `window.devicePixelRatio`, explaining whether the glance will be suppressed.
 *
 * Uses `useBrowserZoom()` (outerWidth/innerWidth ratio) rather than
 * `devicePixelRatio` because DPR cannot distinguish "200% browser zoom on a
 * standard display" from "100% zoom on a Retina/HiDPI display". The zoom ratio
 * correctly returns ~1.0 on Retina at 100% zoom and ~2.0 at 200% zoom on any
 * display.
 */
function BrowserZoomIndicator({
  disableGlanceAtHighZoom,
}: {
  disableGlanceAtHighZoom: boolean;
}) {
  const dpr = useDevicePixelRatio();
  const zoom = useBrowserZoom();

  // Threshold must match HIGH_ZOOM_THRESHOLD in KubeObjectNode.tsx
  const isHighZoom = zoom >= 1.4;
  const glanceSuppressed = disableGlanceAtHighZoom && isHighZoom;

  return (
    <Box
      sx={{
        p: 1.5,
        mb: 1,
        border: '1px dashed',
        borderColor: isHighZoom ? 'warning.main' : 'divider',
        borderRadius: 1,
        background: isHighZoom ? 'warning.50' : 'transparent',
        fontSize: 13,
      }}
    >
      <Typography variant="body2">
        <strong>Browser zoom (currentDPR / initialDPR):</strong> {zoom.toFixed(2)}
        {isHighZoom ? ' ≥ 1.4 (high zoom detected)' : ' < 1.4 (normal zoom)'}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        <strong>window.devicePixelRatio:</strong> {dpr} (screen DPR × zoom — not used for
        detection; Retina screens report 2 at 100% zoom)
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {glanceSuppressed
          ? '⚠ Glance is currently hidden (disableGlanceAtHighZoom=true and zoom ≥ 1.4). Hover a node to confirm no popup appears.'
          : '✓ Glance is active. Hover a node to see the popup.'}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        To test: use Ctrl+/- (or Cmd+/-) to zoom the browser. The zoom ratio updates in real-time.
        At ~150% zoom (≈ 2 Cmd+= presses from 100%) the ratio reaches ≥1.4 and the glance will be
        hidden when the toggle is on. Works correctly on Retina/HiDPI screens — the ratio is 1.0 at
        100% zoom regardless of screen DPR.
      </Typography>
    </Box>
  );
}

/**
 * Demonstrates the `disableGlanceAtHighZoom` option. When enabled, the
 * quick-glance popup is suppressed when the browser zoom level reaches ~150%
 * (2 Cmd+= presses from 100%).
 *
 * Detection uses `currentDPR / initialDPR` — the zoom factor relative to the
 * page's initial DPR at mount time. This is Retina/HiDPI safe (a Retina Mac at
 * 100% zoom has DPR ratio = 1.0) and works correctly inside iframes such as
 * Storybook's story canvas.
 *
 * **To test in Storybook:**
 * 1. Turn the `disableGlanceAtHighZoom` control **on**.
 * 2. Zoom the browser (Ctrl/Cmd + "+") ~2 times. The zoom ratio indicator updates live.
 * 3. Hover any node — no popup should appear.
 * 4. Zoom back to 100%. Hovering nodes shows the popup again.
 */
export const GlanceDisabledAtHighZoom = ({
  disableGlanceAtHighZoom = true,
}: {
  disableGlanceAtHighZoom?: boolean;
}) => (
  <TestContext>
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <BrowserZoomIndicator disableGlanceAtHighZoom={disableGlanceAtHighZoom} />
      <GraphView defaultSources={[mockSource]} disableGlanceAtHighZoom={disableGlanceAtHighZoom} />
    </Box>
  </TestContext>
);
GlanceDisabledAtHighZoom.args = { disableGlanceAtHighZoom: true };
