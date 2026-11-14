import assert from 'node:assert/strict';
import test from 'node:test';
import { updateValuesSchema } from './sync-plugin-settings-schemas.mjs';

test('adds deterministic conditional schemas for known plugins', () => {
  const chartSchema = {
    properties: {
      pluginsManager: {
        properties: {
          config: {
            properties: {
              plugins: {
                items: { allOf: [] },
              },
            },
          },
        },
      },
    },
  };
  const packages = [
    {
      name: '@example/plugin',
      headlamp: {
        settingsSchema: {
          type: 'object',
          properties: { endpoint: { type: 'string' } },
        },
      },
    },
  ];

  const result = updateValuesSchema(chartSchema, packages);

  assert.deepEqual(result.definitions.knownPluginSettings.plugin_8158663eeb5d, {
    type: 'object',
    properties: { endpoint: { type: 'string' } },
  });
  assert.equal(
    result.properties.pluginsManager.properties.config.properties.plugins.items.allOf[0].then
      .properties.settings.$ref,
    '#/definitions/knownPluginSettings/plugin_8158663eeb5d'
  );
});
