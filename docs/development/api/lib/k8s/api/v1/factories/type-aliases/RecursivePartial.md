# Type Alias: RecursivePartial\<T\>

```ts
type RecursivePartial<T>: { [P in keyof T]?: T[P] extends (infer U)[] ? RecursivePartial<U>[] : T[P] extends object | undefined ? RecursivePartial<T[P]> : T[P] };
```

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Defined in

[src/lib/k8s/api/v1/factories.ts:49](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/factories.ts#L49)
