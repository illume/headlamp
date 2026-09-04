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

import { Icon } from '@iconify/react';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/system';
import { Terminal as XTerminal } from '@xterm/xterm';
import _ from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import {
  getAllContainers,
  getDefaultContainer,
  resolveContainerName,
} from '../../helpers/podContainer';
import { KubeContainerStatus } from '../../lib/k8s/cluster';
import Pod from '../../lib/k8s/pod';
import { localeDate } from '../../lib/util';
import { DefaultHeaderAction } from '../../redux/actionButtonsSlice';
import { EventStatus, HeadlampEventType, useEventCallback } from '../../redux/headlampEventSlice';
import { Activity } from '../activity/Activity';
import ActionButton from '../common/ActionButton';
import Link from '../common/Link';
import { LogViewer, LogViewerProps } from '../common/LogViewer';
import { NameValueTableRow } from '../common/NameValueTable';
import {
  ConditionsSection,
  ContainersSection,
  DetailsGrid,
  MetadataDictGrid,
  VolumeSection,
} from '../common/Resource';
import AuthVisible from '../common/Resource/AuthVisible';
import {
  ALL_SEVERITIES,
  filterLogsBySeverity,
  LogSeverity,
} from '../common/Resource/logSeverityFilter';
import SectionBox from '../common/SectionBox';
import SimpleTable from '../common/SimpleTable';
import Terminal from '../common/Terminal';
import LightTooltip from '../common/Tooltip/TooltipLight';
import { PodDiagnosticsSection } from '../diagnostics/Diagnostics';
import { useLocalStorageState } from '../globalSearch/useLocalStorageState';
import { colorizePrettifiedLog } from './jsonHandling';
import { makePodStatusLabel } from './List';
import { PodDebugAction } from './PodDebugAction';

const PaddedFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  margin: 0,
  paddingTop: theme.spacing(2),
  paddingRight: theme.spacing(1),
}));

/** Props for the pod-specific log viewer. */
interface PodLogViewerProps extends Omit<LogViewerProps, 'logs'> {
  /** Pod whose container logs are streamed. */
  item: Pod;
  /** Preferred initial container; falls back to the pod's default container when invalid. */
  initialContainer?: string;
}

/** A batch of cumulative log lines to apply to the terminal and download buffer. */
interface PodLogUpdate {
  /** All raw log lines accumulated for the active streams. */
  logs: string[];
  /** Whether at least one active stream contains JSON log entries. */
  hasJsonLogs: boolean;
  /** Clear and rebuild the terminal; defaults to incremental rendering when omitted. */
  replace?: boolean;
}

/** State retained for one active container log stream. */
interface ActiveContainerLogStream {
  cancel?: () => void;
  onLogs?: ReturnType<typeof _.debounce>;
  previousLogs?: string[];
  logCount: number;
  hasJsonLogs: boolean;
  reconnectStopped: boolean;
  active: boolean;
}

export function normalizeContainerSelection(value: string | string[]): string[] {
  return typeof value === 'string'
    ? value
        .split(',')
        .map(container => container.trim())
        .filter(Boolean)
    : value;
}

/**
 * Streams logs for a non-empty selection of a pod's regular, init, and ephemeral containers.
 *
 * @param props - Pod, dialog, and initial-container configuration.
 * @returns A log viewer with container-selection and stream controls.
 */
