# Function: useConnectApi()

```ts
function useConnectApi(...apiCalls: () => CancellablePromise[]): void
```

Hook to manage multiple cancellable API calls tied to the active cluster.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`apiCalls` | () => [`CancellablePromise`](../type-aliases/CancellablePromise.md)[] | functions returning cancellable promises for API calls. |

## Returns

`void`

## Defined in

[src/lib/k8s/index.ts:197](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/index.ts#L197)
