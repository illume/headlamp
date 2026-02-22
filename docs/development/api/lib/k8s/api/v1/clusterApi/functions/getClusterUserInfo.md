# Function: getClusterUserInfo()

```ts
function getClusterUserInfo(cluster: string): Promise<ClusterUserInfo>
```

Get user info for the given cluster using SelfSubjectReview API.
Falls back to returning cluster name if the API is not available.
Returns { username: 'unknown' } if no cluster is resolved.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `cluster` | `string` | `''` | The name of the cluster (optional). |

## Returns

`Promise`\<[`ClusterUserInfo`](../interfaces/ClusterUserInfo.md)\>

Promise resolving to user info

## Defined in

[src/lib/k8s/api/v1/clusterApi.ts:67](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L67)
