# Function: registerAppTheme()

```ts
function registerAppTheme(theme: AppTheme): void
```

Add a new theme that will be available in the settings.
Theme name should be unique

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `theme` | [`AppTheme`](../../../lib/AppTheme/interfaces/AppTheme.md) | App Theme definition |

## Returns

`void`

## Example

```ts
registerAppTheme({
  name: "My Custom Theme",
  base: "light",
  primary: "#ff0000",
  secondary: "#333",
})

## Defined in

[src/plugin/registry.tsx:1007](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L1007)
