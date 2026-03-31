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
import { KubeList } from './KubeList';

// Minimal mock class that matches KubeObject constructor signature
// (avoids importing KubeObject which triggers circular dependency)
const mockClass = class {
  jsonData: any;
  cluster: string;
  metadata: any;
  constructor(data: any, cluster: string) {
    this.jsonData = data;
    this.cluster = cluster;
    this.metadata = data.metadata;
  }
} as any;

describe('KubeList.applyUpdate busy-cluster optimizations', () => {
  /**
   * ERROR events must return the same list reference (no-op) so the WS
   * cache handler's `newList !== draft.lists[idx].list` guard skips the
   * cache write.  On a 20K-pod cluster, avoiding the full items-array
   * copy + Immer produce + React re-render per ERROR event is critical.
   */
  it('should return the same reference for ERROR events (no-op)', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      metadata: { name: `pod-${i}`, uid: `uid-${i}`, resourceVersion: '10' },
    }));

    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items,
      metadata: { resourceVersion: '100' },
    } as any;

    const errorUpdate = {
      type: 'ERROR' as const,
      object: { metadata: { resourceVersion: '200' } },
    } as any;

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = KubeList.applyUpdate(list, errorUpdate, mockClass, 'cluster-a');
    spy.mockRestore();

    expect(result).toBe(list);
  });

  /**
   * DELETED events for a UID that doesn't exist in the list must also
   * return the same reference.  Kubernetes can send DELETED for objects
   * we don't track (e.g., paginated list, already removed).
   */
  it('should return the same reference when DELETED targets a non-existent UID', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '10' } }],
      metadata: { resourceVersion: '5' },
    } as any;

    const deleteUpdate = {
      type: 'DELETED' as const,
      object: { metadata: { uid: 'nonexistent-uid', resourceVersion: '200' } },
    } as any;

    const result = KubeList.applyUpdate(list, deleteUpdate, mockClass, 'cluster-a');

    expect(result).toBe(list);
  });

  /**
   * ERROR events must not corrupt the list's resourceVersion metadata.
   * Previously, the returned list had `resourceVersion: undefined` from
   * the ERROR object, which broke all future stale-version checks.
   */
  it('should preserve metadata on ERROR event with missing resourceVersion', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '10' } }],
      metadata: { resourceVersion: '10' },
    } as any;

    const errorUpdate = {
      type: 'ERROR' as const,
      object: { metadata: { resourceVersion: undefined } },
    } as any;

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = KubeList.applyUpdate(list, errorUpdate, mockClass, 'cluster-a');
    spy.mockRestore();

    expect(result).toBe(list);
    expect(result.metadata.resourceVersion).toBe('10');
  });

  /**
   * Updates with null or missing object.metadata must not crash.
   * Malformed WS events can arrive on real clusters.
   */
  it('should return same reference when update.object.metadata is missing', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '10' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      { type: 'ADDED', object: { kind: 'Pod' } } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list);
  });

  it('should return same reference when update.object is null', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '10' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      { type: 'ADDED', object: null } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list);
  });
});
