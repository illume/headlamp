import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSettingsSchema,
  updateValuesSchema,
} from './sync-plugin-settings-schemas.mjs';

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
      pluginManagerName: 'example-plugin',
      headlamp: {
        settingsSchema: {
          type: 'object',
          required: ['endpoint'],
          properties: { endpoint: { type: 'string' } },
        },
      },
    },
  ];

  const result = updateValuesSchema(chartSchema, packages);

  const knownSchema = result.definitions.knownPluginSettings.plugin_93457ce1c3d1;
  assert.equal(knownSchema.required, undefined);
  assert.deepEqual(knownSchema.properties.endpoint.anyOf[0], { type: 'string' });
  assert.deepEqual(knownSchema.properties.endpoint.anyOf[1].properties.$value, {
    type: 'string',
  });
  assert.equal(
    result.properties.pluginsManager.properties.config.properties.plugins.items.allOf[0].then
      .properties.settings.$ref,
    '#/definitions/knownPluginSettings/plugin_93457ce1c3d1'
  );
  assert.equal(
    result.properties.pluginsManager.properties.config.properties.plugins.items.allOf[0].if
      .properties.name.const,
    'example-plugin'
  );
  assert.deepEqual(
    result.properties.pluginsManager.properties.config.properties.plugins.items.allOf[0].then
      .required,
    ['settingsName']
  );
  assert.equal(
    result.properties.pluginsManager.properties.config.properties.plugins.items.allOf[0].then
      .properties.settingsName.const,
    '@example/plugin'
  );
});

test('rejects references that would resolve outside an imported schema', () => {
  assert.throws(
    () =>
      assertSettingsSchema(
        {
          type: 'object',
          properties: {
            endpoint: { $ref: '#/definitions/endpoint' },
          },
        },
        'plugin/package.json'
      ),
    /references are not supported/
  );
});
