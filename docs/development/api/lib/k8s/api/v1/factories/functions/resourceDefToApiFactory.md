# Function: resourceDefToApiFactory()

```ts
function resourceDefToApiFactory<ResourceType>(resourceDef: KubeObjectInterface, clusterName?: string): Promise<ApiClient<ResourceType> | ApiWithNamespaceClient<ResourceType>>
```

## Type Parameters

| Type Parameter |
| ------ |
| `ResourceType` *extends* [`KubeObjectInterface`](../../../../KubeObject/interfaces/KubeObjectInterface.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `resourceDef` | [`KubeObjectInterface`](../../../../KubeObject/interfaces/KubeObjectInterface.md) |
| `clusterName`? | `string` |

## Returns

`Promise`\<[`ApiClient`](../interfaces/ApiClient.md)\<`ResourceType`\> \| [`ApiWithNamespaceClient`](../interfaces/ApiWithNamespaceClient.md)\<`ResourceType`\>\>

## Defined in

[src/lib/k8s/api/v1/factories.ts:481](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/factories.ts#L481)
