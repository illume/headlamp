# Function: parseKubeConfig()

```ts
function parseKubeConfig(clusterReq: ClusterRequest): Promise<any>
```

parseKubeConfig sends call to backend to parse kubeconfig and send back
the parsed clusters and contexts.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `clusterReq` | [`ClusterRequest`](../../clusterRequests/interfaces/ClusterRequest.md) | The cluster request object. |

## Returns

`Promise`\<`any`\>

## Defined in

[src/lib/k8s/api/v1/clusterApi.ts:296](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L296)
