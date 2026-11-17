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

import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import { Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useHistory } from 'react-router-dom';
import { useSelectedClusters } from '../../lib/k8s/api/v1/hooks';
import Event from '../../lib/k8s/event';
import Node from '../../lib/k8s/node';
import Pod from '../../lib/k8s/pod';
import { useNamespaces } from '../../redux/filterSlice';
import { useTypedSelector } from '../../redux/hooks';
import { OverviewChart } from '../../redux/overviewChartsSlice';
import { PercentageCircle } from '../common/Chart';
import EventsLifetimeInfo from '../common/EventsLifetimeInfo';
import { DateLabel } from '../common/Label';
import { StatusLabel } from '../common/Label';
import Link from '../common/Link';
import { PageGrid } from '../common/Resource';
import ResourceTable from '../common/Resource/ResourceTable';
import { SectionBox } from '../common/SectionBox';
import SectionFilterHeader from '../common/SectionFilterHeader';
import ShowHideLabel from '../common/ShowHideLabel';
import { LightTooltip } from '../common/Tooltip';
import { useLocalStorageState } from '../globalSearch/useLocalStorageState';
import {
  CpuCircularChart,
  MemoryCircularChart,
  NodesStatusCircleChart,
  PodsStatusCircleChart,
} from './Charts';
import { ClusterGroupErrorMessage } from './ClusterGroupErrorMessage';
import {
  defaultEventFilters,
  EventFilters,
  filterEvents,
  getEventNodes,
  getEventTypeCounts,
  getEventTypes,
} from './eventFilters';

const OVERVIEW_REFETCH_INTERVAL_MS = 60_000;
const EVENT_FILTERS_STORAGE_KEY = 'headlamp.events.filters.v1';

export default function Overview() {
  const { t } = useTranslation(['translation']);
  // The overview only needs periodic snapshots for aggregate charts. Avoid long-lived
  // watches here because large clusters can stream enough events to exhaust the tab.
  const podsQuery = Pod.useList({
    refetchInterval: OVERVIEW_REFETCH_INTERVAL_MS,
  });
  const [pods] = podsQuery;
  const [nodes] = Node.useList({
    refetchInterval: OVERVIEW_REFETCH_INTERVAL_MS,
  });
  const [nodeMetrics, metricsError] = Node.useMetrics();
  const chartProcessors = useTypedSelector(state => state.overviewCharts.processors);

  const noPermissions = metricsError?.status === 403;
  const noMetrics = metricsError !== null && !noPermissions;

  // Process the default charts through any registered processors
  const defaultCharts: OverviewChart[] = [
    {
      id: 'cpu',
      component: () => (
        <CpuCircularChart
          items={nodes}
          itemsMetrics={nodeMetrics}
          noMetrics={noMetrics}
          metricsError={metricsError}
        />
      ),
    },
    {
      id: 'memory',
      component: () => (
        <MemoryCircularChart
          items={nodes}
          itemsMetrics={nodeMetrics}
          noMetrics={noMetrics}
          metricsError={metricsError}
        />
      ),
    },
    {
      id: 'pods',
      component: () => <PodsStatusCircleChart items={pods} />,
    },
    {
      id: 'nodes',
      component: () => (
        <NodesStatusCircleChart items={nodes} pods={pods} podsLoaded={podsQuery.isSuccess} />
      ),
    },
  ];
  const charts = chartProcessors.reduce(
    (currentCharts, p) => p.processor(currentCharts),
    defaultCharts
  );

  return (
    <PageGrid>
      <SectionBox title={t('translation|Overview')} py={2} mt={[4, 0, 0]}>
        {noPermissions ? (
          <ClusterGroupErrorMessage errors={[metricsError]} />
        ) : (
          <Grid container justifyContent="flex-start" alignItems="stretch" spacing={4}>
            {charts.map(chart => (
              <Grid key={chart.id} item xs sx={{ maxWidth: '300px' }}>
                <chart.component />
              </Grid>
            ))}
          </Grid>
        )}
      </SectionBox>
      <EventsSection />
    </PageGrid>
  );
}

