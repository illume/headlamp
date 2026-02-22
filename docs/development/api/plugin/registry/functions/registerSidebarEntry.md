# Function: registerSidebarEntry()

```ts
function registerSidebarEntry(__namedParameters: SidebarEntryProps): void
```

Add a Sidebar Entry to the menu (on the left side of Headlamp).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`SidebarEntryProps`](../interfaces/SidebarEntryProps.md) |

## Returns

`void`

## Example

```tsx
import { registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
registerSidebarEntry({ parent: 'cluster', name: 'traces', label: 'Traces', url: '/traces' });

```

## See

[Sidebar Example](http://github.com/kinvolk/headlamp/plugins/examples/sidebar/)

## Defined in

[src/plugin/registry.tsx:293](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L293)
