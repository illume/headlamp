# Function: registerHeadlampEventCallback()

```ts
function registerHeadlampEventCallback(callback: HeadlampEventCallback): void
```

Add a callback for headlamp events.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `callback` | [`HeadlampEventCallback`](../type-aliases/HeadlampEventCallback.md) | The callback to add. |

## Returns

`void`

## Example

```ts
import {
  DefaultHeadlampEvents,
  registerHeadlampEventCallback,
  HeadlampEvent,
} from '@kinvolk/headlamp-plugin/lib';

registerHeadlampEventCallback((event: HeadlampEvent) => {
  if (event.type === DefaultHeadlampEvents.ERROR_BOUNDARY) {
    console.error('Error:', event.data);
  } else {
    console.log(`Headlamp event of type ${event.type}: ${event.data}`)
  }
});
```

## Defined in

[src/plugin/registry.tsx:724](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L724)
