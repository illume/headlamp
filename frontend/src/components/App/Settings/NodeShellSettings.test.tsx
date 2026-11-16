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

import { ThemeProvider } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { ClusterSettings } from '../../../helpers/clusterSettings';
import { createMuiTheme } from '../../../lib/themes';
import type { AdminSettingsState, DisplayMode } from '../../../settings/adminSettingsSlice';
import adminSettingsReducer, {
  initialAdminSettingsState,
  setAdminSettings,
} from '../../../settings/adminSettingsSlice';
import { lightTheme } from '../defaultAppThemes';
import NodeShellSettings from './NodeShellSettings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key.split('|')[1] || key,
  }),
}));

const CLUSTER = 'my-cluster';
const IMAGE_PATH = 'clusters.*.nodeShellTerminal.linuxImage';
const ENABLED_PATH = 'clusters.*.nodeShellTerminal.isEnabled';
const NAMESPACE_PATH = 'clusters.*.nodeShellTerminal.namespace';

const adminDefaults = {
  clusters: {
    '*': {
      nodeShellTerminal: {
        linuxImage: 'admin-image:1',
        isEnabled: false,
        namespace: 'admin-shells',
      },
    },
  },
};

function renderSettings(
  adminSettings: Partial<AdminSettingsState>,
  clusterSettings: ClusterSettings = {}
) {
  const store = configureStore({
    reducer: {
      config: (state = { settings: {} }) => state,
      adminSettings: adminSettingsReducer,
    },
    preloadedState: {
      config: { settings: {} },
      adminSettings: { ...initialAdminSettingsState, ...adminSettings },
    },
  });

  render(
    <Provider store={store}>
      <ThemeProvider theme={createMuiTheme(lightTheme)}>
        <NodeShellSettings
          cluster={CLUSTER}
          clusterSettings={clusterSettings}
          setClusterSettings={vi.fn()}
        />
      </ThemeProvider>
    </Provider>
  );
  return store;
}

const linuxImageInput = () => screen.getByLabelText('Linux image');
const nodeShellSwitch = () => screen.getByRole('checkbox');

describe('NodeShellSettings admin-managed settings', () => {
  it('uses the user value when no admin settings are configured', () => {
    renderSettings({}, { nodeShellTerminal: { linuxImage: 'user-image:2', isEnabled: true } });

    expect(linuxImageInput()).toHaveValue('user-image:2');
    expect(linuxImageInput()).toBeEnabled();
    expect(nodeShellSwitch()).toBeChecked();
  });

  it('prefers the user value over the admin default in normal mode', () => {
    renderSettings(
      { defaults: adminDefaults },
      { nodeShellTerminal: { linuxImage: 'user-image:2', isEnabled: true } }
    );

    expect(linuxImageInput()).toHaveValue('user-image:2');
    expect(linuxImageInput()).toBeEnabled();
    expect(nodeShellSwitch()).toBeChecked();
  });

  it('falls back to the admin default when the user has no value', () => {
    renderSettings({ defaults: adminDefaults });

    expect(linuxImageInput()).toHaveValue('admin-image:1');
    expect(nodeShellSwitch()).not.toBeChecked();
  });

  it('forces the admin value and disables the field when the setting is disabled', () => {
    const display: Record<string, DisplayMode> = {
      [IMAGE_PATH]: 'disabled',
      [ENABLED_PATH]: 'disabled',
    };

    renderSettings(
      { defaults: adminDefaults, display },
      { nodeShellTerminal: { linuxImage: 'user-image:2', isEnabled: true } }
    );

    expect(linuxImageInput()).toHaveValue('admin-image:1');
    expect(linuxImageInput()).toBeDisabled();
    expect(nodeShellSwitch()).not.toBeChecked();
    expect(nodeShellSwitch()).toBeDisabled();
  });

  it('does not render settings hidden by the admin', () => {
    const display: Record<string, DisplayMode> = {
      [IMAGE_PATH]: 'hidden',
      [ENABLED_PATH]: 'hidden',
    };

    renderSettings(
      { defaults: adminDefaults, display },
      { nodeShellTerminal: { linuxImage: 'user-image:2', isEnabled: true } }
    );

    expect(screen.queryByLabelText('Linux image')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Namespace')).toBeInTheDocument();
  });

  it('prefers a cluster-defined value over the admin default', () => {
    renderSettings({
      defaults: adminDefaults,
      clusterDefinedSettings: [CLUSTER],
      clusterSettings: { [CLUSTER]: { nodeShellTerminal: { linuxImage: 'cluster-image:3' } } },
    });

    expect(linuxImageInput()).toHaveValue('cluster-image:3');
  });

  it('uses the namespace default when a saved namespace is empty', () => {
    renderSettings({ defaults: adminDefaults }, { nodeShellTerminal: { namespace: '' } });

    expect(screen.getByLabelText('Namespace')).toHaveValue('admin-shells');
  });

  it('allows a user namespace override in normal mode', () => {
    renderSettings(
      { defaults: adminDefaults },
      { nodeShellTerminal: { namespace: 'user-shells' } }
    );

    expect(screen.getByLabelText('Namespace')).toHaveValue('user-shells');
    expect(screen.getByLabelText('Namespace')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Namespace'), { target: { value: 'new-shells' } });
    expect(screen.getByLabelText('Namespace')).toHaveValue('new-shells');
  });

  it('displays the managed namespace instead of a saved override when disabled', () => {
    renderSettings(
      {
        defaults: adminDefaults,
        display: { [NAMESPACE_PATH]: 'disabled' },
        clusterDefinedSettings: [CLUSTER],
        clusterSettings: { [CLUSTER]: { nodeShellTerminal: { namespace: 'cluster-shells' } } },
      },
      { nodeShellTerminal: { namespace: 'user-shells' } }
    );

    expect(screen.getByLabelText('Namespace')).toHaveValue('cluster-shells');
    expect(screen.getByLabelText('Namespace')).toBeDisabled();
  });

  it('omits a hidden namespace control', () => {
    renderSettings({ defaults: adminDefaults, display: { [NAMESPACE_PATH]: 'hidden' } });

    expect(screen.queryByLabelText('Namespace')).not.toBeInTheDocument();
  });

  it('replaces an invalid local draft when namespace policy becomes disabled or changes', () => {
    const store = renderSettings({ defaults: adminDefaults });
    const input = screen.getByLabelText('Namespace');
    fireEvent.change(input, { target: { value: 'INVALID' } });
    expect(input).toBeInvalid();

    act(() =>
      store.dispatch(
        setAdminSettings({
          ...initialAdminSettingsState,
          defaults: adminDefaults,
          display: { [NAMESPACE_PATH]: 'disabled' },
        })
      )
    );
    expect(input).toHaveValue('admin-shells');
    expect(input).toBeDisabled();
    expect(input).not.toBeInvalid();

    act(() =>
      store.dispatch(
        setAdminSettings({
          ...initialAdminSettingsState,
          defaults: {
            clusters: { '*': { nodeShellTerminal: { namespace: 'updated-shells' } } },
          },
          display: { [NAMESPACE_PATH]: 'disabled' },
        })
      )
    );
    expect(input).toHaveValue('updated-shells');
  });
});
