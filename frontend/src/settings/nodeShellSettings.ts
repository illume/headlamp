/*
 * Copyright 2026 The Kubernetes Authors
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

import {
  ClusterSettings,
  DEFAULT_NODE_SHELL_LINUX_IMAGE,
  DEFAULT_NODE_SHELL_NAMESPACE,
} from '../helpers/clusterSettings';
import type { ConfigState } from '../redux/configSlice';
import type { AdminSettingsState } from './adminSettingsSlice';
import { resolveSettingValue } from './settingsResolution';

export function resolveNodeShellSettings(
  cluster: string,
  settings: ClusterSettings,
  adminSettings: AdminSettingsState | null,
  config: Pick<ConfigState, 'defaultNodeShellImage' | 'defaultNodeShellNamespace'>
) {
  const user = settings.nodeShellTerminal;
  const defaultImage = config.defaultNodeShellImage || DEFAULT_NODE_SHELL_LINUX_IMAGE;
  const defaultNamespace = config.defaultNodeShellNamespace || DEFAULT_NODE_SHELL_NAMESPACE;

  return {
    linuxImage:
      resolveSettingValue(
        'clusters.*.nodeShellTerminal.linuxImage',
        user?.linuxImage || undefined,
        defaultImage,
        adminSettings,
        cluster
      ).value || defaultImage,
    namespace:
      resolveSettingValue(
        'clusters.*.nodeShellTerminal.namespace',
        user?.namespace || undefined,
        defaultNamespace,
        adminSettings,
        cluster
      ).value || defaultNamespace,
    isEnabled: resolveSettingValue(
      'clusters.*.nodeShellTerminal.isEnabled',
      user?.isEnabled,
      true,
      adminSettings,
      cluster
    ).value,
  };
}
