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

import { ThemeProvider } from '@mui/material/styles';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createMuiTheme } from '../../../lib/themes';
import { PluginInfo, setPluginSettings } from '../../../plugin/pluginsSlice';
import { HeadlampEventType } from '../../../redux/headlampEventSlice';
import store from '../../../redux/stores/store';
import { recordHeadlampEvents, TestContext } from '../../../test';
import PluginSettingsDetails, { PluginSettingsDetailsPure } from './PluginSettingsDetails';

const theme = createMuiTheme({ name: 'Light', base: 'light' });

const plugin: PluginInfo = {
  name: 'my-plugin',
  description: 'A plugin',
  isEnabled: true,
  isCompatible: true,
  isLoaded: true,
  type: 'user',
  homepage: '',
};

describe('PluginSettingsDetails metadata', () => {
  it.each(['@headlamp-k8s/my-plugin', 'my-plugin'])(
    'shows publisher metadata only for scoped plugin names: %s',
    name => {
      render(
        <TestContext>
          <ThemeProvider theme={theme}>
            <PluginSettingsDetailsPure plugin={{ ...plugin, name }} onDelete={() => {}} />
          </ThemeProvider>
        </TestContext>
      );

      if (name.startsWith('@')) {
        expect(screen.getByText('Published by headlamp-k8s')).toBeVisible();
      } else {
        expect(screen.queryByText(/Published by/)).not.toBeInTheDocument();
      }
    }
  );

  it('generates and validates a form from the package settings schema', async () => {
    const onSave = vi.fn();
    const schemaPlugin: PluginInfo = {
      ...plugin,
      headlamp: {
        settingsSchema: {
          type: 'object',
          properties: {
            endpoint: {
              type: 'string',
              title: 'Endpoint',
              format: 'uri',
              errorMessage: { format: 'Enter a valid endpoint' },
            },
            enabled: { type: 'boolean', title: 'Enabled', default: true },
          },
          required: ['endpoint'],
        },
      },
    };

    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{}}
            plugin={schemaPlugin}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeChecked();
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox', { name: 'Endpoint' }), 'not-a-url');
    expect(await screen.findByText('Enter a valid endpoint')).toBeVisible();
    expect(save).toBeDisabled();

    await userEvent.clear(screen.getByRole('textbox', { name: 'Endpoint' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Endpoint' }), 'https://example.com');
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    expect(onSave).toHaveBeenCalledWith({
      endpoint: 'https://example.com',
    });
  });

  it('keeps using a registered settings component when a schema is also present', () => {
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  properties: { generated: { type: 'string' } },
                },
              },
              settingsComponent: <div>Legacy settings</div>,
            }}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    expect(screen.getByText('Legacy settings')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'generated' })).not.toBeInTheDocument();
  });
});

describe('PluginSettingsDetails events', () => {
  it('dispatches PLUGIN_DETAILS_VIEW with the displayed plugin', async () => {
    store.dispatch(setPluginSettings([plugin]));
    const events = recordHeadlampEvents();

    render(
      <TestContext routerMap={{ name: plugin.name }}>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetails />
        </ThemeProvider>
      </TestContext>
    );

    await waitFor(() => {
      expect(events.filter(e => e.type === HeadlampEventType.PLUGIN_DETAILS_VIEW)).toEqual([
        { type: HeadlampEventType.PLUGIN_DETAILS_VIEW, data: { plugin } },
      ]);
    });
  });
});
