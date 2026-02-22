# Type Alias: StreamUpdate\<T\>

```ts
type StreamUpdate<T>: object;
```

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `any` |

## Type declaration

### object

```ts
object: T;
```

### type

```ts
type: "ADDED" | "MODIFIED" | "DELETED" | "ERROR";
```

## Defined in

[src/lib/k8s/api/v1/streamingApi.ts:36](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/streamingApi.ts#L36)
