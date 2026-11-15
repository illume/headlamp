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

import { describe, expect, it } from 'vitest';
import Event, { KubeEvent } from '../../lib/k8s/event';
import { filterEvents, getEventNodes, getEventTypeCounts, getEventTypes } from './eventFilters';

function makeEvent(index: number, type = 'Pod', node = 'node-a', severity = 'Warning') {
  return new Event(
    {
      metadata: {
        name: `event-${index}`,
        namespace: 'default',
        uid: `event-${index}`,
        creationTimestamp: '2026-01-01T00:00:00Z',
      },
      involvedObject: {
        kind: type,
        namespace: 'default',
        name: `${type.toLowerCase()}-${index}`,
        uid: `${type}-${index}`,
        apiVersion: 'v1',
        resourceVersion: String(index),
        fieldPath: '',
      },
      message: `Scheduling ${type.toLowerCase()} ${index}`,
      reason: index % 2 ? 'FailedScheduling' : 'Started',
      source: { host: node },
      type: severity,
    } as KubeEvent,
    'test'
  );
}

describe('event filters', () => {
  const events = [
    makeEvent(1, 'Pod', 'node-a'),
    makeEvent(2, 'Deployment', 'node-b', 'Normal'),
    makeEvent(3, 'Pod', 'node-b'),
  ];

  it('supports case-insensitive wildcards across event details', () => {
    expect(filterEvents(events, { search: 'SCHED*pod 3', types: [], nodes: [] }, false)).toEqual([
      events[2],
    ]);
  });

  it('combines warning, event type, and node filters', () => {
    expect(filterEvents(events, { search: '', types: ['Pod'], nodes: ['node-b'] }, true)).toEqual([
      events[2],
    ]);
  });

  it('builds sorted filter options and chart counts', () => {
    expect(getEventTypes(events)).toEqual(['Deployment', 'Pod']);
    expect(getEventNodes(events)).toEqual(['node-a', 'node-b']);
    expect(getEventTypeCounts(events)).toEqual([
      { name: 'Pod', value: 2 },
      { name: 'Deployment', value: 1 },
    ]);
  });

  it('filters a 10,000-event load snapshot', () => {
    const loadEvents = Array.from({ length: 10_000 }, (_, index) =>
      makeEvent(index, index % 2 ? 'Pod' : 'Node', `node-${index % 250}`)
    );

    expect(
      filterEvents(loadEvents, { search: '*9999', types: ['Pod'], nodes: ['node-249'] }, true).map(
        event => event.involvedObject.name
      )
    ).toEqual(['pod-9999']);
  });
});
