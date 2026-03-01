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

import { useReactFlow, useStoreApi } from '@xyflow/react';
import { nodeDefaultHeight, nodeDefaultWidth } from '../graphConstants';

/** Duration of the smooth pan animation in milliseconds. */
const PAN_DURATION_MS = 300;

/**
 * Returns a function that pans the ReactFlow canvas to centre a given node,
 * but only when the node is at least partially outside the visible canvas area.
 * Nodes that are entirely within the viewport are left undisturbed.
 *
 * Canvas dimensions and the internal node (which carries `positionAbsolute` for
 * nested nodes whose `position` is relative to their parent) are read lazily
 * inside the returned callback — so the hook does not create a per-node store
 * subscription that would cause extra re-renders on canvas resize.
 */
export function usePanToNode() {
  const { setCenter, getViewport } = useReactFlow();
  const storeApi = useStoreApi();

  return (id: string) => {
    const { width: canvasWidth, height: canvasHeight, nodeLookup } = storeApi.getState();

    // Use the internal node so that `positionAbsolute` is available.
    // For nested nodes (parentId set), `position` is relative to the parent
    // while `internals.positionAbsolute` is the actual canvas-coordinate position.
    const rfNode = nodeLookup.get(id);
    if (!rfNode) return;

    const { x: vpX, y: vpY, zoom } = getViewport();
    const { width = nodeDefaultWidth, height = nodeDefaultHeight } = rfNode.measured ?? {};

    // Use positionAbsolute so nested nodes (inside expanded groups) are positioned correctly.
    const absX = rfNode.internals.positionAbsolute.x;
    const absY = rfNode.internals.positionAbsolute.y;

    // Convert the node's flow-coordinate bounding box to screen (canvas-pixel) coordinates.
    const screenLeft = absX * zoom + vpX;
    const screenTop = absY * zoom + vpY;
    const screenRight = (absX + width) * zoom + vpX;
    const screenBottom = (absY + height) * zoom + vpY;

    // Only pan when the node is not entirely within the visible canvas area
    // (i.e. it is at least partially clipped on any side).
    const fullyVisible =
      screenLeft >= 0 &&
      screenTop >= 0 &&
      screenRight <= canvasWidth &&
      screenBottom <= canvasHeight;

    if (!fullyVisible) {
      setCenter(absX + width / 2, absY + height / 2, {
        duration: PAN_DURATION_MS,
      });
    }
  };
}
