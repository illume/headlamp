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

import { useReactFlow, useStore } from '@xyflow/react';

/** Fallback node dimensions when `measured` is not yet available — matches the layout default. */
const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 70;

/** Duration of the smooth pan animation in milliseconds. */
const PAN_DURATION_MS = 300;

/**
 * Returns a function that pans the ReactFlow canvas to centre a given node,
 * but only when the node is at least partially outside the visible canvas area.
 * Nodes that are entirely within the viewport are left undisturbed.
 */
export function usePanToNode() {
  const { setCenter, getNode, getViewport } = useReactFlow();
  const canvasWidth = useStore(it => it.width);
  const canvasHeight = useStore(it => it.height);

  return (id: string) => {
    const rfNode = getNode(id);
    if (!rfNode) return;

    const { x: vpX, y: vpY, zoom } = getViewport();
    const { width = DEFAULT_NODE_WIDTH, height = DEFAULT_NODE_HEIGHT } = rfNode.measured ?? {};

    // Convert the node's flow-coordinate bounding box to screen (canvas-pixel) coordinates.
    const screenLeft = rfNode.position.x * zoom + vpX;
    const screenTop = rfNode.position.y * zoom + vpY;
    const screenRight = (rfNode.position.x + width) * zoom + vpX;
    const screenBottom = (rfNode.position.y + height) * zoom + vpY;

    // Only pan when the node is not entirely within the visible canvas area
    // (i.e. it is at least partially clipped on any side).
    const fullyVisible =
      screenLeft >= 0 &&
      screenTop >= 0 &&
      screenRight <= canvasWidth &&
      screenBottom <= canvasHeight;

    if (!fullyVisible) {
      setCenter(rfNode.position.x + width / 2, rfNode.position.y + height / 2, {
        duration: PAN_DURATION_MS,
      });
    }
  };
}
