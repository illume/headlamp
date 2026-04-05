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
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { getCluster } from '../../../lib/cluster';
import { createRouteURL } from '../../../lib/router/createRouteURL';
import ActionButton from '../../common/ActionButton';

export default function SettingsButton(props: { onClickExtra?: () => void; showLabel?: boolean }) {
  const { onClickExtra, showLabel } = props;
  const { t } = useTranslation(['glossary', 'translation']);
  const history = useHistory();
  const clusterName = getCluster();

  if (clusterName === null) {
    return null;
  }

  const handleClick = () => {
    history.push(createRouteURL('settingsCluster', { cluster: clusterName }));
    onClickExtra && onClickExtra();
  };

  if (showLabel) {
    return (
      <Box
        sx={{ display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}
        role="button"
        aria-label={t('translation|Settings')}
        onClick={handleClick}
      >
        <ListItemIcon>
          <Icon icon="mdi:cog" />
        </ListItemIcon>
        <ListItemText>{t('translation|Settings')}</ListItemText>
      </Box>
    );
  }

  return (
    <ActionButton
      icon="mdi:cog"
      description={t('translation|Settings')}
      iconButtonProps={{
        color: 'inherit',
      }}
      onClick={handleClick}
    />
  );
}