export function PodLogViewer(props: PodLogViewerProps): React.ReactElement {
  const { item, onClose, open, initialContainer, ...other } = props;
  const [containers, setContainers] = React.useState(() => [
    resolveContainerName(item, initialContainer),
  ]);
  const [showPrevious, setShowPrevious] = React.useState<boolean>(false);
  const [showTimestamps, setShowTimestamps] = useLocalStorageState<boolean>(
    'headlamp.logs.showTimestamps',
    true
  );
  const [follow, setFollow] = useLocalStorageState<boolean>('headlamp.logs.follow', true);
  const [prettifyLogs, setPrettifyLogs] = useLocalStorageState<boolean>(
    'headlamp.logs.prettifyLogs',
    false
  );
  const [formatJsonValues, setFormatJsonValues] = React.useState<boolean>(false);
  const [hasJsonLogs, setHasJsonLogs] = React.useState<boolean>(false);
  const [lines, setLines] = React.useState<number>(100);
  const [logs, setLogs] = React.useState<{ logs: string[]; lastLineShown: number }>({
    logs: [],
    lastLineShown: -1,
  });
  const [showReconnectButton, setShowReconnectButton] = React.useState(false);
  const [reconnect, setReconnect] = React.useState(0);
  const xtermRef = React.useRef<XTerminal | null>(null);
  const activeStreamsRef = React.useRef<Map<string, ActiveContainerLogStream>>(new Map());
  const combinedLogsRef = React.useRef<string[]>([]);
  const combinedLogContainersRef = React.useRef<string[]>([]);
  const streamConfigRef = React.useRef('');
  const podIdentity = `${item.cluster ?? ''}/${item.getNamespace?.() ?? ''}/${
    item.metadata?.uid ?? item.getName()
  }`;
  const selectionPodIdentityRef = React.useRef(podIdentity);
  const streamPodIdentityRef = React.useRef(podIdentity);
  const { t } = useTranslation();
  const [selectedSeverities, setSelectedSeverities] = useLocalStorageState<LogSeverity[]>(
    'headlamp.logs.severityFilter',
    ALL_SEVERITIES
  );
  const selectedSeveritiesRef = React.useRef(selectedSeverities);

  React.useEffect(() => {
    selectedSeveritiesRef.current = selectedSeverities;
  }, [selectedSeverities]);

  // Re-render xterm when selectedSeverities changes
  React.useEffect(() => {
    if (xtermRef.current && logs.logs.length > 0) {
      xtermRef.current.clear();
      const displayLogs = logs.logs.map(logEntry => {
        if (prettifyLogs && hasJsonLogs) {
          return colorizePrettifiedLog(logEntry);
        }
        return logEntry;
      });
      const filteredLogs = filterLogsBySeverity(displayLogs, selectedSeverities);
      xtermRef.current.write(filteredLogs.join('').replaceAll('\n', '\r\n'));

      // Update lastLineShown just in case, though it shouldn't be strictly necessary here
      setLogs(current => ({ ...current, lastLineShown: current.logs.length - 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeverities]);

  const options = { leading: true, trailing: true, maxWait: 1000 };

  /**
   * Applies a cumulative log update, appending unseen lines unless a stream reset requires a
   * complete terminal rebuild.
   *
   * @param update - Cumulative logs and rendering metadata for the active streams.
   */
  function applyLogs(update: PodLogUpdate): void {
    const { logs: logLines, hasJsonLogs, replace } = update;
    setHasJsonLogs(hasJsonLogs);

    setLogs(current => {
      if (replace || current.lastLineShown >= logLines.length) {
        // Full re-render
        const displayLogs = logLines.map(logEntry => {
          if (prettifyLogs && hasJsonLogs) {
            return colorizePrettifiedLog(logEntry);
          }
          return logEntry;
        });
        const filteredLogs = filterLogsBySeverity(displayLogs, selectedSeveritiesRef.current);
        xtermRef.current?.clear();
        xtermRef.current?.write(filteredLogs.join('').replaceAll('\n', '\r\n'));
      } else {
        // Incremental write: slice raw lines first, then format and filter
        const newRawLines = logLines.slice(current.lastLineShown + 1);
        const displayLogs = newRawLines.map(logEntry => {
          if (prettifyLogs && hasJsonLogs) {
            return colorizePrettifiedLog(logEntry);
          }
          return logEntry;
        });
        const filteredLogs = filterLogsBySeverity(displayLogs, selectedSeveritiesRef.current);

        if (filteredLogs.length > 0) {
          xtermRef.current?.write(filteredLogs.join('').replaceAll('\n', '\r\n'));
        }
      }

      return {
        logs: logLines,
        lastLineShown: logLines.length - 1,
      };
    });

    // If we stopped following the logs and we have logs already,
    // then we don't need to fetch them again.
    if (!follow && logs.logs.length > 0) {
      xtermRef.current?.write(
        '\n\n' +
          t('translation|Logs are paused. Click the follow button to resume following them.') +
          '\r\n'
      );
      return;
    }
  }

  React.useEffect(() => {
    const knownContainers = new Set(getAllContainers(item).map(container => container.name));
    setContainers(current => {
      if (selectionPodIdentityRef.current !== podIdentity) {
        selectionPodIdentityRef.current = podIdentity;
        const next = resolveContainerName(item, initialContainer);
        return next ? [next] : [];
      }

      const validContainers = current.filter(name => knownContainers.has(name));
      if (validContainers.length > 0) {
        return validContainers.length === current.length ? current : validContainers;
      }

      const next = getDefaultContainer(item);
      return next ? [next] : [];
    });
  }, [initialContainer, item, item?.spec, item?.status, podIdentity]);

  React.useEffect(() => {
    const activeStreams = activeStreamsRef.current;
    return () => {
      activeStreams.forEach(stream => {
        stream.active = false;
        stream.onLogs?.cancel();
        stream.cancel?.();
      });
      activeStreams.clear();
    };
  }, []);

  React.useEffect(
    () => {
      const activeStreams = activeStreamsRef.current;
      const knownContainers = new Set(getAllContainers(item).map(container => container.name));
      const selectedContainers = containers.filter(
        container => container && knownContainers.has(container)
      );
      const streamConfig = [
        podIdentity,
        lines,
        showPrevious,
        showTimestamps,
        follow,
        prettifyLogs,
        formatJsonValues,
        reconnect,
      ].join('|');

      const stopStream = (container: string) => {
        const stream = activeStreams.get(container);
        if (!stream) {
          return;
        }
        stream.active = false;
        stream.onLogs?.cancel();
        stream.cancel?.();
        activeStreams.delete(container);
      };
      const stopAllStreams = () => {
        [...activeStreams.keys()].forEach(stopStream);
      };
      const updateReconnectButton = () => {
        setShowReconnectButton([...activeStreams.values()].some(stream => stream.reconnectStopped));
      };
      const resetLogs = () => {
        combinedLogsRef.current = [];
        combinedLogContainersRef.current = [];
        xtermRef.current?.clear();
        setLogs({ logs: [], lastLineShown: -1 });
        setHasJsonLogs(false);
      };
      const filterCombinedLogs = (keepContainer: (container: string) => boolean) => {
        const filteredLogs: string[] = [];
        const filteredContainers: string[] = [];
        combinedLogContainersRef.current.forEach((container, index) => {
          if (keepContainer(container)) {
            filteredContainers.push(container);
            filteredLogs.push(combinedLogsRef.current[index]);
          }
        });
        combinedLogsRef.current = filteredLogs;
        combinedLogContainersRef.current = filteredContainers;
      };

      if (!open) {
        stopAllStreams();
        streamConfigRef.current = '';
        resetLogs();
        setShowReconnectButton(false);
        return;
      }

      if (streamPodIdentityRef.current !== podIdentity) {
        streamPodIdentityRef.current = podIdentity;
        stopAllStreams();
        streamConfigRef.current = streamConfig;
        resetLogs();
        setShowReconnectButton(false);
        return;
      }

      if (streamConfigRef.current !== streamConfig) {
        stopAllStreams();
        streamConfigRef.current = streamConfig;
        resetLogs();
        setShowReconnectButton(false);
      }

      const selectedSet = new Set(selectedContainers);
      let selectionRemoved = false;
      [...activeStreams.keys()].forEach(container => {
        if (!selectedSet.has(container)) {
          stopStream(container);
          selectionRemoved = true;
        }
      });

      if (selectionRemoved) {
        filterCombinedLogs(container => selectedSet.has(container));
        applyLogs({
          logs: combinedLogsRef.current,
          hasJsonLogs: [...activeStreams.values()].some(stream => stream.hasJsonLogs),
          replace: true,
        });
        updateReconnectButton();
      }

      selectedContainers.forEach(container => {
        if (activeStreams.has(container)) {
          return;
        }

        const streamState: ActiveContainerLogStream = {
          logCount: 0,
          hasJsonLogs: false,
          reconnectStopped: false,
          active: true,
        };
        const onLogs = _.debounce(
          ({ logs, hasJsonLogs }: { logs: string[]; hasJsonLogs: boolean }) => {
            if (!streamState.active || activeStreamsRef.current.get(container) !== streamState) {
              return;
            }

            const streamRestarted =
              logs.length < streamState.logCount ||
              (streamState.previousLogs !== undefined &&
                streamState.previousLogs !== logs &&
                streamState.previousLogs.some((log, index) => logs[index] !== log));
            const firstNewLog = streamRestarted ? 0 : streamState.logCount;
            streamState.previousLogs = logs;
            streamState.logCount = logs.length;
            streamState.hasJsonLogs = hasJsonLogs;

            if (streamRestarted) {
              filterCombinedLogs(logContainer => logContainer !== container);
            }

            const newLogs = logs.slice(firstNewLog);
            for (const log of newLogs) {
              combinedLogsRef.current.push(log);
              combinedLogContainersRef.current.push(container);
            }
            if (!streamRestarted && newLogs.length === 0) {
              return;
            }

            applyLogs({
              logs: combinedLogsRef.current,
              hasJsonLogs: [...activeStreamsRef.current.values()].some(
                stream => stream.hasJsonLogs
              ),
              replace: streamRestarted,
            });
          },
          500,
          options
        );
        streamState.onLogs = onLogs;
        activeStreams.set(container, streamState);
        streamState.cancel = item.getLogs(container, onLogs, {
          tailLines: lines,
          showPrevious,
          showTimestamps,
          follow,
          prettifyLogs,
          formatJsonValues,
          onReconnectStop: () => {
            if (streamState.active && activeStreamsRef.current.get(container) === streamState) {
              streamState.reconnectStopped = true;
              updateReconnectButton();
            }
          },
        });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      containers,
      lines,
      open,
      showPrevious,
      showTimestamps,
      follow,
      prettifyLogs,
      formatJsonValues,
      reconnect,
      podIdentity,
    ]
  );

  /**
   * Applies a container selection while preserving the invariant that one container remains.
   *
   * @param event - MUI select change containing the selected container names.
   */
  function handleContainerChange(event: SelectChangeEvent<string[]>): void {
    const selectedContainers = normalizeContainerSelection(event.target.value);
    if (selectedContainers.length > 0) {
      setContainers(selectedContainers);
      if (!haveContainersRestarted(selectedContainers)) {
        setShowPrevious(false);
      }
    }
  }

  function handleLinesChange(event: any) {
    setLines(event.target.value);
  }

  function handlePreviousChange() {
    setShowPrevious(previous => !previous);
  }

  /**
   * Checks whether every named container has a previous instance available from Kubernetes.
   *
   * Previous logs are requested for every active stream, so a mixed selection is eligible only
   * when all selected regular, init, or ephemeral containers have restarted.
   *
   * @param containerNames - Container names to check; defaults to the active selection.
   * @returns Whether the selection is non-empty and every container has restarted.
   */
  function haveContainersRestarted(containerNames: string[] = containers): boolean {
    const containerStatuses = [
      ...(item?.status?.containerStatuses ?? []),
      ...(item?.status?.initContainerStatuses ?? []),
      ...(item?.status?.ephemeralContainerStatuses ?? []),
    ];
    return (
      containerNames.length > 0 &&
      containerNames.every(container => {
        const cont = containerStatuses.find((c: KubeContainerStatus) => c.name === container);
        return !!cont?.lastState?.terminated?.containerID;
      })
    );
  }

  React.useEffect(() => {
    if (showPrevious && !haveContainersRestarted()) {
      setShowPrevious(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containers, item?.status, showPrevious]);

  function handleTimestampsChange() {
    setShowTimestamps(prev => !prev);
  }

  function handleFollowChange() {
    setFollow(follow => !follow);
  }

  function handlePrettifyChange() {
    setPrettifyLogs(prettify => !prettify);
  }

  function handleFormatJsonValuesChange() {
    setFormatJsonValues(format => !format);
  }

  /**
   * Restarts every selected container stream and hides the reconnect prompt.
   */
  function handleReconnect(): void {
    setShowReconnectButton(false);
    setReconnect(value => value + 1);
  }

  function renderContainerOption(name: string, key: string = name): React.ReactElement {
    const isSelected = containers.includes(name);
    const isLastSelected = containers.length === 1 && isSelected;
    return (
      <MenuItem value={name} key={key} disabled={isLastSelected}>
        <Checkbox checked={isSelected} disabled={isLastSelected} size="small" />
        <ListItemText primary={name} />
      </MenuItem>
    );
  }

  return (
    <LogViewer
      title={t('glossary|Logs: {{ itemName }}', { itemName: item.getName() })}
      downloadName={`${item.getName()}_${containers.join('_')}`}
      open={open}
      onClose={onClose}
      logs={logs.logs}
      xtermRef={xtermRef}
      handleReconnect={handleReconnect}
      showReconnectButton={showReconnectButton}
      topActions={[
        <FormControl sx={{ minWidth: '11rem' }}>
          <InputLabel shrink id="container-name-chooser-label">
            {t('glossary|Containers')}
          </InputLabel>
          <Select
            labelId="container-name-chooser-label"
            id="container-name-chooser"
            multiple
            value={containers}
            onChange={handleContainerChange}
            renderValue={selected => selected.join(', ')}
            inputProps={{ 'aria-describedby': 'container-name-chooser-help' }}
          >
            {!!item?.spec?.containers?.length && (
              <ListSubheader role="presentation">{t('glossary|Containers')}</ListSubheader>
            )}
            {item?.spec?.containers.map(({ name }) => renderContainerOption(name))}
            {!!item?.spec?.initContainers?.length && (
              <ListSubheader role="presentation">{t('translation|Init Containers')}</ListSubheader>
            )}
            {item.spec.initContainers?.map(({ name }) =>
              renderContainerOption(name, `init_container_${name}`)
            )}
            {!!item?.spec?.ephemeralContainers?.length && (
              <ListSubheader role="presentation">
                {t('glossary|Ephemeral Containers')}
              </ListSubheader>
            )}
            {item.spec.ephemeralContainers?.map(({ name }) =>
              renderContainerOption(name, `eph_container_${name}`)
            )}
          </Select>
          <FormHelperText id="container-name-chooser-help">
            {t('translation|At least one container must remain selected.')}
          </FormHelperText>
        </FormControl>,
        <FormControl sx={{ minWidth: '6rem' }}>
          <InputLabel shrink id="container-lines-chooser-label">
            {t('translation|Lines')}
          </InputLabel>
          <Select
            labelId="container-lines-chooser-label"
            id="container-lines-chooser"
            value={lines}
            onChange={handleLinesChange}
          >
            {[100, 1000, 2500].map(i => (
              <MenuItem value={i} key={i}>
                {i}
              </MenuItem>
            ))}
            <MenuItem value={-1}>All</MenuItem>
          </Select>
        </FormControl>,
        <LightTooltip
          title={
            haveContainersRestarted()
              ? containers.length === 1
                ? t('translation|Show logs for previous instances of this container.')
                : t('translation|Show logs for previous instances of the selected containers.')
              : t(
                  'translation|You can only select this option for containers that have been restarted.'
                )
          }
        >
          <PaddedFormControlLabel
            label={t('translation|Previous')}
            disabled={!haveContainersRestarted()}
            control={
              <Switch
                checked={showPrevious}
                onChange={handlePreviousChange}
                name="checkPrevious"
                color="primary"
                size="small"
                sx={{ transform: 'scale(0.8)' }}
              />
            }
          />
        </LightTooltip>,
        <LightTooltip title={t('translation|Show timestamps in the logs.')}>
          <PaddedFormControlLabel
            label={t('translation|Timestamps')}
            control={
              <Switch
                checked={showTimestamps}
                onChange={handleTimestampsChange}
                name="checkTimestamps"
                color="primary"
                size="small"
                sx={{ transform: 'scale(0.8)' }}
              />
            }
          />
        </LightTooltip>,
        <LightTooltip title={t('translation|Follow logs in real-time.')}>
          <PaddedFormControlLabel
            label={t('translation|Follow')}
            control={
              <Switch
                checked={follow}
                onChange={handleFollowChange}
                name="follow"
                color="primary"
                size="small"
                sx={{ transform: 'scale(0.8)' }}
              />
            }
          />
        </LightTooltip>,
        <FormControl sx={{ minWidth: '9rem' }}>
          <InputLabel shrink id="severity-filter-label">
            {t('translation|Severity')}
          </InputLabel>
          <Select
            labelId="severity-filter-label"
            id="severity-filter"
            multiple
            value={selectedSeverities}
            onChange={event => {
              const value = event.target.value as LogSeverity[];
              if (value.length > 0) {
                setSelectedSeverities(() => value);
              }
            }}
            renderValue={selected =>
              selected.length === ALL_SEVERITIES.length
                ? t('translation|All')
                : (selected as LogSeverity[]).map(s => s.toUpperCase()).join(', ')
            }
          >
            {ALL_SEVERITIES.map(severity => (
              <MenuItem key={severity} value={severity}>
                <Checkbox checked={selectedSeverities.includes(severity)} size="small" />
                <ListItemText primary={severity.toUpperCase()} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>,
        hasJsonLogs && (
          <PaddedFormControlLabel
            label={t('translation|Prettify')}
            control={
              <Switch
                checked={prettifyLogs}
                onChange={handlePrettifyChange}
                name="prettifyLogs"
                color="primary"
                size="small"
                sx={{ transform: 'scale(0.8)' }}
              />
            }
          />
        ),
        hasJsonLogs && (
          <LightTooltip
            title={t('translation|Show JSON values in plain text by removing escape characters.')}
          >
            <PaddedFormControlLabel
              label={t('translation|Format')}
              control={
                <Switch
                  checked={formatJsonValues}
                  onChange={handleFormatJsonValuesChange}
                  name="formatJsonValues"
                  color="primary"
                  size="small"
                  sx={{ transform: 'scale(0.8)' }}
                />
              }
            />
          </LightTooltip>
        ),
      ].filter(Boolean)}
      {...other}
    />
  );
}

export interface VolumeDetailsProps {
  volumes: any[] | null;
}

export function VolumeDetails(props: VolumeDetailsProps) {
  const { volumes } = props;
  const { t } = useTranslation();
  if (!volumes) {
    return null;
  }
  return (
    <SectionBox title={t('translation|Volumes')}>
      <SimpleTable
        columns={[
          {
            label: t('translation|Name'),
            getter: data => data.name,
          },
          {
            label: t('translation|Type'),
            getter: data => Object.keys(data)[1],
          },
        ]}
        data={volumes}
        reflectInURL="volumes"
      />
    </SectionBox>
  );
}

function TolerationsSection(props: { tolerations: any[] }) {
  const { tolerations } = props;
  const { t } = useTranslation(['glossary', 'translation']);

  return (
    <SectionBox title={t('Tolerations')}>
      <SimpleTable
        data={tolerations}
        columns={[
          {
            label: t('translation|Key'),
            getter: data => data.key,
          },
          {
            label: t('translation|Value'),
            getter: data => data.value,
          },
          {
            label: t('translation|Operator'),
            getter: data => data.operator,
            gridTemplate: '0.5fr',
          },
          {
            label: t('translation|Effect'),
            getter: data => data.effect,
          },
          {
            label: t('Seconds'),
            getter: data => data.tolerationSeconds,
            gridTemplate: '0.5fr',
          },
        ]}
      />
    </SectionBox>
  );
}

export interface PodDetailsProps {
  showLogsDefault?: boolean;
  name?: string;
  namespace?: string;
  cluster?: string;
}

export default function PodDetails(props: PodDetailsProps) {
  const params = useParams<{ namespace: string; name: string }>();
  const { name = params.name, namespace = params.namespace, cluster } = props;
  const { t } = useTranslation('glossary');
  const dispatchHeadlampEvent = useEventCallback();

  const lastAutoLaunchedPodLogs = React.useRef<string | null>(null);
  const lastAutoLaunchedPodExec = React.useRef<string | null>(null);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const autoLaunchView = queryParams.get('view');
  const autoLaunchContainer = queryParams.get('container') ?? undefined;
  const [podItem, setPodItem] = React.useState<Pod | null>(null);

  const launchLogs = React.useCallback(
    (item: Pod, container?: string) => {
      Activity.launch({
        id: 'logs-' + item.metadata.uid,
        title: t('Logs: {{ itemName }}', { itemName: item.metadata.name }),
        cluster: item.cluster,
        icon: <Icon icon="mdi:file-document-box-outline" width="100%" height="100%" />,
        location: 'full',
        content: (
          <PodLogViewer
            noDialog
            open
            item={item}
            onClose={() => {}}
            initialContainer={container ?? autoLaunchContainer}
          />
        ),
      });
      dispatchHeadlampEvent({
        type: HeadlampEventType.LOGS,
        data: {
          status: EventStatus.OPENED,
        },
      });
    },
    [t, dispatchHeadlampEvent, autoLaunchContainer]
  );

  const launchTerminal = React.useCallback(
    (item: Pod) => {
      const activityId = 'terminal-' + item.metadata.uid;
      Activity.launch({
        id: activityId,
        title: item.metadata.name,
        cluster: item.cluster,
        icon: <Icon icon="mdi:console" width="100%" height="100%" />,
        location: 'full',
        content: (
          <Terminal
            noDialog
            open
            item={item}
            onClose={() => Activity.close(activityId)}
            isAttach={false}
            initialContainer={autoLaunchContainer}
          />
        ),
      });
      dispatchHeadlampEvent({
        type: HeadlampEventType.TERMINAL,
        data: {
          resource: item,
          status: EventStatus.OPENED,
        },
      });
    },
    [dispatchHeadlampEvent, autoLaunchContainer]
  );

  React.useEffect(() => {
    if (autoLaunchView !== 'logs') {
      lastAutoLaunchedPodLogs.current = null;
      return;
    }

    if (
      podItem &&
      autoLaunchView === 'logs' &&
      lastAutoLaunchedPodLogs.current !== `${podItem.metadata.uid}:${autoLaunchContainer ?? ''}`
    ) {
      lastAutoLaunchedPodLogs.current = `${podItem.metadata.uid}:${autoLaunchContainer ?? ''}`;
      launchLogs(podItem);
    }
  }, [podItem, launchLogs, autoLaunchView, autoLaunchContainer]);

  React.useEffect(() => {
    if (autoLaunchView !== 'exec') {
      lastAutoLaunchedPodExec.current = null;
      return;
    }

    if (
      podItem &&
      autoLaunchView === 'exec' &&
      lastAutoLaunchedPodExec.current !== `${podItem.metadata.uid}:${autoLaunchContainer ?? ''}`
    ) {
      lastAutoLaunchedPodExec.current = `${podItem.metadata.uid}:${autoLaunchContainer ?? ''}`;
      launchTerminal(podItem);
    }
  }, [podItem, launchTerminal, autoLaunchView, autoLaunchContainer]);

  function prepareExtraInfo(item: Pod | null) {
    let extraInfo: (NameValueTableRow & { hideLabel?: boolean })[] = [];
    if (item) {
      extraInfo = [
        {
          name: t('State'),
          value: makePodStatusLabel(item, false, t),
        },
        {
          name: t('Node'),
          value: item.spec.nodeName ? (
            <Link
              routeName="node"
              params={{ name: item.spec.nodeName }}
              activeCluster={item.cluster}
            >
              {item.spec.nodeName}
            </Link>
          ) : (
            ''
          ),
        },
        {
          name: t('Service Account'),
          value:
            !!item.spec.serviceAccountName || !!item.spec.serviceAccount ? (
              <Link
                routeName="serviceAccount"
                params={{
                  namespace: item.metadata.namespace,
                  name: item.spec.serviceAccountName || item.spec.serviceAccount,
                }}
                activeCluster={item.cluster}
              >
                {item.spec.serviceAccountName || item.spec.serviceAccount}
              </Link>
            ) : (
              ''
            ),
        },
        // Show Host IP only if Host IPs doesn't exist or is empty
        ...(item.status.hostIPs && item.status.hostIPs.length > 0
          ? []
          : [
              {
                name: t('Host IP'),
                value: item.status.hostIP ?? '',
              },
            ]),
        // Always include Host IPs, but hide if empty
        {
          name: t('Host IPs'),
          value: item.status.hostIPs
            ? item.status.hostIPs.map((ipObj: { ip: string }) => ipObj.ip).join(', ')
            : '',
          hideLabel: !item.status.hostIPs || item.status.hostIPs.length === 0,
        },
        // Show Pod IP only if Pod IPs doesn't exist or is empty
        ...(item.status.podIPs && item.status.podIPs.length > 0
          ? []
          : [
              {
                name: t('Pod IP'),
                value: item.status.podIP ?? '',
              },
            ]),
        // Always include Pod IPs, but hide if empty
        {
          name: t('Pod IPs'),
          value: item.status.podIPs
            ? item.status.podIPs.map((ipObj: { ip: string }) => ipObj.ip).join(', ')
            : '',
          hideLabel: !item.status.podIPs || item.status.podIPs.length === 0,
        },
        {
          name: t('QoS Class'),
          value: item.status.qosClass,
        },
        {
          name: t('Priority'),
          value: item.spec.priority,
        },
        {
          name: t('Priority Class'),
          value: item.spec.priorityClassName ? (
            <Link
              routeName="priorityClass"
              params={{ name: item.spec.priorityClassName }}
              activeCluster={item.cluster}
            >
              {item.spec.priorityClassName}
            </Link>
          ) : (
            ''
          ),
          hide: !item.spec.priorityClassName,
        },
        {
          name: t('Pod Group'),
          value: item.spec.schedulingGroup?.podGroupName ? (
            <Link
              routeName="PodGroup"
              params={{
                namespace: item.metadata.namespace,
                name: item.spec.schedulingGroup.podGroupName,
              }}
              activeCluster={item.cluster}
            >
              {item.spec.schedulingGroup.podGroupName}
            </Link>
          ) : (
            ''
          ),
          hide: !item.spec.schedulingGroup?.podGroupName,
        },
        {
          name: t('Runtime Class'),
          value: item.spec.runtimeClassName,
          hide: !item.spec.runtimeClassName,
        },
        {
          name: t('Nominated Node'),
          value: item.status.nominatedNodeName,
          hide: !item.status.nominatedNodeName,
        },
        {
          name: t('Start Time'),
          value: item.status.startTime ? localeDate(item.status.startTime) : '',
          hide: !item.status.startTime,
        },
        {
          name: t('Termination Grace Period'),
          value:
            item.spec.terminationGracePeriodSeconds !== undefined
              ? t('translation|{{ seconds }}s', {
                  seconds: item.spec.terminationGracePeriodSeconds,
                })
              : '',
          hide: item.spec.terminationGracePeriodSeconds === undefined,
        },
        {
          name: t('translation|Reason'),
          value: item.status.reason,
          hide: !item.status.reason,
        },
        {
          name: t('translation|Message'),
          value: item.status.message,
          hide: !item.status.message,
        },
        {
          name: t('Node Selectors'),
          value: <MetadataDictGrid dict={item.spec.nodeSelector ?? {}} />,
          hide: _.isEmpty(item.spec.nodeSelector),
        },
      ];
    }
    return extraInfo;
  }

  return (
    <DetailsGrid
      resourceType={Pod}
      name={name}
      namespace={namespace}
      cluster={cluster}
      withEvents
      onResourceUpdate={item => {
        setPodItem(item);
      }}
      actions={item =>
        item && [
          {
            id: DefaultHeaderAction.POD_LOGS,
            action: (
              <AuthVisible item={item} authVerb="get" subresource="log">
                <ActionButton
                  description={t('Show Logs')}
                  icon="mdi:file-document-box-outline"
                  onClick={() => launchLogs(item)}
                />
              </AuthVisible>
            ),
          },
          {
            id: DefaultHeaderAction.POD_TERMINAL,
            action: (
              <AuthVisible item={item} authVerb="create" subresource="exec">
                <ActionButton
                  description={t('Terminal / Exec')}
                  icon="mdi:console"
                  onClick={() => launchTerminal(item)}
                />
              </AuthVisible>
            ),
          },
          {
            id: DefaultHeaderAction.POD_DEBUG,
            action: <PodDebugAction item={item} />,
          },
          {
            id: DefaultHeaderAction.POD_ATTACH,
            action: (
              <AuthVisible item={item} authVerb="get" subresource="attach">
                <ActionButton
                  description={t('Attach')}
                  icon="mdi:connection"
                  onClick={() => {
                    dispatchHeadlampEvent({
                      type: HeadlampEventType.POD_ATTACH,
                      data: {
                        resource: item,
                        status: EventStatus.OPENED,
                      },
                    });
                    Activity.launch({
                      id: 'attach-' + item.metadata.uid,
                      title: item.metadata.name,
                      cluster: item.cluster,
                      icon: <Icon icon="mdi:console" width="100%" height="100%" />,
                      location: 'full',
                      content: <Terminal noDialog open item={item} onClose={() => {}} isAttach />,
                    });
                  }}
                />
              </AuthVisible>
            ),
          },
        ]
      }
      extraInfo={item => prepareExtraInfo(item)}
      extraSections={(item, context) =>
        item && [
          {
            id: 'headlamp.pod-diagnostics',
            section: (
              <PodDiagnosticsSection
                pod={item}
                events={context.events}
                onViewLogs={container => launchLogs(item, container)}
              />
            ),
          },
          {
            id: 'headlamp.pod-tolerations',
            section: <TolerationsSection tolerations={item?.spec?.tolerations || []} />,
          },
          {
            id: 'headlamp.pod-conditions',
            section: <ConditionsSection resource={item?.jsonData} />,
          },
          {
            id: 'headlamp.pod-containers',
            section: <ContainersSection resource={item} />,
          },
          {
            id: 'headlamp.pod-volumes',
            section: <VolumeSection resource={item?.jsonData} />,
          },
        ]
      }
    />
  );
}
