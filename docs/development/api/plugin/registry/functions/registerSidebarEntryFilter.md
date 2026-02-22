# Function: registerSidebarEntryFilter()

```ts
function registerSidebarEntryFilter(filterFunc: (entry: SidebarEntryProps) => null | SidebarEntryProps): void
```

Remove sidebar menu items.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `filterFunc` | (`entry`: [`SidebarEntryProps`](../interfaces/SidebarEntryProps.md)) => `null` \| [`SidebarEntryProps`](../interfaces/SidebarEntryProps.md) | a function for filtering sidebar entries. |

## Returns

`void`

## Example

```tsx
import { registerSidebarEntryFilter } from '@kinvolk/headlamp-plugin/lib';

registerSidebarEntryFilter(entry => (entry.name === 'workloads' ? null : entry));
```

## Defined in

[src/plugin/registry.tsx:368](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L368)
