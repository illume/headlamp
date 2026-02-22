# Function: registerRouteFilter()

```ts
function registerRouteFilter(filterFunc: (entry: Route) => null | Route): void
```

Remove routes.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `filterFunc` | (`entry`: `Route`) => `null` \| `Route` | a function for filtering routes. |

## Returns

`void`

## Example

```tsx
import { registerRouteFilter } from '@kinvolk/headlamp-plugin/lib';

registerRouteFilter(route => (route.path === '/workloads' ? null : route));
```

## Defined in

[src/plugin/registry.tsx:387](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L387)
