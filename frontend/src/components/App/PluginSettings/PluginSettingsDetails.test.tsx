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
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { createMuiTheme } from '../../../lib/themes';
import { PluginInfo, setPluginSettings } from '../../../plugin/pluginsSlice';
import { HeadlampEventType } from '../../../redux/headlampEventSlice';
import store from '../../../redux/stores/store';
import { setAdminSettings } from '../../../settings/adminSettingsSlice';
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
          additionalProperties: false,
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
            config={{ legacySetting: 'remove me' }}
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
      enabled: true,
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

  it('does not gate custom settings saves on generated-form validity', async () => {
    const onSave = vi.fn();
    const renderSettings = (pluginInfo: PluginInfo) => (
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{}}
            plugin={pluginInfo}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );
    const { rerender } = render(
      renderSettings({
        ...plugin,
        headlamp: {
          settingsSchema: {
            type: 'object',
            required: ['generated'],
            properties: { generated: { type: 'string' } },
          },
        },
      })
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled());

    rerender(
      renderSettings({
        ...plugin,
        displaySettingsComponentWithSaveButton: true,
        settingsComponent: ({ data, onDataChange }: any) => (
          <button onClick={() => onDataChange({ ...data, custom: 'updated' })}>
            Update custom setting
          </button>
        ),
      })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Update custom setting' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ custom: 'updated' });
  });

  it('associates boolean validation errors with the checkbox', () => {
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  required: ['enabled'],
                  properties: { enabled: { type: 'boolean', title: 'Enabled' } },
                },
              },
            }}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    const enabled = screen.getByRole('checkbox', { name: 'Enabled' });
    const helperText = document.getElementById(enabled.getAttribute('aria-describedby')!);

    expect(helperText).toHaveTextContent("must have required property 'enabled'");
  });

  it('validates admin-controlled fields with the effective value and removes stale overrides', async () => {
    store.dispatch(
      setAdminSettings({
        defaults: { plugins: { 'my-plugin': { endpoint: 'https://admin.example.com' } } },
        display: { 'plugins.my-plugin.endpoint': 'disabled' },
        clusterDefinedSettings: [],
        clusterDefined: {},
      })
    );
    const onSave = vi.fn();

    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ endpoint: 'invalid stale value', label: 'old' }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['endpoint'],
                  properties: {
                    endpoint: { type: 'string', format: 'uri', title: 'Endpoint' },
                    label: { type: 'string', title: 'Label' },
                  },
                },
              },
            }}
            adminSettings={store.getState().adminSettings}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    expect(screen.getByRole('textbox', { name: 'Endpoint' })).toHaveValue(
      'https://admin.example.com'
    );
    await userEvent.clear(screen.getByRole('textbox', { name: 'Label' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Label' }), 'new');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith({ label: 'new' });
    store.dispatch(
      setAdminSettings({
        defaults: {},
        display: {},
        clusterDefinedSettings: [],
        clusterDefined: {},
      })
    );
  });

  it('unsets an optional constrained string and keeps cleared numeric defaults editable', async () => {
    const onSave = vi.fn();
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ endpoint: 'https://example.com', retries: 5 }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    endpoint: { type: 'string', format: 'uri', title: 'Endpoint' },
                    retries: { type: 'integer', default: 3, title: 'Retries' },
                    enabled: {
                      type: 'boolean',
                      title: 'Enabled',
                      description: 'Enable this integration',
                    },
                  },
                },
              },
            }}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    expect(screen.getByText('Enable this integration')).toBeVisible();
    const enabled = screen.getByRole('checkbox', { name: 'Enabled' });
    expect(document.getElementById(enabled.getAttribute('aria-describedby')!)).toHaveTextContent(
      'Enable this integration'
    );
    await userEvent.clear(screen.getByRole('textbox', { name: 'Endpoint' }));
    const retries = screen.getByRole('spinbutton', { name: 'Retries' });
    await userEvent.clear(retries);
    expect(retries).toHaveValue(null);
    await userEvent.type(retries, '7');
    expect(retries).toHaveValue(7);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith({ retries: 7 });
  });

  it('validates an explicit null administrator default instead of using the schema default', () => {
    const adminSettings = {
      defaults: { plugins: { 'my-plugin': { retries: null } } },
      display: {},
      clusterDefinedSettings: [],
      clusterDefined: {},
      sources: {},
      clusterSettings: {},
    };
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  properties: { retries: { type: 'integer', default: 3 } },
                },
              },
            }}
            adminSettings={adminSettings}
            onSave={vi.fn()}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    expect(screen.getByRole('spinbutton', { name: 'retries' })).toHaveValue(null);
    expect(screen.getByRole('spinbutton', { name: 'retries' })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('uses the application locale for the generated enum default', async () => {
    const i18n = createInstance();
    await i18n.init({
      lng: 'de',
      fallbackLng: 'en',
      nsSeparator: '|',
      keySeparator: false,
      resources: { de: { translation: { Default: 'Standard' } } },
    });
    render(
      <I18nextProvider i18n={i18n}>
        <TestContext>
          <ThemeProvider theme={theme}>
            <PluginSettingsDetailsPure
              config={{ mode: 'auto' }}
              plugin={{
                ...plugin,
                headlamp: {
                  settingsSchema: {
                    type: 'object',
                    properties: { mode: { title: 'Mode', enum: ['auto', 'manual'] } },
                  },
                },
              }}
              onSave={vi.fn()}
              onDelete={() => {}}
            />
          </ThemeProvider>
        </TestContext>
      </I18nextProvider>
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Mode' }));
    expect(screen.getByRole('option', { name: 'Standard' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'auto' })).toBeVisible();
  });

  it('allows clearing an optional enum to return to administrator or plugin defaults', async () => {
    const onSave = vi.fn();
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ mode: 'auto' }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: { mode: { type: 'string', enum: ['auto', 'manual'] } },
                },
              },
            }}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'mode' }));
    await userEvent.click(screen.getByRole('option', { name: 'Default' }));
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    expect(onSave).toHaveBeenCalledWith({});
  });

  it.each([
    { name: 'string', options: ['auto', 'manual'], currentValue: 'auto' },
    { name: 'numeric', options: [1, 2], currentValue: 1 },
  ])('allows clearing an untyped optional $name enum', async ({ options, currentValue }) => {
    const onSave = vi.fn();
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ mode: currentValue }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: { mode: { enum: options } },
                },
              },
            }}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'mode' }));
    await userEvent.click(screen.getByRole('option', { name: 'Default' }));
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    expect(onSave).toHaveBeenCalledWith({});
  });

  it('unsets an optional URI when other required fields are missing', async () => {
    const onSave = vi.fn();
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ endpoint: 'https://example.com' }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', title: 'Name' },
                    endpoint: { type: 'string', format: 'uri', title: 'Endpoint' },
                  },
                },
              },
            }}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    await userEvent.clear(screen.getByRole('textbox', { name: 'Endpoint' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'example');
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    expect(onSave).toHaveBeenCalledWith({ name: 'example' });
  });

  it('unsets an optional string reference using the root schema context', async () => {
    const onSave = vi.fn();
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ endpoint: 'https://example.com' }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  additionalProperties: false,
                  definitions: {
                    endpoint: { type: 'string', format: 'uri' },
                  },
                  properties: {
                    endpoint: { $ref: '#/definitions/endpoint' },
                  },
                },
              },
            }}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    await userEvent.clear(screen.getByRole('textbox', { name: 'endpoint' }));
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    expect(onSave).toHaveBeenCalledWith({});
  });

  it('unsets an optional URI property containing a slash', async () => {
    const onSave = vi.fn();
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ 'api/endpoint': 'https://example.com' }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    'api/endpoint': { type: 'string', format: 'uri', title: 'Endpoint' },
                  },
                },
              },
            }}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    await userEvent.clear(screen.getByRole('textbox', { name: 'Endpoint' }));
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    expect(onSave).toHaveBeenCalledWith({});
  });

  it('unsets an optional empty string rejected by a root constraint', async () => {
    const onSave = vi.fn();
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ endpoint: 'https://example.com' }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: { endpoint: { type: 'string', title: 'Endpoint' } },
                  not: {
                    required: ['endpoint'],
                    properties: { endpoint: { const: '' } },
                  },
                },
              },
            }}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    await userEvent.clear(screen.getByRole('textbox', { name: 'Endpoint' }));
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);

    expect(onSave).toHaveBeenCalledWith({});
  });

  it('shows the managed value when a cleared field becomes administrator-disabled', async () => {
    const onSave = vi.fn();
    const resetAdminSettings = () =>
      store.dispatch(
        setAdminSettings({
          defaults: {},
          display: {},
          clusterDefinedSettings: [],
          clusterDefined: {},
        })
      );
    resetAdminSettings();

    const renderSettings = () => (
      <TestContext store={store}>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ endpoint: 'https://user.example.com' }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  properties: {
                    endpoint: { type: 'string', default: 'https://default.example.com' },
                  },
                },
              },
            }}
            adminSettings={store.getState().adminSettings}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );
    const { rerender } = render(renderSettings());

    const endpoint = screen.getByRole('textbox', { name: 'endpoint' });
    await userEvent.clear(endpoint);
    expect(endpoint).toHaveValue('');

    store.dispatch(
      setAdminSettings({
        defaults: { plugins: { 'my-plugin': { endpoint: 'https://admin.example.com' } } },
        display: { 'plugins.my-plugin.endpoint': 'disabled' },
        clusterDefinedSettings: [],
        clusterDefined: {},
      })
    );
    rerender(renderSettings());

    await waitFor(() => {
      expect(endpoint).toBeDisabled();
      expect(endpoint).toHaveValue('https://admin.example.com');
    });
    resetAdminSettings();
  });

  it('recompiles a refreshed schema that reuses its id', () => {
    const renderPlugin = (title: string): PluginInfo => ({
      ...plugin,
      headlamp: {
        settingsSchema: {
          $id: 'https://example.com/settings.schema.json',
          type: 'object',
          required: ['endpoint'],
          properties: { endpoint: { type: 'string', title } },
        },
      },
    });
    const { rerender } = render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            plugin={renderPlugin('Old endpoint')}
            onSave={vi.fn()}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    rerender(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            plugin={renderPlugin('New endpoint')}
            onSave={vi.fn()}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    expect(screen.getByRole('textbox', { name: 'New endpoint' })).toBeVisible();
    expect(screen.queryByText(/schema with key or id already exists/i)).not.toBeInTheDocument();
  });

  it('validates cleared schema defaults using the same value as the save payload', async () => {
    const onSave = vi.fn();
    render(
      <TestContext>
        <ThemeProvider theme={theme}>
          <PluginSettingsDetailsPure
            config={{ enabled: true, retries: 6 }}
            plugin={{
              ...plugin,
              headlamp: {
                settingsSchema: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean', default: false },
                    retries: { type: 'integer', default: 3 },
                  },
                  if: { properties: { enabled: { const: true } } },
                  then: {
                    properties: { retries: { minimum: 5 } },
                    required: ['retries'],
                  },
                },
              },
            }}
            onSave={onSave}
            onDelete={() => {}}
          />
        </ThemeProvider>
      </TestContext>
    );

    const retries = screen.getByRole('spinbutton', { name: 'retries' });
    await userEvent.clear(retries);

    expect(retries).toHaveValue(null);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.type(retries, '7');
    expect(retries).toHaveValue(7);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ enabled: true, retries: 7 });
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
