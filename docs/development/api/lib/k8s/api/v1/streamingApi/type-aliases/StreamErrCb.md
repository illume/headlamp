# Type Alias: StreamErrCb()

```ts
type StreamErrCb: (err: Error & object, cancelStreamFunc?: () => void) => void;
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `err` | `Error` & `object` |
| `cancelStreamFunc`? | () => `void` |

## Returns

`void`

## Defined in

[src/lib/k8s/api/v1/streamingApi.ts:43](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/streamingApi.ts#L43)
