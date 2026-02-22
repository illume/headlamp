# Type Alias: StreamUpdatesCb()\<T\>

```ts
type StreamUpdatesCb<T>: (data: T | StreamUpdate<T>) => void;
```

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `any` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `T` \| [`StreamUpdate`](StreamUpdate.md)\<`T`\> |

## Returns

`void`

## Defined in

[src/lib/k8s/api/v1/streamingApi.ts:42](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/streamingApi.ts#L42)
