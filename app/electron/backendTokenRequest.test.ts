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

import { describe, expect, it, vi } from 'vitest';
import { createBackendTokenRequestHandler } from './backendTokenRequest';

describe('createBackendTokenRequestHandler', () => {
  it('authenticates renderer requests to the bundled backend', () => {
    const callback = vi.fn();
    const handler = createBackendTokenRequestHandler('http://localhost:4466', 'desktop-token');

    handler(
      {
        url: 'http://localhost:4466/externalproxy',
        requestHeaders: { 'Forward-To': 'https://artifacthub.io/api/v1/packages' },
      },
      callback
    );

    expect(callback).toHaveBeenCalledWith({
      requestHeaders: {
        'Forward-To': 'https://artifacthub.io/api/v1/packages',
        'X-HEADLAMP_BACKEND-TOKEN': 'desktop-token',
      },
    });
  });

  it('replaces an existing token regardless of header casing', () => {
    const callback = vi.fn();
    const handler = createBackendTokenRequestHandler('http://localhost:4466', 'desktop-token');

    handler(
      {
        url: 'http://localhost:4466/externalproxy',
        requestHeaders: { 'x-headlamp_backend-token': 'stale-token' },
      },
      callback
    );

    expect(callback).toHaveBeenCalledWith({
      requestHeaders: { 'X-HEADLAMP_BACKEND-TOKEN': 'desktop-token' },
    });
  });

  it('does not expose the token to external requests', () => {
    const callback = vi.fn();
    const handler = createBackendTokenRequestHandler('http://localhost:4466', 'desktop-token');

    handler(
      {
        url: 'https://artifacthub.io/api/v1/packages',
        requestHeaders: { Accept: 'application/json' },
      },
      callback
    );

    expect(callback).toHaveBeenCalledWith({
      requestHeaders: { Accept: 'application/json' },
    });
  });
});
