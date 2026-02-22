# Function: registerRoute()

```ts
function registerRoute(routeSpec: Route): void
```

Add a Route for a component.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `routeSpec` | `Route` | details of URL, highlighted sidebar and component to use. |

## Returns

`void`

## Example

```tsx
import { registerRoute } from '@kinvolk/headlamp-plugin/lib';

// Add a route that will display the given component and select
// the "traces" sidebar item.
registerRoute({
  path: '/traces',
  sidebar: 'traces',
  component: () => <TraceList />
});
```

## See

 - [Route examples](https://github.com/kinvolk/headlamp/blob/main/frontend/src/lib/router.tsx)
 - [Sidebar Example](http://github.com/kinvolk/headlamp/plugins/examples/sidebar/)

## Defined in

[src/plugin/registry.tsx:414](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L414)
