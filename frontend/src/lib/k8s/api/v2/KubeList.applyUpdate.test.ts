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
describe('KubeList.applyUpdate edge cases and correctness', () => {
  // Test 1: ADDED with same UID as existing item should replace, not duplicate
  it('should replace (not duplicate) when ADDED targets an existing UID', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [
        { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } },
        { metadata: { name: 'pod-2', uid: 'uid-2', resourceVersion: '6' } },
      ],
      metadata: { resourceVersion: '6' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: {
          metadata: { name: 'pod-1-updated', uid: 'uid-1', resourceVersion: '10' },
        },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(2); // not 3
    expect(result.items[0].jsonData.metadata.name).toBe('pod-1-updated');
    expect(result.items[1].metadata.uid).toBe('uid-2');
  });

  // Test 2: MODIFIED should update metadata.resourceVersion on the list
  it('should update list metadata.resourceVersion after MODIFIED', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } }],
      metadata: { resourceVersion: '5' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '20' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.metadata.resourceVersion).toBe('20');
  });

  // Test 3: DELETED should update list metadata.resourceVersion
  it('should update list metadata.resourceVersion after DELETED', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } }],
      metadata: { resourceVersion: '5' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'DELETED',
        object: { metadata: { uid: 'uid-1', resourceVersion: '10' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(0);
    expect(result.metadata.resourceVersion).toBe('10');
  });

  // Test 4: Stale resourceVersion should be skipped
  it('should skip update with stale resourceVersion', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '100' } }],
      metadata: { resourceVersion: '100' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { uid: 'uid-1', resourceVersion: '50' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list); // same reference = no-op
  });

  // Test 5: Equal resourceVersion should be skipped
  it('should skip update with equal resourceVersion', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '100' } }],
      metadata: { resourceVersion: '100' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { uid: 'uid-1', resourceVersion: '100' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list);
  });
});
describe('KubeList.applyUpdate new-item and multi-item behavior', () => {
  // Test 6: Update with undefined resourceVersion should still apply
  it('should apply update when update has no resourceVersion', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '100' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: { metadata: { name: 'new-pod', uid: 'new-uid' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(1);
    expect(result).not.toBe(list);
  });

  // Test 7: Update with resourceVersion "0" should apply when list has "0"
  it('should skip update with resourceVersion 0 when list also has 0', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '0' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: { metadata: { name: 'pod', uid: 'uid-1', resourceVersion: '0' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    // parseInt("0") <= parseInt("0") → true → skip
    expect(result).toBe(list);
  });

  // Test 8: ADDED to empty list should work
  it('should add item to empty list', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '1' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].cluster).toBe('cluster-a');
  });

  // Test 9: Unknown event type like BOOKMARK should not modify list
  it('should return same reference for BOOKMARK event type', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { uid: 'uid-1', resourceVersion: '5' } }],
      metadata: { resourceVersion: '5' },
    } as any;

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = KubeList.applyUpdate(
      list,
      { type: 'BOOKMARK', object: { metadata: { resourceVersion: '100' } } } as any,
      mockClass,
      'cluster-a'
    );
    spy.mockRestore();

    expect(result).toBe(list);
    expect(result.metadata.resourceVersion).toBe('5'); // unchanged
  });

  // Test 10: MODIFIED preserves other items in the list
  it('should preserve other items when MODIFIED updates one item', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [
        { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } },
        { metadata: { name: 'pod-2', uid: 'uid-2', resourceVersion: '6' } },
        { metadata: { name: 'pod-3', uid: 'uid-3', resourceVersion: '7' } },
      ],
      metadata: { resourceVersion: '7' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { name: 'pod-2-v2', uid: 'uid-2', resourceVersion: '20' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(3);
    // pod-1 and pod-3 should be unchanged references
    expect(result.items[0]).toBe(list.items[0]);
    expect(result.items[2]).toBe(list.items[2]);
    // pod-2 should be new
    expect(result.items[1].jsonData.metadata.name).toBe('pod-2-v2');
  });

  // Test 11: Cluster is passed to constructor for new items
  it('should pass cluster to itemClass constructor', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '1' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } },
      } as any,
      mockClass,
      'my-cluster'
    );

    expect(result.items[0].cluster).toBe('my-cluster');
  });

  // Test 12: DELETED for non-existent UID does NOT copy the array (perf optimization)
  it('should not copy array when DELETED targets non-existent UID', () => {
    const items = [{ metadata: { uid: 'uid-1', resourceVersion: '5' } }];
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items,
      metadata: { resourceVersion: '5' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'DELETED',
        object: { metadata: { uid: 'nonexistent', resourceVersion: '10' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list);
    // items array should be the exact same reference (not a copy)
    expect(result.items).toBe(items);
  });

  // Test 13: Multiple sequential updates maintain correct item count
  it('should handle sequential ADDED + MODIFIED + DELETED correctly', () => {
    let list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '1' },
    } as any;

    // ADDED
    list = KubeList.applyUpdate(
      list,
      { type: 'ADDED', object: { metadata: { uid: 'a', resourceVersion: '2' } } } as any,
      mockClass,
      'c'
    );
    expect(list.items).toHaveLength(1);

    // ADDED another
    list = KubeList.applyUpdate(
      list,
      { type: 'ADDED', object: { metadata: { uid: 'b', resourceVersion: '3' } } } as any,
      mockClass,
      'c'
    );
    expect(list.items).toHaveLength(2);

    // MODIFIED first
    list = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { uid: 'a', resourceVersion: '4', name: 'updated' } },
      } as any,
      mockClass,
      'c'
    );
    expect(list.items).toHaveLength(2);
    expect(list.items[0].jsonData.metadata.name).toBe('updated');

    // DELETED second
    list = KubeList.applyUpdate(
      list,
      { type: 'DELETED', object: { metadata: { uid: 'b', resourceVersion: '5' } } } as any,
      mockClass,
      'c'
    );
    expect(list.items).toHaveLength(1);
    expect(list.items[0].metadata.uid).toBe('a');
  });
});
