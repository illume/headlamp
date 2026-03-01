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

import { renderHook } from '@testing-library/react';
import { nodeDefaultHeight, nodeDefaultWidth } from '../graphConstants';
import { usePanToNode } from './usePanToNode';

// --- mock @xyflow/react ---
const mockSetCenter = vi.fn();
const mockGetViewport = vi.fn();
const mockNodeLookup = new Map<string, any>();
let mockCanvasWidth = 800;
let mockCanvasHeight = 600;

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    setCenter: mockSetCenter,
    getViewport: mockGetViewport,
  }),
  useStoreApi: () => ({
    getState: () => ({
      width: mockCanvasWidth,
      height: mockCanvasHeight,
      nodeLookup: mockNodeLookup,
    }),
  }),
}));

// Helper: build a minimal internal ReactFlow node with positionAbsolute.
// `measuredWidth/Height` absent → node has no measured dimensions (fallback used).
function makeNode(
  absX: number,
  absY: number,
  measuredWidth?: number,
  measuredHeight?: number
) {
  return {
    id: 'n1',
    position: { x: absX, y: absY },
    internals: { positionAbsolute: { x: absX, y: absY } },
    measured:
      measuredWidth !== undefined && measuredHeight !== undefined
        ? { width: measuredWidth, height: measuredHeight }
        : null,
    type: 'object',
    data: {},
  };
}

describe('usePanToNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNodeLookup.clear();
    mockCanvasWidth = 800;
    mockCanvasHeight = 600;
    // Default viewport: no pan offset, zoom 1
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 });
  });

  it('does nothing when the node does not exist in nodeLookup', () => {
    // nodeLookup is empty — node not found
    const { result } = renderHook(() => usePanToNode());
    result.current('missing-id');
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('does NOT pan when the node is entirely within the viewport', () => {
    // node at (100,100), 220×70 — fits inside 800×600 canvas at zoom 1
    mockNodeLookup.set('n1', makeNode(100, 100, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('pans when the node is partially clipped on the right', () => {
    // right edge at 700+220=920, canvas width=800 → clipped
    mockNodeLookup.set('n1', makeNode(700, 100, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
    expect(mockSetCenter).toHaveBeenCalledWith(700 + 220 / 2, 100 + 70 / 2, { duration: 300 });
  });

  it('pans when the node is partially clipped on the bottom', () => {
    // bottom edge at 580+70=650, canvas height=600 → clipped
    mockNodeLookup.set('n1', makeNode(100, 580, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it('pans when the node is partially clipped on the left (negative screen x)', () => {
    // viewport panned so vpX=-50; node at absX=0 → screenLeft = 0*1 + (-50) = -50 → clipped
    mockGetViewport.mockReturnValue({ x: -50, y: 0, zoom: 1 });
    mockNodeLookup.set('n1', makeNode(0, 100, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it('pans when the node is partially clipped on the top (negative screen y)', () => {
    // viewport panned so vpY=-30; node at absY=0 → screenTop = 0*1 + (-30) = -30 → clipped
    mockGetViewport.mockReturnValue({ x: 0, y: -30, zoom: 1 });
    mockNodeLookup.set('n1', makeNode(100, 0, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it('pans when the node is fully outside the viewport', () => {
    // node far to the right and below canvas
    mockNodeLookup.set('n1', makeNode(1000, 1000, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it(`uses default dimensions (${nodeDefaultWidth}×${nodeDefaultHeight}) when measured is null`, () => {
    // place it so the right edge (0 + nodeDefaultWidth) exceeds canvas width of 200
    mockCanvasWidth = 200;
    mockNodeLookup.set('n1', makeNode(0, 0));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    // nodeDefaultWidth=220 > 200, so it should pan
    expect(mockSetCenter).toHaveBeenCalledOnce();
    expect(mockSetCenter).toHaveBeenCalledWith(
      nodeDefaultWidth / 2,
      nodeDefaultHeight / 2,
      { duration: 300 }
    );
  });

  it('does NOT pan when node fits with default dimensions', () => {
    // canvas is large enough for the default-sized node at (0,0)
    mockNodeLookup.set('n1', makeNode(0, 0));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('accounts for zoom when checking visibility', () => {
    // node at (200,200), 100×50, zoom=2
    // screenRight = (200+100)*2 = 600 ≤ 800 ✓; screenBottom = (200+50)*2 = 500 ≤ 600 ✓
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 2 });
    mockNodeLookup.set('n1', makeNode(200, 200, 100, 50));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('pans at zoom < 1 when node would be clipped at zoomed dimensions', () => {
    // node at (0,0), 2000×2000, zoom=0.5 → screenRight = 2000*0.5 = 1000 > 800 → clipped
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 0.5 });
    mockNodeLookup.set('n1', makeNode(0, 0, 2000, 2000));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it('centres on the node mid-point when panning', () => {
    mockNodeLookup.set('n1', makeNode(700, 100, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    // centre = (700 + 220/2, 100 + 70/2) = (810, 135)
    expect(mockSetCenter).toHaveBeenCalledWith(810, 135, { duration: 300 });
  });

  it('uses positionAbsolute from internals for nested nodes', () => {
    // Simulate a nested node:
    //   position (relative to parent) = (100, 100) → both parent-relative coords are in-canvas
    //   positionAbsolute (canvas coords) = (700, 200) → right edge = 700+220 = 920 > 800 → clipped
    // If the hook mistakenly used `position` instead of `positionAbsolute`, it would NOT pan
    // (100+220=320 ≤ 800). Using `positionAbsolute` correctly identifies the node as clipped
    // and pans, and centres on the absolute position.
    const nestedNode = {
      id: 'nested',
      position: { x: 100, y: 100 }, // relative to parent — should NOT be used
      internals: { positionAbsolute: { x: 700, y: 200 } }, // canvas-absolute — should be used
      measured: { width: 220, height: 70 },
      type: 'object',
      data: {},
    };
    mockNodeLookup.set('nested', nestedNode);
    const { result } = renderHook(() => usePanToNode());
    result.current('nested');
    // Hook must pan (absolute right=920 > 800) and centre on the absolute midpoint
    expect(mockSetCenter).toHaveBeenCalledOnce();
    expect(mockSetCenter).toHaveBeenCalledWith(700 + 220 / 2, 200 + 70 / 2, { duration: 300 });
  });
});
