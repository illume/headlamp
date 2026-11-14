---
title: Plugin Settings Schemas
sidebar_position: 7
---

# Plugin Settings Schemas

Declare plugin settings as JSON Schema in the plugin's `package.json`. Headlamp
uses the schema to generate a settings form when the plugin does not register a
custom one, validate values, and document settings in deployment tooling.

```json
{
  "name": "example-plugin",
  "headlamp": {
    "settingsSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "additionalProperties": false,
      "required": ["endpoint"],
      "properties": {
        "endpoint": {
          "type": "string",
          "format": "uri",
          "title": "API endpoint",
          "description": "URL used to contact the service."
        },
        "refreshInterval": {
          "type": "integer",
          "minimum": 5,
          "default": 30,
          "title": "Refresh interval"
        }
      }
    }
  }
}
```

Headlamp's generated form supports string, number, integer, boolean, and
string-enum properties. Use standard JSON Schema keywords such as `required`,
`default`, `minimum`, `maximum`, `minLength`, `maxLength`, `pattern`, and
`format`. Keep `additionalProperties: false` unless the plugin intentionally
accepts undeclared keys.

## Custom settings components

Existing plugins can continue to use
[`registerPluginSettings`](./functionality/index.md#plugin-settings). A custom
component takes precedence over the generated form. Still provide a schema so
administrators and packaging tools can discover and validate the settings.
Headlamp prints a developer warning when a loaded plugin registers settings
without one. A custom component remains responsible for its own interactive
validation; the schema validates generated forms and structured deployment
configuration.

The package name passed to `registerPluginSettings` must match `package.json`
`name`. Settings are stored as an object whose keys match the schema's
`properties`.

## Localization

Schema `title`, `description`, `enumNames`, and `errorMessage` strings are
translated through the plugin's i18n namespace. Put those source strings in the
plugin locale files just as you would other plugin UI text. Standard validator
messages remain available as a fallback.

## Compatibility

Schemas are additive. Plugins without one keep their existing custom settings
UI and stored values. Add a schema that describes the settings already accepted
by the plugin; do not rename existing keys solely to introduce a schema.

See the
[change-logo example](https://github.com/kubernetes-sigs/headlamp/tree/main/plugins/examples/change-logo)
and
[pod-counter example](https://github.com/kubernetes-sigs/headlamp/tree/main/plugins/examples/pod-counter)
for schemas paired with custom settings components.
