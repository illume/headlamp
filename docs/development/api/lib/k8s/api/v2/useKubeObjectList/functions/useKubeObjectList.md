# Function: useKubeObjectList()

```ts
function useKubeObjectList<K>(param: object): [K[] | null, ApiError | null] & QueryListResponse<(ListResponse<K> | undefined | null)[], K, ApiError>
```

Returns a combined list of Kubernetes objects and watches for changes from the clusters given.

## Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* [`KubeObject`](../../../../KubeObject/classes/KubeObject.md)\<`any`\> |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `param` | `object` | request paramaters |
| `param.kubeObjectClass` | (...`args`: `any`) => `K` & *typeof* [`KubeObject`](../../../../KubeObject/classes/KubeObject.md) | Class to instantiate the object with |
| `param.queryParams`? | [`QueryParameters`](../../../v1/queryParameters/interfaces/QueryParameters.md) | - |
| `param.refetchInterval`? | `number` | How often to refetch the list. Won't refetch by default. Disables watching if set. |
| `param.requests` | `object`[] | - |
| `param.watch`? | `boolean` | Watch for updates **Default** `true` |

## Returns

[`K`[] \| `null`, [`ApiError`](../../ApiError/classes/ApiError.md) \| `null`] & [`QueryListResponse`](../../hooks/interfaces/QueryListResponse.md)\<([`ListResponse`](../interfaces/ListResponse.md)\<`K`\> \| `undefined` \| `null`)[], `K`, [`ApiError`](../../ApiError/classes/ApiError.md)\>

Combined list of Kubernetes resources

## Defined in

[src/lib/k8s/api/v2/useKubeObjectList.ts:439](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/useKubeObjectList.ts#L439)
