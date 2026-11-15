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
import ResourceListView from '../common/Resource/ResourceListView';
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
  const queryParams = new URLSearchParams(location.search);
  const eventsFilter = queryParams.get('eventsFilter');
  const [savedFilters, setSavedFilters] = useLocalStorageState<EventFilters>(
    EVENT_FILTERS_STORAGE_KEY,
    defaultEventFilters
  );
  const filters: EventFilters = {
    search: typeof savedFilters.search === 'string' ? savedFilters.search : '',
    types: Array.isArray(savedFilters.types) ? savedFilters.types : [],
    nodes: Array.isArray(savedFilters.nodes) ? savedFilters.nodes : [],
  };
  const [snapshotEvents, setSnapshotEvents] = React.useState<Event[] | null>(null);
  const [isWarningEventSwitchChecked, setIsWarningEventSwitchChecked] = React.useState(
    Boolean(
      JSON.parse(
        localStorage.getItem(EVENT_WARNING_SWITCH_FILTER_STORAGE_KEY) ||
          EVENT_WARNING_SWITCH_DEFAULT.toString()
      )
    )
  );
  const namespace = useNamespaces();
  const { items: events, errors: eventsErrors } = Event.useList({
    limit: Event.maxLimit,
    namespace,
    refetchInterval: OVERVIEW_REFETCH_INTERVAL_MS,
  });

  const sourceEvents = snapshotEvents ?? events ?? [];
  const filteredEvents = React.useMemo(
    () => filterEvents(sourceEvents, filters, isWarningEventSwitchChecked),
    [sourceEvents, filters.search, filters.types, filters.nodes, isWarningEventSwitchChecked]
  );
  const chartEvents = React.useMemo(
    () => filterEvents(sourceEvents, { ...filters, types: [] }, isWarningEventSwitchChecked),
    [sourceEvents, filters.search, filters.nodes, isWarningEventSwitchChecked]
  );
  const eventTypes = React.useMemo(() => getEventTypes(sourceEvents), [sourceEvents]);
  const eventNodes = React.useMemo(() => getEventNodes(sourceEvents), [sourceEvents]);
  const eventTypeCounts = React.useMemo(() => getEventTypeCounts(chartEvents), [chartEvents]);
  const chartColors = [
    theme.palette.primary.main,
    theme.palette.warning.main,
    theme.palette.success.main,
    theme.palette.info.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
  ];

  const numWarnings = React.useMemo(
    () => events?.filter(e => e.type === 'Warning').length ?? '?',
    [events]
  );

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
      <SectionBox title={t('Events by type')} py={2}>
        <PercentageCircle
          title={t('Recent events')}
          label={String(chartEvents.length)}
          total={chartEvents.length}
          data={eventTypeCounts.map((item, index) => ({
            ...item,
            label: item.name,
            fill: chartColors[index % chartColors.length],
            onClick: () => {
              setSnapshotEvents(current => current ?? [...(events ?? [])]);
              setSavedFilters({ ...filters, types: [item.name] });
            },
          }))}
          legend={t('Select a slice to inspect a static snapshot')}
        />
      </SectionBox>
      <ResourceListView
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
                  onChange={(event, checked) => {
                    localStorage.setItem(
                      EVENT_WARNING_SWITCH_FILTER_STORAGE_KEY,
                      checked.toString()
                    );
                    setIsWarningEventSwitchChecked(checked);
                  }}
                  key="warning-toggle"
                />,
                ...(snapshotEvents
                  ? [
                      <Button key="resume-live-events" onClick={() => setSnapshotEvents(null)}>
                        {t('Resume live events')}
                      </Button>,
                    ]
                  : []),
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
                value={filters.search}
                onChange={event => setSavedFilters({ ...filters, search: event.target.value })}
                size="small"
              />
              <Autocomplete
                multiple
                options={eventTypes}
                value={filters.types}
                onChange={(event, types) => setSavedFilters({ ...filters, types })}
                renderInput={params => (
                  <TextField {...params} label={t('Event types')} size="small" />
                )}
              />
              <Autocomplete
                multiple
                options={eventNodes}
                value={filters.nodes}
                onChange={(event, nodes) => setSavedFilters({ ...filters, nodes })}
                renderInput={params => <TextField {...params} label={t('Nodes')} size="small" />}
              />
              <Button onClick={() => setSavedFilters(defaultEventFilters)}>
                {t('Clear filters')}
              </Button>
            </Box>
          </Box>
        }
        headerProps={{
          noNamespaceFilter: false,
        }}
        defaultGlobalFilter={eventsFilter ?? undefined}
        data={filteredEvents}
        errors={eventsErrors}
        columns={[
          {
            id: 'type',
            label: t('Type'),
            gridTemplate: 'min-content',
            filterVariant: 'multi-select',
            getValue: event => event.involvedObject.kind,
          },
          {
            id: 'name',
            label: t('Name'),
            getValue: event => event.involvedObjectInstance?.getName() ?? event.involvedObject.name,
            render: event => makeObjectLink(event),
            gridTemplate: 'auto',
          },
          'namespace',
          'cluster',
          {
            id: 'node',
            label: t('glossary|Node'),
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
    </>
  );
}
