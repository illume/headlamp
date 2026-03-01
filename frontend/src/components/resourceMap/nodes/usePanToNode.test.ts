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
import { usePanToNode } from './usePanToNode';

// --- mock @xyflow/react ---
const mockSetCenter = vi.fn();
const mockGetNode = vi.fn();
const mockGetViewport = vi.fn();
let mockCanvasWidth = 800;
let mockCanvasHeight = 600;

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    setCenter: mockSetCenter,
    getNode: mockGetNode,
    getViewport: mockGetViewport,
  }),
  useStore: (selector: (s: { width: number; height: number }) => number) =>
    selector({ width: mockCanvasWidth, height: mockCanvasHeight }),
}));

// Helper: build a minimal ReactFlow internal node
function makeNode(
  x: number,
  y: number,
  measuredWidth?: number,
  measuredHeight?: number
): ReturnType<typeof mockGetNode> {
  return {
    id: 'n1',
    position: { x, y },
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
    mockCanvasWidth = 800;
    mockCanvasHeight = 600;
    // Default viewport: no pan offset, zoom 1
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 });
  });

  it('does nothing when the node does not exist', () => {
    mockGetNode.mockReturnValue(undefined);
    const { result } = renderHook(() => usePanToNode());
    result.current('missing-id');
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('does NOT pan when the node is entirely within the viewport', () => {
    // node at (100,100), 220×70 — fits inside 800×600 canvas at zoom 1
    mockGetNode.mockReturnValue(makeNode(100, 100, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('pans when the node is partially clipped on the right', () => {
    // node left edge at x=700; right edge at 700+220=920, canvas width=800 → clipped
    mockGetNode.mockReturnValue(makeNode(700, 100, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
    expect(mockSetCenter).toHaveBeenCalledWith(700 + 220 / 2, 100 + 70 / 2, { duration: 300 });
  });

  it('pans when the node is partially clipped on the bottom', () => {
    // node top at y=580; bottom at 580+70=650, canvas height=600 → clipped
    mockGetNode.mockReturnValue(makeNode(100, 580, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it('pans when the node is partially clipped on the left (negative screen x)', () => {
    // viewport panned right by 50px; node at x=0 → screenLeft = 0*1 - 50 = -50 → clipped
    mockGetViewport.mockReturnValue({ x: -50, y: 0, zoom: 1 });
    mockGetNode.mockReturnValue(makeNode(0, 100, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it('pans when the node is partially clipped on the top (negative screen y)', () => {
    // viewport panned down by 30px; node at y=0 → screenTop = 0*1 - 30 = -30 → clipped
    mockGetViewport.mockReturnValue({ x: 0, y: -30, zoom: 1 });
    mockGetNode.mockReturnValue(makeNode(100, 0, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it('pans when the node is fully outside the viewport', () => {
    // node far to the right and below canvas
    mockGetNode.mockReturnValue(makeNode(1000, 1000, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it('uses default dimensions (220×70) when measured is null', () => {
    // node without measured — falls back to DEFAULT_NODE_WIDTH/HEIGHT
    // place it so the right edge (0 + 220 = 220) exceeds canvas width of 200
    mockCanvasWidth = 200;
    mockGetNode.mockReturnValue(makeNode(0, 0));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    // 220 > 200, so it should pan
    expect(mockSetCenter).toHaveBeenCalledOnce();
    expect(mockSetCenter).toHaveBeenCalledWith(220 / 2, 70 / 2, { duration: 300 });
  });

  it('does NOT pan when node fits with default dimensions', () => {
    // canvas is large enough for the default 220×70 node at (0,0)
    mockCanvasWidth = 800;
    mockCanvasHeight = 600;
    mockGetNode.mockReturnValue(makeNode(0, 0));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('accounts for zoom when checking visibility', () => {
    // node at (200, 200), 100×50, zoom=2
    // screenRight = (200+100)*2 + 0 = 600 ≤ 800 ✓
    // screenBottom = (200+50)*2 + 0 = 500 ≤ 600 ✓ → fully visible, no pan
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 2 });
    mockGetNode.mockReturnValue(makeNode(200, 200, 100, 50));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('pans at zoom < 1 when node would be clipped at zoomed dimensions', () => {
    // node at (0, 0), 2000×2000, zoom=0.5
    // screenRight = (0+2000)*0.5 = 1000 > 800 → clipped
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 0.5 });
    mockGetNode.mockReturnValue(makeNode(0, 0, 2000, 2000));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    expect(mockSetCenter).toHaveBeenCalledOnce();
  });

  it('centres on the node mid-point when panning', () => {
    mockGetNode.mockReturnValue(makeNode(700, 100, 220, 70));
    const { result } = renderHook(() => usePanToNode());
    result.current('n1');
    // centre = (700 + 220/2, 100 + 70/2) = (810, 135)
    expect(mockSetCenter).toHaveBeenCalledWith(810, 135, { duration: 300 });
  });
});
