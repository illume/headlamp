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

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import type React from 'react';
import { MemoryRouter, Router } from 'react-router-dom';
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
  selectedClusters,
} = vi.hoisted(() => {
  const mocks = {
    chartMocks: {
      CpuCircularChart: () => <div>cpu</div>,
      MemoryCircularChart: () => <div>memory</div>,
      NodesStatusCircleChart: () => <div>nodes</div>,
      PodsStatusCircleChart: () => <div>pods</div>,
    },
    eventUseList: vi.fn(() => ({
      items: [] as any[] | null,
      errors: null,
      hasMore: false,
      remainingItemCount: undefined as number | undefined,
    })),
    namespaceUse: vi.fn(() => [] as string[]),
    nodeUseList: vi.fn(() => [[]]),
    nodeUseMetrics: vi.fn(() => [[], null]),
    percentageCircleMock: vi.fn(),
    podUseList: vi.fn(() => [[]]),
    resourceListViewMock: vi.fn(),
    selectedClusters: vi.fn(() => ['test']),
  };
  return mocks;
});

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(values?.[name] ?? '')),
  }),
}));

vi.mock('../../lib/k8s/event', () => ({
  default: {
    maxLimit: 2000,
    useList: eventUseList,
  },
}));

vi.mock('../../lib/k8s/api/v1/hooks', () => ({
  useSelectedClusters: selectedClusters,
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

vi.mock('../common/Resource/ResourceTable', () => ({
  default: (props: object) => {
    resourceListViewMock(props);
    return <div />;
  },
}));

vi.mock('../common/Chart', () => ({
  PercentageCircle: (props: object) => {
    percentageCircleMock(props);
    return <div>event chart</div>;
  },
}));

vi.mock('../common/SectionFilterHeader', () => ({
  default: ({ title, titleSideActions }: { title: string; titleSideActions?: React.ReactNode }) => (
    <div>
      {title}
      {titleSideActions}
    </div>
  ),
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
    eventUseList.mockReturnValue({
      items: [],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });
    namespaceUse.mockReturnValue([]);
    selectedClusters.mockReturnValue(['test']);
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
    eventUseList.mockReturnValue({
      items: null,
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });

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
      hasMore: false,
      remainingItemCount: undefined,
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
    eventUseList.mockReturnValue({
      items: [makeEvent('target', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });

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

  it('handles null persisted filters', () => {
    localStorage.setItem('headlamp.events.filters.v1.test', 'null');
    eventUseList.mockReturnValue({
      items: [makeEvent('event', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });

    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );

    expect(screen.getByRole('textbox', { name: 'Search events' })).toHaveValue('');
    expect(resourceListViewMock.mock.lastCall?.[0].data).toHaveLength(1);
  });

  it('persists filters for the full selected cluster group', () => {
    selectedClusters.mockReturnValue(['cluster-b', 'cluster-a']);
    localStorage.setItem(
      'headlamp.events.filters.v1.cluster-a+cluster-b',
      JSON.stringify({ search: 'target', types: [], nodes: [] })
    );
    eventUseList.mockReturnValue({
      items: [makeEvent('target', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });

    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );

    expect(screen.getByRole('textbox', { name: 'Search events' })).toHaveValue('target');
    expect(resourceListViewMock.mock.lastCall?.[0].data).toHaveLength(1);
  });

  it('applies filter edits after bypassing notification filters', () => {
    localStorage.setItem(
      'headlamp.events.filters.v1.test',
      JSON.stringify({ search: 'missing', types: [], nodes: [] })
    );
    eventUseList.mockReturnValue({
      items: [makeEvent('target', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });
    const history = createMemoryHistory({ initialEntries: ['/c/test?eventsFilter=target'] });

    render(
      <Router history={history}>
        <Overview />
      </Router>
    );

    const search = screen.getByRole('textbox', { name: 'Search events' });
    expect(search).toHaveValue('');
    expect(resourceListViewMock.mock.lastCall?.[0].defaultGlobalFilter).toBe('target');
    fireEvent.change(search, { target: { value: 'target' } });

    expect(history.location.search).toBe('');
    expect(screen.getByRole('textbox', { name: 'Search events' })).toHaveValue('target');
    expect(resourceListViewMock.mock.lastCall?.[0]).toMatchObject({
      data: [expect.objectContaining({ message: 'target' })],
      defaultGlobalFilter: undefined,
    });
  });

  it('keeps focus while typing and reapplies a notification on a subsequent visit', async () => {
    const user = userEvent.setup();
    eventUseList.mockReturnValue({
      items: [makeEvent('target', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });
    const history = createMemoryHistory({ initialEntries: ['/c/test?eventsFilter=target'] });
    render(
      <Router history={history}>
        <Overview />
      </Router>
    );

    const search = screen.getByRole('textbox', { name: 'Search events' });
    await user.type(search, 'missing');
    expect(search).toHaveFocus();
    expect(search).toHaveValue('missing');
    expect(history.location.search).toBe('');
    expect(resourceListViewMock.mock.lastCall?.[0].data).toEqual([]);

    act(() => history.push('/c/test?eventsFilter=target'));
    expect(search).toHaveValue('');
    expect(resourceListViewMock.mock.lastCall?.[0]).toMatchObject({
      data: [expect.objectContaining({ message: 'target' })],
      defaultGlobalFilter: 'target',
    });
  });

  it('retains a paused notification snapshot and its truncation notice when filters change', () => {
    const history = createMemoryHistory({ initialEntries: ['/c/test?eventsFilter=target'] });
    eventUseList.mockReturnValue({
      items: [makeEvent('target', 'default')],
      errors: null,
      hasMore: true,
      remainingItemCount: 7,
    });
    const { rerender } = render(
      <Router history={history}>
        <Overview />
      </Router>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pause live events' }));
    eventUseList.mockReturnValue({
      items: [makeEvent('new-event', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });
    rerender(
      <Router history={history}>
        <Overview />
      </Router>
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Search events' }), {
      target: { value: 'target' },
    });

    expect(history.location.search).toBe('');
    expect(screen.getByRole('button', { name: 'Resume live events' })).toBeVisible();
    expect(screen.getByRole('note')).toHaveTextContent(
      'Showing 1 loaded events; 7 more events are available.'
    );
    expect(resourceListViewMock.mock.lastCall?.[0].data).toEqual([
      expect.objectContaining({ message: 'target' }),
    ]);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search events' }), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Resume live events' }));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(resourceListViewMock.mock.lastCall?.[0].data).toEqual([
      expect.objectContaining({ message: 'new-event' }),
    ]);
  });

  it('clears notification filters when selecting a chart kind', () => {
    eventUseList.mockReturnValue({
      items: [makeEvent('target', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });
    const history = createMemoryHistory({ initialEntries: ['/c/test?eventsFilter=target'] });

    render(
      <Router history={history}>
        <Overview />
      </Router>
    );

    const firstChartDatum = percentageCircleMock.mock.lastCall?.[0].data[0];
    act(() => firstChartDatum.onClick());

    expect(history.location.search).toBe('');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Static event snapshot. Showing 1 matching event.'
    );
    expect(resourceListViewMock.mock.lastCall?.[0]).toMatchObject({
      data: [expect.objectContaining({ message: 'target' })],
      defaultGlobalFilter: undefined,
    });
  });

  it('drops a frozen snapshot when the notification target changes', () => {
    const history = createMemoryHistory({ initialEntries: ['/c/test'] });
    eventUseList.mockReturnValue({
      items: [makeEvent('old-target', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });
    render(
      <Router history={history}>
        <Overview />
      </Router>
    );

    const firstChartDatum = percentageCircleMock.mock.lastCall?.[0].data[0];
    act(() => firstChartDatum.onClick());
    expect(resourceListViewMock.mock.lastCall?.[0].data).toEqual([
      expect.objectContaining({ message: 'old-target' }),
    ]);

    eventUseList.mockReturnValue({
      items: [makeEvent('new-target', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });
    act(() => history.push('/c/test?eventsFilter=new-target'));

    expect(resourceListViewMock.mock.lastCall?.[0]).toMatchObject({
      data: [expect.objectContaining({ message: 'new-target' })],
      defaultGlobalFilter: 'new-target',
    });

    eventUseList.mockReturnValue({
      items: [makeEvent('new-cluster', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });
    act(() => history.push('/c/other'));

    expect(resourceListViewMock.mock.lastCall?.[0].data).toEqual([
      expect.objectContaining({ message: 'new-cluster' }),
    ]);
  });

  it('announces when the event list is truncated', () => {
    eventUseList.mockReturnValue({
      items: [makeEvent('event', 'default')],
      errors: null,
      hasMore: true,
      remainingItemCount: 7,
    });

    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );

    expect(screen.getByRole('note')).toHaveTextContent(
      'Showing 1 loaded events; 7 more events are available.'
    );
    expect(percentageCircleMock.mock.lastCall?.[0].title).toBe('Loaded events');
  });

  it('always shows the last-seen timestamp fallback in the name column', () => {
    eventUseList.mockReturnValue({
      items: [makeEvent('event', 'default')],
      errors: null,
      hasMore: false,
      remainingItemCount: undefined,
    });
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );

    const nameColumn = resourceListViewMock.mock.lastCall?.[0].columns.find(
      (column: { id?: string }) => column.id === 'name'
    );
    const timestamp = nameColumn.render(makeEvent('event', 'default')).props.children[2];
    expect(timestamp.props.sx).not.toHaveProperty('display');
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
