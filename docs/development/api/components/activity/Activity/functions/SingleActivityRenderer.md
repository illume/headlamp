# Function: SingleActivityRenderer()

```ts
function SingleActivityRenderer(__namedParameters: object): Element
```

Renders a single activity

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `__namedParameters` | `object` | - |
| `__namedParameters.activity` | [`Activity`](../interfaces/Activity.md) | - |
| `__namedParameters.index` | `number` | Index of this activity within a list of all activities |
| `__namedParameters.isOverview` | `boolean` | Render in a small window for the overview state |
| `__namedParameters.onClick` | `PointerEventHandler`\<`HTMLDivElement`\> | Click event callback |
| `__namedParameters.zIndex` | `number` | - |

## Returns

`Element`

## Defined in

[src/components/activity/Activity.tsx:124](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/components/activity/Activity.tsx#L124)
