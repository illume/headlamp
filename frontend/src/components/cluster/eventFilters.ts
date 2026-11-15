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

import Event from '../../lib/k8s/event';

export interface EventFilters {
  search: string;
  types: string[];
  nodes: string[];
}

export const defaultEventFilters: EventFilters = {
  search: '',
  types: [],
  nodes: [],
};

function wildcardMatch(value: string, pattern: string) {
  const text = value.toLowerCase();
  const wildcard = `*${pattern.toLowerCase()}*`;
  let textIndex = 0;
  let patternIndex = 0;
  let starIndex = -1;
  let starTextIndex = 0;

  while (textIndex < text.length) {
    if (wildcard[patternIndex] === text[textIndex]) {
      textIndex++;
      patternIndex++;
    } else if (wildcard[patternIndex] === '*') {
      starIndex = patternIndex++;
      starTextIndex = textIndex;
    } else if (starIndex !== -1) {
      patternIndex = starIndex + 1;
      textIndex = ++starTextIndex;
    } else {
      return false;
    }
  }

  while (wildcard[patternIndex] === '*') {
    patternIndex++;
  }

  return patternIndex === wildcard.length;
}

export function filterEvents(events: Event[], filters: EventFilters, warningOnly: boolean) {
  const search = filters.search.trim();
  const types = new Set(filters.types);
  const nodes = new Set(filters.nodes);

  return events.filter(event => {
    if (warningOnly && event.type !== 'Warning') {
      return false;
    }
    if (types.size > 0 && !types.has(event.involvedObject.kind)) {
      return false;
    }
    if (nodes.size > 0 && !nodes.has(event.source?.host ?? '')) {
      return false;
    }
    if (!search) {
      return true;
    }

    return [
      event.involvedObject.kind,
      event.involvedObject.name,
      event.involvedObject.namespace,
      event.source?.host,
      event.reason,
      event.message,
    ].some(value => value && wildcardMatch(value, search));
  });
}

export function getEventTypes(events: Event[]) {
  return [...new Set(events.map(event => event.involvedObject.kind).filter(Boolean))].sort();
}

export function getEventNodes(events: Event[]) {
  return [...new Set(events.map(event => event.source?.host).filter(Boolean) as string[])].sort();
}

export function getEventTypeCounts(events: Event[]) {
  const counts = new Map<string, number>();
  events.forEach(event => {
    const type = event.involvedObject.kind || 'Unknown';
    counts.set(type, (counts.get(type) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}
