# Function: apiFactoryWithNamespace()

```ts
function apiFactoryWithNamespace<T>(...args: ApiFactoryWithNamespaceArguments): ApiWithNamespaceClient<T>
```

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`KubeObjectInterface`](../../../../KubeObject/interfaces/KubeObjectInterface.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | [`ApiFactoryWithNamespaceArguments`](../type-aliases/ApiFactoryWithNamespaceArguments.md) |

## Returns

[`ApiWithNamespaceClient`](../interfaces/ApiWithNamespaceClient.md)\<`T`\>

## Defined in

[src/lib/k8s/api/v1/factories.ts:389](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/factories.ts#L389)
