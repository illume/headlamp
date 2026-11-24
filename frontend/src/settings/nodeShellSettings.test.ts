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

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NODE_SHELL_LINUX_IMAGE,
  DEFAULT_NODE_SHELL_NAMESPACE,
} from '../helpers/clusterSettings';
import { initialAdminSettingsState } from './adminSettingsSlice';
import { resolveNodeShellSettings } from './nodeShellSettings';
import { applyAdminSettings, parseAdminSettings } from './parseAdminSettings';

const config = { defaultNodeShellImage: '', defaultNodeShellNamespace: '' };
const user = {
  nodeShellTerminal: { linuxImage: 'user-image', namespace: 'user-shells', isEnabled: true },
};
const defaults = {
  clusters: {
    '*': {
      nodeShellTerminal: {
        linuxImage: { $value: 'admin-image', $display: 'disabled' },
        namespace: { $value: 'admin-shells', $display: 'hidden' },
        isEnabled: { $value: false, $display: 'disabled' },
      },
    },
  },
};

describe('node shell runtime settings', () => {
  it('preserves local settings without admin policy', () => {
    expect(resolveNodeShellSettings('prod', user, initialAdminSettingsState, config)).toEqual(
      user.nodeShellTerminal
    );
  });

  it('uses backend defaults and then built-in defaults for empty local values', () => {
    const empty = { nodeShellTerminal: { linuxImage: '', namespace: '' } };
    expect(resolveNodeShellSettings('prod', empty, initialAdminSettingsState, config)).toEqual({
      linuxImage: DEFAULT_NODE_SHELL_LINUX_IMAGE,
      namespace: DEFAULT_NODE_SHELL_NAMESPACE,
      isEnabled: true,
    });
    expect(
      resolveNodeShellSettings('prod', empty, initialAdminSettingsState, {
        defaultNodeShellImage: 'backend-image',
        defaultNodeShellNamespace: 'backend-shells',
      })
    ).toEqual({ linuxImage: 'backend-image', namespace: 'backend-shells', isEnabled: true });
  });

  it('ignores saved overrides for hidden and disabled fields', () => {
    const admin = applyAdminSettings(parseAdminSettings({ defaults }));
    expect(resolveNodeShellSettings('prod', user, admin, config)).toEqual({
      linuxImage: 'admin-image',
      namespace: 'admin-shells',
      isEnabled: false,
    });
  });

  it('uses cluster values for locked fields only in allowed clusters', () => {
    const admin = applyAdminSettings(
      parseAdminSettings({ defaults, clusterDefinedSettings: ['prod'] }),
      {
        clusterSettings: {
          prod: {
            nodeShellTerminal: {
              linuxImage: 'cluster-image',
              namespace: 'cluster-shells',
              isEnabled: true,
            },
          },
        },
      }
    );
    expect(resolveNodeShellSettings('prod', user, admin, config)).toEqual({
      linuxImage: 'cluster-image',
      namespace: 'cluster-shells',
      isEnabled: true,
    });
    expect(resolveNodeShellSettings('dev', user, admin, config).namespace).toBe('admin-shells');
  });

  it('prefers editable user values over cluster and admin defaults', () => {
    const admin = applyAdminSettings(
      parseAdminSettings({
        defaults: { clusters: { '*': { nodeShellTerminal: { namespace: 'admin-shells' } } } },
        clusterDefinedSettings: ['prod'],
      }),
      { clusterSettings: { prod: { nodeShellTerminal: { namespace: 'cluster-shells' } } } }
    );
    expect(resolveNodeShellSettings('prod', user, admin, config).namespace).toBe('user-shells');
    expect(resolveNodeShellSettings('prod', {}, admin, config).namespace).toBe('cluster-shells');
    expect(resolveNodeShellSettings('dev', {}, admin, config).namespace).toBe('admin-shells');
  });
});
