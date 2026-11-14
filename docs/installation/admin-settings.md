---
title: Admin settings
sidebar_label: Admin settings
---

# Admin settings

Headlamp accepts a JSON admin settings file. It can set defaults for Headlamp and
plugins and can prevent users from changing selected values.

```json
{
  "defaults": {
    "tableRowsPerPageOptions": [20, 50, 100],
    "plugins": {
      "example-plugin": {
        "endpoint": {
          "$value": "https://api.example.com",
          "$display": "disabled"
        }
      }
    }
  }
}
```

`$display` may be `normal` (the default), `disabled`, or `hidden`. Disabled and
hidden values ignore a user's local override. These modes control the UI; they
are not a security boundary and settings delivered to the browser must not
contain secrets.

Plugins read effective values with `Settings.get(pluginName, key)` from
`@kinvolk/headlamp-plugin/lib`. A settings form generated from a plugin's
`headlamp.settingsSchema` automatically applies admin defaults and display
modes.

## Helm

Set `config.settings` in the Headlamp chart. The chart creates and mounts the
admin settings file and passes it to the backend:

```yaml
config:
  settings:
    defaults:
      plugins:
        example-plugin:
          endpoint:
            $value: https://api.example.com
            $display: disabled
```

## Desktop organization deployment

The desktop app reads a machine-wide file from:

- macOS: `/Library/Application Support/Headlamp/settings.json`
- Windows: `%ProgramData%\Headlamp\settings.json`
- Linux: `/etc/headlamp/settings.json`

Deploy this file with the same device-management tool used to deploy Headlamp,
for example a Jamf policy or other MDM package on macOS, or Microsoft Intune,
Configuration Manager, or Group Policy on Windows. Restrict write access to
administrators so users cannot replace the policy file.

A managed launcher can select another absolute path with the
`HEADLAMP_ADMIN_SETTINGS` environment variable. Headlamp uses the file only when
it exists and refuses to start its backend if the JSON is invalid.
