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
      .dependencies,
    { settings: ['settingsName'] }
  );
  assert.equal(
    result.properties.pluginsManager.properties.config.properties.plugins.items.allOf[0].then
      .properties.settingsName.const,
    '@example/plugin'
  );
});

test('wraps properties inside root composition constraints', () => {
  const chartSchema = {
    properties: {
      pluginsManager: {
        properties: {
          config: {
            properties: {
              plugins: { items: { allOf: [] } },
            },
          },
        },
      },
    },
  };
  const result = updateValuesSchema(chartSchema, [
    {
      name: 'example-plugin',
      headlamp: {
        settingsSchema: {
          type: 'object',
          properties: { endpoint: { type: 'string' } },
          allOf: [
            {
              required: ['endpoint'],
              properties: { endpoint: { type: 'string', format: 'uri' } },
            },
          ],
        },
      },
    },
  ]);
  const settingsSchema = Object.values(result.definitions.knownPluginSettings)[0];
  const endpoint = settingsSchema.allOf[0].properties.endpoint;

  assert.deepEqual(endpoint.anyOf[0], { type: 'string', format: 'uri' });
  assert.deepEqual(endpoint.anyOf[1].properties.$value, {
    type: 'string',
    format: 'uri',
  });
  assert.deepEqual(settingsSchema.allOf[0].required, ['endpoint']);
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
