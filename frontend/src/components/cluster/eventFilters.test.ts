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

function makeEvent(
  index: number,
  type = 'Pod',
  node = 'node-a',
  severity = 'Warning',
  message = `Scheduling ${type.toLowerCase()} ${index}`
) {
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
      message,
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

  it('searches the Event namespace when the involved object has none', () => {
    const event = makeEvent(4, 'Node');
    event.involvedObject.namespace = '';

    expect(filterEvents([event], { search: 'default', types: [], nodes: [] }, false)).toEqual([
      event,
    ]);
  });

  it('matches text containing literal asterisks', () => {
    const event = makeEvent(4, 'Pod', 'node-a', 'Warning', '* controller error');

    expect(filterEvents([event], { search: 'error', types: [], nodes: [] }, false)).toEqual([
      event,
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

  it('uses Unknown consistently for events without a resource kind', () => {
    const event = makeEvent(4, '');

    expect(getEventTypes([event])).toEqual(['Unknown']);
    expect(getEventTypeCounts([event])).toEqual([{ name: 'Unknown', value: 1 }]);
    expect(filterEvents([event], { search: '', types: ['Unknown'], nodes: [] }, false)).toEqual([
      event,
    ]);
  });

  it('filters a 10,000-event load snapshot', () => {
    const loadEvents = Array.from({ length: 10_000 }, (_, index) =>
      makeEvent(index, index % 2 ? 'Pod' : 'Node', `node-${index % 250}`)
    );

    const startedAt = performance.now();
    const matches = filterEvents(
      loadEvents,
      { search: '*9999', types: ['Pod'], nodes: ['node-249'] },
      true
    );

    expect(matches.map(event => event.involvedObject.name)).toEqual(['pod-9999']);
    expect(performance.now() - startedAt).toBeLessThan(1000);
  });

  it('handles repeated wildcards across a load snapshot', () => {
    const loadEvents = Array.from({ length: 2_000 }, (_, index) => makeEvent(index));

    expect(
      filterEvents(loadEvents, { search: '*a*a*a*a*a*a*a*a*z', types: [], nodes: [] }, true)
    ).toEqual([]);
  });

  it('handles long repetitive near-matches without rescanning prefixes', () => {
    const event = makeEvent(1, 'Pod', 'node-a', 'Warning', `${'a'.repeat(100_000)}b`);
    const startedAt = performance.now();

    expect(
      filterEvents([event], { search: `${'a'.repeat(10_000)}c`, types: [], nodes: [] }, false)
    ).toEqual([]);
    expect(performance.now() - startedAt).toBeLessThan(1000);
  });
});