function EventsSection() {
  const EVENT_WARNING_SWITCH_FILTER_STORAGE_KEY = 'EVENT_WARNING_SWITCH_FILTER_STORAGE_KEY';
  const EVENT_WARNING_SWITCH_DEFAULT = true;
  const { t } = useTranslation(['translation', 'glossary']);
  const theme = useTheme();
  const location = useLocation();
  const history = useHistory();
  const queryParams = new URLSearchParams(location.search);
  const eventsFilter = queryParams.get('eventsFilter');
  const selectedClusters = useSelectedClusters();
  const clusterFilterKey = [...selectedClusters].sort().map(encodeURIComponent).join('+') || 'all';
  const [savedFilters, setSavedFilters] = useLocalStorageState<EventFilters>(
    `${EVENT_FILTERS_STORAGE_KEY}.${clusterFilterKey}`,
    defaultEventFilters
  );
  const [savedWarningOnly, setSavedWarningOnly] = useLocalStorageState<boolean>(
    EVENT_WARNING_SWITCH_FILTER_STORAGE_KEY,
    EVENT_WARNING_SWITCH_DEFAULT
  );
  const storedFilters =
    savedFilters !== null && typeof savedFilters === 'object' ? savedFilters : defaultEventFilters;
  const filters = React.useMemo<EventFilters>(
    () => ({
      search: typeof storedFilters.search === 'string' ? storedFilters.search : '',
      types: Array.isArray(storedFilters.types)
        ? storedFilters.types.filter((value): value is string => typeof value === 'string')
        : [],
      nodes: Array.isArray(storedFilters.nodes)
        ? storedFilters.nodes.filter((value): value is string => typeof value === 'string')
        : [],
    }),
    [storedFilters]
  );
  const [snapshot, setSnapshot] = React.useState<{
    scope: string;
    events: Event[];
    hasMore: boolean | undefined;
    remainingItemCount: number | undefined;
  } | null>(null);
  const snapshotScope = `${location.pathname}:${eventsFilter ?? ''}`;
  const notificationBypass = Boolean(eventsFilter);
  const activeSnapshot = snapshot?.scope === snapshotScope ? snapshot : null;
  const snapshotEvents = activeSnapshot?.events ?? null;
  const previousSnapshotScope = React.useRef(snapshotScope);
  React.useEffect(() => {
    if (previousSnapshotScope.current === snapshotScope) {
      return;
    }

    previousSnapshotScope.current = snapshotScope;
    setSnapshot(current => (current?.scope === snapshotScope ? current : null));
  }, [snapshotScope]);
  const appliedFilters = notificationBypass ? defaultEventFilters : filters;
  const visibleFilters = notificationBypass ? defaultEventFilters : filters;
  const isWarningEventSwitchChecked =
    typeof savedWarningOnly === 'boolean' ? savedWarningOnly : EVENT_WARNING_SWITCH_DEFAULT;
  const namespace = useNamespaces();
  const {
    items: events,
    errors: eventsErrors,
    hasMore,
    remainingItemCount,
  } = Event.useList({
    limit: Event.maxLimit,
    namespace,
    refetchInterval: OVERVIEW_REFETCH_INTERVAL_MS,
  });

  const sourceEvents = snapshotEvents ?? events ?? null;
  const namespaceEvents = React.useMemo(
    () =>
      sourceEvents === null || namespace.length === 0
        ? sourceEvents
        : sourceEvents.filter(event => namespace.includes(event.getNamespace() ?? '')),
    [namespace, sourceEvents]
  );
  const filteredEvents = React.useMemo(
    () =>
      namespaceEvents === null
        ? null
        : filterEvents(namespaceEvents, appliedFilters, isWarningEventSwitchChecked),
    [appliedFilters, isWarningEventSwitchChecked, namespaceEvents]
  );
  const chartEvents = React.useMemo(
    () =>
      namespaceEvents === null
        ? null
        : filterEvents(
            namespaceEvents,
            { ...appliedFilters, types: [] },
            isWarningEventSwitchChecked
          ),
    [appliedFilters, isWarningEventSwitchChecked, namespaceEvents]
  );
  const eventTypes = React.useMemo(() => getEventTypes(namespaceEvents ?? []), [namespaceEvents]);
  const eventNodes = React.useMemo(() => getEventNodes(namespaceEvents ?? []), [namespaceEvents]);
  const eventTypeCounts = React.useMemo(() => getEventTypeCounts(chartEvents ?? []), [chartEvents]);
  const chartColors = [
    theme.palette.primary.main,
    theme.palette.warning.main,
    theme.palette.success.main,
    theme.palette.info.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
  ];

  const numWarnings = React.useMemo(
    () => namespaceEvents?.filter(e => e.type === 'Warning').length ?? '?',
    [namespaceEvents]
  );

  function renderEventStatus(matchingEventCount: number) {
    return matchingEventCount === 1
      ? snapshotEvents
        ? t('Static event snapshot. Showing {{count}} matching event.', {
            count: matchingEventCount,
          })
        : t('Live events. Showing {{count}} matching event.', {
            count: matchingEventCount,
          })
      : snapshotEvents
      ? t('Static event snapshot. Showing {{count}} matching events.', {
          count: matchingEventCount,
        })
      : t('Live events. Showing {{count}} matching events.', {
          count: matchingEventCount,
        });
  }

  function leaveNotificationMode() {
    if (!eventsFilter) {
      return;
    }

    setSnapshot(current =>
      current?.scope === snapshotScope ? { ...current, scope: `${location.pathname}:` } : current
    );
    queryParams.delete('eventsFilter');
    const search = queryParams.toString();
    history.replace({
      ...location,
      search: search ? `?${search}` : '',
    });
  }

  function updateFilters(nextFilters: EventFilters) {
    leaveNotificationMode();
    setSavedFilters(nextFilters);
  }

  function selectResourceKind(kind: string) {
    if (!snapshotEvents) {
      setSnapshot({
        scope: eventsFilter ? `${location.pathname}:` : snapshotScope,
        events: [...(events ?? [])],
        hasMore,
        remainingItemCount,
      });
    }
    updateFilters({ ...visibleFilters, types: [kind] });
  }

  function makeStatusLabel(event: Event) {
    return (
      <StatusLabel
        status={event.type === 'Normal' ? '' : 'warning'}
        sx={(theme: Theme) => ({
          [theme.breakpoints.up('md')]: {
            display: 'unset',
          },
        })}
      >
        {event.reason}
      </StatusLabel>
    );
  }

  function makeObjectLink(event: Event) {
    const obj = event.involvedObjectInstance;
    if (!!obj) {
      return <Link kubeObject={obj} />;
    }

    return event.involvedObject.name;
  }

  return (
    <>
      <SectionBox title={t('Loaded events by resource kind')} py={2}>
        <PercentageCircle
          title={t('Loaded events')}
          label={chartEvents === null ? '' : String(chartEvents.length)}
          total={chartEvents === null ? -1 : chartEvents.length}
          data={eventTypeCounts.map((item, index) => ({
            ...item,
            label: item.name,
            fill: chartColors[index % chartColors.length],
            onClick: () => selectResourceKind(item.name),
          }))}
          legend={
            <Box>
              <Box>{t('Select a resource kind to inspect a static snapshot')}</Box>
              <Box
                component="ul"
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 0.5,
                  listStyle: 'none',
                  m: 0,
                  p: 0,
                }}
              >
                {eventTypeCounts.map(item => (
                  <Box component="li" key={item.name}>
                    <Button size="small" onClick={() => selectResourceKind(item.name)}>
                      {item.name}: {item.value}
                    </Button>
                  </Box>
                ))}
              </Box>
            </Box>
          }
        />
        {(activeSnapshot ? activeSnapshot.hasMore : hasMore) && (
          <Box role="note" textAlign="center" mt={1}>
            {(activeSnapshot ? activeSnapshot.remainingItemCount : remainingItemCount) === undefined
              ? t('More events are available beyond the {{count}} loaded events.', {
                  count: sourceEvents?.length ?? 0,
                })
              : t('Showing {{count}} loaded events; {{remaining}} more events are available.', {
                  count: sourceEvents?.length ?? 0,
                  remaining: activeSnapshot
                    ? activeSnapshot.remainingItemCount
                    : remainingItemCount,
                })}
          </Box>
        )}
      </SectionBox>
      <SectionBox
        title={
          <Box>
            <SectionFilterHeader
              title={t('glossary|Events')}
              noNamespaceFilter={false}
              titleSideActions={[
                <EventsLifetimeInfo key="event-lifetime-info" />,
                <FormControlLabel
                  checked={isWarningEventSwitchChecked}
                  label={t('Only warnings ({{ numWarnings }})', {
                    numWarnings,
                  })}
                  control={<Switch color="primary" />}
                  onChange={(event, checked) => setSavedWarningOnly(checked)}
                  key="warning-toggle"
                />,
                <Button
                  key="event-mode-toggle"
                  disabled={!snapshotEvents && !events}
                  onClick={() =>
                    setSnapshot(
                      snapshotEvents
                        ? null
                        : {
                            scope: snapshotScope,
                            events: [...(events ?? [])],
                            hasMore,
                            remainingItemCount,
                          }
                    )
                  }
                >
                  {snapshotEvents ? t('Resume live events') : t('Pause live events')}
                </Button>,
              ]}
            />
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr auto' },
                px: 2,
                pb: 2,
              }}
            >
              <TextField
                label={t('Search events')}
                placeholder={t('Use * as a wildcard')}
                value={visibleFilters.search}
                onChange={event => updateFilters({ ...visibleFilters, search: event.target.value })}
                size="small"
              />
              <Autocomplete
                multiple
                options={eventTypes}
                value={visibleFilters.types}
                onChange={(event, types) => updateFilters({ ...visibleFilters, types })}
                renderInput={params => (
                  <TextField {...params} label={t('Resource kinds')} size="small" />
                )}
              />
              <Autocomplete
                multiple
                options={eventNodes}
                value={visibleFilters.nodes}
                onChange={(event, nodes) => updateFilters({ ...visibleFilters, nodes })}
                renderInput={params => (
                  <TextField {...params} label={t('glossary|Nodes')} size="small" />
                )}
              />
              <Button onClick={() => updateFilters(defaultEventFilters)}>
                {t('Clear filters')}
              </Button>
            </Box>
          </Box>
        }
      >
        <ResourceTable<typeof Event>
          key={`${location.pathname}:${notificationBypass ? eventsFilter ?? '' : ''}`}
          enableRowActions
          enableRowSelection
          defaultGlobalFilter={notificationBypass ? eventsFilter ?? undefined : undefined}
          data={filteredEvents}
          errors={eventsErrors}
          renderFilteredRowCount={count =>
            sourceEvents === null ? null : renderEventStatus(count)
          }
          columns={[
            {
              id: 'name',
              label: t('Name'),
              getValue: event =>
                event.involvedObjectInstance?.getName() ?? event.involvedObject.name,
              render: event => (
                <Box>
                  {makeObjectLink(event)}
                  <Box
                    sx={{
                      mt: 0.5,
                      color: 'text.secondary',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <Box>{event.reason}</Box>
                    {event.source?.host && <Box>{event.source.host}</Box>}
                    <ShowHideLabel>{event.message ?? ''}</ShowHideLabel>
                  </Box>
                  <Box sx={{ mt: 0.5, color: 'text.secondary' }}>
                    <Box component="span">{t('Last Seen')}:</Box>
                    <DateLabel date={event.lastOccurrence} format="mini" />
                  </Box>
                </Box>
              ),
              gridTemplate: 'auto',
            },
            {
              id: 'type',
              label: t('Resource Kind'),
              gridTemplate: 'min-content',
              filterVariant: 'multi-select',
              getValue: event => event.involvedObject.kind,
            },
            'namespace',
            'cluster',
            {
              id: 'node',
              label: t('glossary|Nodes'),
              gridTemplate: 'min-content',
              filterVariant: 'multi-select',
              getValue: event => event.source?.host ?? '',
            },
            {
              id: 'reason',
              label: t('Reason'),
              gridTemplate: 'min-content',
              filterVariant: 'multi-select',
              getValue: event => event.reason,
              render: event => (
                <LightTooltip title={event.reason} interactive>
                  {makeStatusLabel(event)}
                </LightTooltip>
              ),
            },
            {
              id: 'message',
              label: t('Message'),
              getValue: event => event.message ?? '',
              render: event => (
                <ShowHideLabel labelId={event.metadata?.uid || ''}>
                  {event.message || ''}
                </ShowHideLabel>
              ),
              gridTemplate: 'auto',
            },
            {
              id: 'count',
              label: t('Count'),
              gridTemplate: 'min-content',
              cellProps: { align: 'right' },
              getValue: event => event.count ?? null,
              render: event => event.count ?? '-',
            },
            {
              id: 'last-seen',
              label: t('Last Seen'),
              gridTemplate: 'min-content',
              cellProps: { align: 'right' },
              getValue: event => -new Date(event.lastOccurrence).getTime(),
              render: event => <DateLabel date={event.lastOccurrence} format="mini" />,
            },
          ]}
          defaultSortingColumn={{ id: 'last-seen', desc: false }}
          id="headlamp-cluster.overview.events"
        />
      </SectionBox>
    </>
  );
}
