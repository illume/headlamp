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

import { useEffect, useState } from 'react';

/**
 * Returns the current `window.devicePixelRatio` and re-renders whenever it
 * changes (e.g. the user zooms the browser or moves the window to a display
 * with a different DPI).
 *
 * Uses the MDN-recommended `matchMedia('(resolution: Ndppx)')` pattern,
 * re-registering the listener each time the value changes so it always tracks
 * the current level. A `resize` listener is added as a fallback for browsers
 * where the `matchMedia` change event may not fire reliably on zoom (e.g. some
 * Firefox versions).
 *
 * **Note:** `devicePixelRatio` = screen DPR × browser zoom. On a Retina/HiDPI
 * screen the screen DPR is already 2 at 100% zoom, so this value alone cannot
 * distinguish "200% browser zoom on a standard display" from "100% zoom on a
 * Retina display". Use {@link useBrowserZoom} when you need browser-zoom-only
 * detection.
 */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(() => window.devicePixelRatio);

  useEffect(() => {
    const updateDpr = () => {
      const next = window.devicePixelRatio;
      if (next !== dpr) setDpr(next);
    };

    // Primary: matchMedia fires when the current dppx level stops matching.
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`);
    mq.addEventListener('change', updateDpr);

    // Fallback: some browsers fire resize instead of (or in addition to) the
    // matchMedia change event when the user zooms.
    window.addEventListener('resize', updateDpr);

    return () => {
      mq.removeEventListener('change', updateDpr);
      window.removeEventListener('resize', updateDpr);
    };
  }, [dpr]); // re-register when dpr changes so the query always matches current value

  return dpr;
}

/**
 * Returns the browser zoom level **relative to when the component first mounted**
 * and re-renders whenever the zoom changes.
 *
 * The zoom factor is `currentDevicePixelRatio / initialDevicePixelRatio`.
 * Dividing by the baseline DPR captured at mount time removes the screen's
 * hardware DPR offset (e.g. 2 on Retina displays), so the returned value
 * reflects only the user-initiated browser zoom:
 *
 * - Retina screen at **100% zoom** → returns `1.0` (baseline DPR=2, current DPR=2)
 * - Any screen at **150% zoom** → returns `~1.5`
 * - Any screen at **200% zoom** → returns `~2.0`
 *
 * Unlike `window.outerWidth / window.innerWidth`, this approach works correctly
 * inside iframes (e.g. Storybook's story canvas) where `outerWidth` reflects the
 * top-level browser window while `innerWidth` reflects only the iframe viewport,
 * causing the ratio to be inflated regardless of actual browser zoom.
 *
 * **Caveat:** if the page mounts while the browser is already zoomed in, the
 * initial zoom is treated as the baseline (zoom = 1.0 at mount) and subsequent
 * changes are measured relative to it.
 */
export function useBrowserZoom(): number {
  // Capture the DPR at mount — screenDPR × browser-zoom-at-mount-time.
  // All subsequent zoom changes are measured relative to this baseline.
  const [initialDpr] = useState(() =>
    typeof window !== 'undefined' ? window.devicePixelRatio : 1
  );
  const currentDpr = useDevicePixelRatio();
  return initialDpr > 0 ? currentDpr / initialDpr : 1;
}
