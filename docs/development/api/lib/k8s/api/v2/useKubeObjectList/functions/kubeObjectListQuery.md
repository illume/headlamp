# Function: kubeObjectListQuery()

```ts
function kubeObjectListQuery<K>(
   kubeObjectClass: typeof KubeObject, 
   endpoint: KubeObjectEndpoint, 
   namespace: undefined | string, 
   cluster: string, 
   queryParams: QueryParameters, 
refetchInterval?: number): QueryObserverOptions<ListResponse<K> | undefined | null, ApiError>
```

Query to list Kube objects from a cluster and namespace(optional)

## Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* [`KubeObject`](../../../../KubeObject/classes/KubeObject.md)\<`any`\> |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `kubeObjectClass` | *typeof* [`KubeObject`](../../../../KubeObject/classes/KubeObject.md) | Class to instantiate the object with |
| `endpoint` | [`KubeObjectEndpoint`](../../KubeObjectEndpoint/interfaces/KubeObjectEndpoint.md) | API endpoint |
| `namespace` | `undefined` \| `string` | namespace to list objects from(optional) |
| `cluster` | `string` | cluster name |
| `queryParams` | [`QueryParameters`](../../../v1/queryParameters/interfaces/QueryParameters.md) | query parameters |
| `refetchInterval`? | `number` | - |

## Returns

`QueryObserverOptions`\<[`ListResponse`](../interfaces/ListResponse.md)\<`K`\> \| `undefined` \| `null`, [`ApiError`](../../ApiError/classes/ApiError.md)\>

query options for getting a single list of kube resources

## Defined in

[src/lib/k8s/api/v2/useKubeObjectList.ts:99](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/useKubeObjectList.ts#L99)
