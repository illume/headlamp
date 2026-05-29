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
 * Retina display".
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
