---
title: Plugin Settings
sidebar_position: 7
---

# Plugin settings

This is the main guide to plugin settings for plugin authors, users, and
administrators. It covers package identity, forms and schemas, value precedence,
organization policy, and Kubernetes-native configuration.

Plugin settings use the exact `name` from the plugin's `package.json`, including
an npm scope. They never use the plugin directory name. For example,
`@example/metrics` is stored below `plugins["@example/metrics"]`. When the
plugin-manager installation name differs, administrators set `settingsName` to
the package name.

## For plugin users

Users change editable values on the plugin's page under **Settings → Plugins**.
A value may instead be supplied by an administrator or the current Kubernetes
cluster. Disabled values are visible but read-only; hidden values are omitted.
Neither mode makes a value secret because settings are delivered to the browser.

For an editable setting the precedence is:

1. the user's saved value;
2. the current cluster's value;
3. the administrator's default;
4. the plugin's own fallback.

For hidden or disabled settings, the user value is ignored and a cluster value
has precedence over the administrator default.

## For plugin authors

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

Read the effective value with the package name and, for cluster-aware settings,
the cluster name:

```ts
import { Settings } from '@kinvolk/headlamp-plugin/lib';

const endpoint =
  Settings.get('@example/metrics', 'endpoint', clusterName) ??
  'https://default.example.com';
```

Use `Settings.getSource(...)` when the UI needs to explain whether a value came
from the user, cluster, administrator, or plugin default. The
[settings tutorial](../../tutorials/plugin-development/getting-started/adding-plugin-settings/index.md)
shows the complete development flow, while the [functionality reference](./functionality/index.md#plugin-settings)
covers custom component registration.

Schema defaults initialize generated forms and are persisted when the user
saves. `Settings.get()` does not read the package schema, so plugin runtime code
must retain its own fallback for users who have not saved the form.

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

## For administrators

The [admin settings guide](../../installation/admin-settings.md) documents Helm,
the plugin manager, machine-wide desktop files, Intune/Group Policy, macOS
configuration profiles, and backend policy. Organization defaults use the
package name:

```json
{
  "defaults": {
    "plugins": {
      "@example/metrics": {
        "endpoint": {
          "$value": "https://metrics.example.com",
          "$display": "disabled"
        }
      }
    }
  }
}
```

## Kubernetes-native settings

Settings do not require a new Headlamp deployment. Administrators can enable
values read from standard Kubernetes ConfigMaps or Secrets. Headlamp fetches
`settings.json` from those resources with the signed-in user's Kubernetes
credentials and refreshes it every minute.

This admin settings document enables the default
`headlamp-tools/headlamp-settings` ConfigMap for every cluster. Enabling a
cluster source allows its data to participate in resolution for all settings by
default:

```json
{
  "clusterDefinedSettings": ["*"],
  "defaults": {
    "plugins": {
      "@example/metrics": {
        "endpoint": {
          "$value": "https://fallback.example.com"
        }
      }
    }
  }
}
```

The cluster resource contains the same nested settings shape:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: headlamp-settings
  namespace: headlamp-tools
data:
  settings.json: |
    {
      "plugins": {
        "@example/metrics": {
          "endpoint": "http://prometheus.monitoring:9090"
        }
      }
    }
```

Custom sources use the long form:

```json
{
  "clusterDefinedSettings": {
    "*": [
      {
        "name": "headlamp-plugin-settings",
        "namespace": "platform-system",
        "type": "ConfigMap"
      }
    ]
  }
}
```

Later sources override earlier sources. A cluster-specific source is applied
after wildcard sources. Add `$clusterDefined` to a wrapped default to restrict
that setting to named clusters, or use an empty array to prevent that setting
from using cluster values.

`Secret` is also supported, but it is fetched in the browser with the user's
credentials. Kubernetes RBAC must therefore protect it, and plugins should use a
server-side integration rather than browser settings for credentials that users
must not read. Invalid or inaccessible resources are ignored and the normal
fallback precedence applies.
