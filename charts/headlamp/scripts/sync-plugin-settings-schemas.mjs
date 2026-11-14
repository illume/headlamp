#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const defaultSourcesPath = path.join(repoRoot, 'charts/headlamp/plugin-settings-schema-sources.json');
const defaultSchemaPath = path.join(repoRoot, 'charts/headlamp/values.schema.json');

async function readJson(location) {
  if (/^https:\/\//.test(location)) {
    const response = await fetch(location);
    if (!response.ok) {
      throw new Error(`${location}: HTTP ${response.status}`);
    }
    return response.json();
  }
  const filename = path.isAbsolute(location) ? location : path.join(repoRoot, location);
  return JSON.parse(await readFile(filename, 'utf8'));
}

export function assertSettingsSchema(schema, source) {
  if (schema.type !== 'object' || !schema.properties || typeof schema.properties !== 'object') {
    throw new Error(`${source}: headlamp.settingsSchema must be an object schema with properties`);
  }

  const visit = value => {
    if (!value || typeof value !== 'object') {
      return;
    }
    if (typeof value.$ref === 'string') {
      throw new Error(`${source}: JSON Schema references are not supported`);
    }
    Object.values(value).forEach(visit);
  };
  visit(schema);
}

function adminSettingsSchema(schema) {
  const result = structuredClone(schema);
  delete result.required;
  result.properties = Object.fromEntries(
    Object.entries(schema.properties).map(([name, property]) => [
      name,
      {
        anyOf: [
          property,
          {
            type: 'object',
            required: ['$value'],
            additionalProperties: false,
            properties: {
              $value: property,
              $display: { enum: ['normal', 'disabled', 'hidden'] },
              $clusterDefined: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        ],
      },
    ])
  );
  return result;
}

export function updateValuesSchema(valuesSchema, packages) {
  const pluginItems =
    valuesSchema.properties.pluginsManager.properties.config.properties.plugins.items;
  const schemas = {};
  const conditions = [];

  for (const packageJson of [...packages].sort((a, b) => a.name.localeCompare(b.name))) {
    const pluginName = packageJson.pluginManagerName ?? packageJson.name;
    const hasAlias = pluginName !== packageJson.name;
    const schemaName = `plugin_${createHash('sha256').update(pluginName).digest('hex').slice(0, 12)}`;
    schemas[schemaName] = adminSettingsSchema(packageJson.headlamp.settingsSchema);
    conditions.push({
      if: {
        properties: { name: { const: pluginName } },
        required: ['name'],
      },
      then: {
        ...(hasAlias ? { required: ['settingsName'] } : {}),
        properties: {
          ...(hasAlias ? { settingsName: { const: packageJson.name } } : {}),
          settings: { $ref: `#/definitions/knownPluginSettings/${schemaName}` },
        },
      },
    });
  }

  valuesSchema.definitions ??= {};
  valuesSchema.definitions.knownPluginSettings = schemas;
  pluginItems.allOf = conditions;
  return valuesSchema;
}

function replacePropertyValue(source, property, value, fromIndex = 0) {
  const propertyIndex = source.indexOf(`"${property}"`, fromIndex);
  if (propertyIndex === -1) {
    throw new Error(`values.schema.json is missing the generated "${property}" field`);
  }
  const colonIndex = source.indexOf(':', propertyIndex);
  let valueStart = colonIndex + 1;
  while (/\s/.test(source[valueStart])) {
    valueStart += 1;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let valueEnd = valueStart;
  for (; valueEnd < source.length; valueEnd += 1) {
    const character = source[valueEnd];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
    } else if (character === '{' || character === '[') {
      depth += 1;
    } else if (character === '}' || character === ']') {
      depth -= 1;
      if (depth === 0) {
        valueEnd += 1;
        break;
      }
    }
  }

  const lineStart = source.lastIndexOf('\n', propertyIndex) + 1;
  const indentation = source.slice(lineStart, propertyIndex);
  const replacement = JSON.stringify(value, null, 2).replaceAll('\n', `\n${indentation}`);
  return `${source.slice(0, valueStart)}${replacement}${source.slice(valueEnd)}`;
}

export async function sync({ sourcesPath = defaultSourcesPath, schemaPath = defaultSchemaPath }) {
  const sourceList = await readJson(sourcesPath);
  const packages = [];

  for (const source of sourceList.sources) {
    const packageJson = await readJson(source.packageJson);
    if (!packageJson.headlamp?.settingsSchema) {
      console.warn(`${source.packageJson}: ${packageJson.name} does not provide headlamp.settingsSchema`);
      continue;
    }
    assertSettingsSchema(packageJson.headlamp.settingsSchema, source.packageJson);
    packages.push({
      ...packageJson,
      pluginManagerName: source.pluginName ?? packageJson.name,
    });
  }

  const schemaFilename = path.isAbsolute(schemaPath) ? schemaPath : path.join(repoRoot, schemaPath);
  let schemaSource = await readFile(schemaFilename, 'utf8');
  const valuesSchema = updateValuesSchema(JSON.parse(schemaSource), packages);
  schemaSource = replacePropertyValue(
    schemaSource,
    'knownPluginSettings',
    valuesSchema.definitions.knownPluginSettings
  );
  schemaSource = replacePropertyValue(
    schemaSource,
    'allOf',
    valuesSchema.properties.pluginsManager.properties.config.properties.plugins.items.allOf,
    schemaSource.indexOf('"pluginsManager"')
  );
  await writeFile(schemaFilename, schemaSource);
  console.log(`Synced settings schemas for ${packages.length} plugins`);
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const sourcesIndex = process.argv.indexOf('--sources');
  const schemaIndex = process.argv.indexOf('--schema');
  sync({
    sourcesPath: sourcesIndex === -1 ? undefined : path.resolve(process.argv[sourcesIndex + 1]),
    schemaPath: schemaIndex === -1 ? undefined : path.resolve(process.argv[schemaIndex + 1]),
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
