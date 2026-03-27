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
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { styled, useTheme } from '@mui/system';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import semver from 'semver';
import { headlampApi } from '../../lib/api/headlampApi';
import { getVersion, useCluster } from '../../lib/k8s';
import { useTypedSelector } from '../../redux/hooks';
import { NameValueTable } from '../common/SimpleTable';

const versionSnackbarHideTimeout = 5000; // ms
const versionFetchInterval = 60000; // ms

const VersionIcon = styled(Icon)({
  marginTop: '5px',
  marginRight: '5px',
  marginLeft: '5px',
});

const versionApi = headlampApi.injectEndpoints({
  endpoints: build => ({
    getClusterVersion: build.query<any, { cluster: string }>({
      queryFn: async ({ cluster }) => {
        try {
          const results = await getVersion(cluster);
          return { data: results };
        } catch (error: any) {
          console.error('Getting the cluster version:', error);
          return { data: null };
        }
      },
    }),
  }),
});

export default function VersionButton() {
  const isSidebarOpen = useTypedSelector(state => state.sidebar.isSidebarOpen);
  const { enqueueSnackbar } = useSnackbar();
  const cluster = useCluster();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation('glossary');

  function getVersionRows() {
    if (!clusterVersion) {
      return [];
    }

    return [
      {
        name: t('Git Version'),
        value: clusterVersion?.gitVersion,
      },
      {
        name: t('Git Commit'),
        value: clusterVersion?.gitCommit,
      },
      {
        name: t('Git Tree State'),
        value: clusterVersion?.gitTreeState,
      },
      {
        name: t('Go Version'),
        value: clusterVersion?.goVersion,
      },
      {
        name: t('Platform'),
        value: clusterVersion?.platform,
      },
    ];
  }

  const { data: clusterVersion } = versionApi.useGetClusterVersionQuery(
    { cluster: cluster ?? '' },
    { pollingInterval: versionFetchInterval }
  );

  const prevVersionRef = React.useRef<string | undefined>();
  React.useEffect(() => {
    if (clusterVersion && clusterVersion.gitVersion) {
      if (prevVersionRef.current && prevVersionRef.current !== clusterVersion.gitVersion) {
        const versionChange = semver.compare(clusterVersion.gitVersion, prevVersionRef.current);
        let msg = '';
        if (versionChange > 0) {
          msg = t('translation|Cluster version upgraded to {{ gitVersion }}', {
            gitVersion: clusterVersion.gitVersion,
          });
        } else if (versionChange < 0) {
          msg = t('translation|Cluster version downgraded to {{ gitVersion }}', {
            gitVersion: clusterVersion.gitVersion,
          });
        }
        if (msg) {
          enqueueSnackbar(msg, {
            key: 'version',
            preventDuplicate: true,
            autoHideDuration: versionSnackbarHideTimeout,
            variant: 'info',
          });
        }
      }
      prevVersionRef.current = clusterVersion.gitVersion;
    }
  }, [clusterVersion]);

  function handleClose() {
    setOpen(false);
  }

  return !clusterVersion ? null : (
    <Box
      mx="auto"
      pt=".2em"
      sx={{
        textAlign: 'center',
        '& .MuiButton-label': {
          color: 'sidebarLink.main',
        },
      }}
    >
      <Button
        onClick={() => setOpen(true)}
        size="small"
        sx={theme => ({ textTransform: 'none', color: theme.palette.sidebar.color })}
      >
        <Box display={isSidebarOpen ? 'flex' : 'block'} alignItems="center">
          <Box>
            <VersionIcon color={theme.palette.sidebar.color} icon="mdi:kubernetes" />
          </Box>
          <Box>{clusterVersion.gitVersion}</Box>
        </Box>
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{t('Kubernetes Version')}</DialogTitle>
        <DialogContent>
          <NameValueTable rows={getVersionRows()} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary" variant="contained">
            {t('translation|Close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
