# Function: getClusterAuthType()

```ts
function getClusterAuthType(cluster: string): string
```

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cluster` | `string` | Name of the cluster. |

## Returns

`string`

Auth type of the cluster, or an empty string if the cluster is not found.
It could return 'oidc' or '' for example.

## Defined in

[src/lib/k8s/api/v1/clusterRequests.ts:75](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterRequests.ts#L75)
