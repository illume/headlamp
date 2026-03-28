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

import type { KubeObjectInterface } from '../../KubeObject';
import { KubeObject } from '../../KubeObject';

export interface KubeList<T extends KubeObjectInterface> {
  kind: string;
  apiVersion: string;
  items: T[];
  metadata: {
    resourceVersion: string;
  };
}

export interface KubeListUpdateEvent<T extends KubeObjectInterface> {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | 'ERROR';
  object: T;
}

export const KubeList = {
  /**
   * Apply an update event to the existing list
   *
   * @param list - List of kubernetes resources
   * @param update - Update event to apply to the list
   * @param itemClass - Class of an item in the list. Used to instantiate each item
   * @returns New list with the updated values
   */
  applyUpdate<
    ObjectInterface extends KubeObjectInterface,
    ObjectClass extends typeof KubeObject<ObjectInterface>
  >(
    list: KubeList<KubeObject<ObjectInterface>>,
    update: KubeListUpdateEvent<ObjectInterface>,
    itemClass: ObjectClass,
    cluster: string
  ): KubeList<KubeObject<ObjectInterface>> {
    // Guard: bail out for ERROR/unknown events without copying the items array.
    // On busy clusters (20K+ items) the array copy is expensive and ERROR events
    // don't modify the list, so returning the same reference lets the no-op guard
    // in the WS cache handler (`newList !== draft.lists[idx]!.list`) skip the write.
    if (update.type === 'ERROR') {
      console.error('Error in update', update);
      return list;
    }

    if (update.type !== 'ADDED' && update.type !== 'MODIFIED' && update.type !== 'DELETED') {
      console.error('Unknown update type', update);
      return list;
    }

    // Guard: skip if the object or its metadata is missing/malformed.
    if (!update.object?.metadata) {
      return list;
    }

    // Skip if the update's resource version is older than or equal to what we have
    if (
      list.metadata.resourceVersion &&
      update.object.metadata.resourceVersion &&
      parseInt(update.object.metadata.resourceVersion) <= parseInt(list.metadata.resourceVersion)
    ) {
      return list;
    }

    const newItems = [...list.items];
    const index = newItems.findIndex(item => item.metadata.uid === update.object.metadata.uid);

    switch (update.type) {
      case 'ADDED':
      case 'MODIFIED':
        if (index !== -1) {
          newItems[index] = new itemClass(update.object, cluster);
        } else {
          newItems.push(new itemClass(update.object, cluster));
        }
        break;
      case 'DELETED':
        if (index !== -1) {
          newItems.splice(index, 1);
        } else {
          // Target UID not found — nothing to remove, return same reference.
          return list;
        }
        break;
    }

    return {
      ...list,
      metadata: {
        resourceVersion: update.object.metadata.resourceVersion!,
      },
      items: newItems,
    };
  },
};
