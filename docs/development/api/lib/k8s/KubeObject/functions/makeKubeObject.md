# Function: ~~makeKubeObject()~~

```ts
function makeKubeObject<T>(): typeof KubeObjectInternal
```

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`KubeObjectInterface`](../interfaces/KubeObjectInterface.md) \| [`KubeEvent`](../../event/interfaces/KubeEvent.md) |

## Returns

*typeof* `KubeObjectInternal`

A KubeObject implementation for the given object name.

## Deprecated

This function is no longer recommended, it's kept for backwards compatibility.
Please extend KubeObject instead

## Defined in

[src/lib/k8s/KubeObject.ts:697](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/KubeObject.ts#L697)
