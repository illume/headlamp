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
 * **Known limitation:** `devicePixelRatio` cannot distinguish browser zoom from
 * OS-level HiDPI/Retina scaling. A Retina display at 100% zoom and a standard
 * display at 200% zoom both yield `devicePixelRatio ≈ 2`. The value is therefore
 * best described as reflecting "high zoom OR high-DPI display".
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
