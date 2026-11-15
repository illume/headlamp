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

import { render } from '@testing-library/react';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Overview from './Overview';

const {
  chartMocks,
  eventUseList,
  namespaceUse,
  nodeUseList,
  nodeUseMetrics,
  percentageCircleMock,
  podUseList,
  resourceListViewMock,
} = vi.hoisted(() => {
  const mocks = {
    chartMocks: {
      CpuCircularChart: () => <div>cpu</div>,
      MemoryCircularChart: () => <div>memory</div>,
      NodesStatusCircleChart: () => <div>nodes</div>,
      PodsStatusCircleChart: () => <div>pods</div>,
    },
    eventUseList: vi.fn(() => ({ items: [] as any[] | null, errors: null })),
    namespaceUse: vi.fn(() => [] as string[]),
    nodeUseList: vi.fn(() => [[]]),
    nodeUseMetrics: vi.fn(() => [[], null]),
    percentageCircleMock: vi.fn(),
    podUseList: vi.fn(() => [[]]),
    resourceListViewMock: vi.fn(),
  };
  return mocks;
});

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../lib/k8s/event', () => ({
  default: {
    maxLimit: 2000,
    useList: eventUseList,
  },
}));

vi.mock('../../lib/k8s/api/v1/hooks', () => ({
  useCluster: () => 'test',
}));

vi.mock('../../lib/k8s/node', () => ({
  default: {
    useList: nodeUseList,
    useMetrics: nodeUseMetrics,
  },
}));

vi.mock('../../lib/k8s/pod', () => ({
  default: {
    useList: podUseList,
  },
}));

vi.mock('../../lib/util', () => ({
  useFilterFunc: () => () => true,
}));

vi.mock('../../redux/filterSlice', async importOriginal => ({
  ...(await importOriginal<typeof import('../../redux/filterSlice')>()),
  useNamespaces: namespaceUse,
}));

vi.mock('../../redux/hooks', () => ({
  useTypedSelector: (selector: any) => selector({ overviewCharts: { processors: [] } }),
}));

vi.mock('../common/Resource/ResourceListView', () => ({
  default: (props: { title: React.ReactNode }) => {
    resourceListViewMock(props);
    return <div>{props.title}</div>;
  },
}));

vi.mock('../common/Chart', () => ({
  PercentageCircle: (props: object) => {
    percentageCircleMock(props);
    return <div>event chart</div>;
  },
}));

vi.mock('../common/SectionFilterHeader', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('../common/Resource', () => ({
  PageGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../common/SectionBox', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  SectionBox: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('./Charts', () => chartMocks);
vi.mock('./Charts/index', () => chartMocks);

describe('Overview', () => {
  beforeEach(() => {
    localStorage.clear();
    eventUseList.mockReturnValue({ items: [], errors: null });
    namespaceUse.mockReturnValue([]);
    percentageCircleMock.mockClear();
    resourceListViewMock.mockClear();
  });

  it('polls overview resources instead of opening watch streams', () => {
    const OVERVIEW_REFETCH_INTERVAL_MS = 60_000;

    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );

    expect(podUseList).toHaveBeenCalledWith({ refetchInterval: OVERVIEW_REFETCH_INTERVAL_MS });
    expect(nodeUseList).toHaveBeenCalledWith({ refetchInterval: OVERVIEW_REFETCH_INTERVAL_MS });
    expect(eventUseList).toHaveBeenCalledWith({
      limit: 2000,
      namespace: [],
      refetchInterval: OVERVIEW_REFETCH_INTERVAL_MS,
    });
  });

  it('preserves loading state for the event chart and table', () => {
    eventUseList.mockReturnValue({ items: null, errors: null });

    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );

    expect(percentageCircleMock.mock.lastCall?.[0]).toMatchObject({ total: -1 });
    expect(resourceListViewMock.mock.lastCall?.[0]).toMatchObject({ data: null });
  });

  it('applies namespace selection before deriving chart and table data', () => {
    namespaceUse.mockReturnValue(['team-a']);
    eventUseList.mockReturnValue({
      items: [makeEvent('event-a', 'team-a'), makeEvent('event-b', 'team-b')],
      errors: null,
    });

    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );

    expect(percentageCircleMock.mock.lastCall?.[0]).toMatchObject({ total: 1 });
    expect(resourceListViewMock.mock.lastCall?.[0].data).toEqual([
      expect.objectContaining({ message: 'event-a' }),
    ]);
  });

  it('bypasses saved filters for event notification links', () => {
    localStorage.setItem(
      'headlamp.events.filters.v1.test',
      JSON.stringify({ search: '', types: [], nodes: ['other-node'] })
    );
    eventUseList.mockReturnValue({ items: [makeEvent('target', 'default')], errors: null });

    render(
      <MemoryRouter initialEntries={['/?eventsFilter=target']}>
        <Overview />
      </MemoryRouter>
    );

    expect(resourceListViewMock.mock.lastCall?.[0]).toMatchObject({
      data: [expect.objectContaining({ message: 'target' })],
      defaultGlobalFilter: 'target',
    });
  });
});

function makeEvent(message: string, namespace: string) {
  return {
    getNamespace: () => namespace,
    involvedObject: { kind: 'Pod', name: message, namespace },
    message,
    reason: 'Started',
    source: { host: 'node-a' },
    type: 'Warning',
  };
}
